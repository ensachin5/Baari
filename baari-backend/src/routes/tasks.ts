import { Router, Response } from 'express';
import { db } from '../db/index.js';
import {
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  flatMembers,
  taskRotationState,
  user,
  activityLog,
} from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { validate } from '../middleware/validate.js';
import { createTaskSchema, completeOccurrenceSchema } from '../schemas/tasks.js';
import { eq, and, desc, inArray, asc, gte } from 'drizzle-orm';
import { getIO } from '../sockets/index.js';
import { broadcastTaskCompleted, broadcastActivityEvent, broadcastTaskDeleted } from '../sockets/handlers.js';
import { sendPushNotification } from '../services/push.js';
import { calculateUserStreak } from '../services/streaks.js';

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export function computeNextOccurrenceDate(
  recurrence: 'once' | 'daily' | 'weekly' | 'custom',
  customConfig?: { type: 'specific_days'; days: string[] } | { type: 'interval'; everyNDays: number } | null,
  fromOccurrenceDate?: string
): string | null {
  if (recurrence === 'once') return null;

  let baseDate: Date;
  if (fromOccurrenceDate) {
    const [y, m, d] = fromOccurrenceDate.split('-').map(Number);
    baseDate = new Date(Date.UTC(y, m - 1, d));
  } else {
    const now = new Date();
    baseDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  if (recurrence === 'daily') {
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
    return baseDate.toISOString().split('T')[0];
  }

  if (recurrence === 'weekly') {
    baseDate.setUTCDate(baseDate.getUTCDate() + 7);
    return baseDate.toISOString().split('T')[0];
  }

  if (recurrence === 'custom' && customConfig) {
    if (customConfig.type === 'interval') {
      const intervalDays = Math.max(1, customConfig.everyNDays || 1);
      baseDate.setUTCDate(baseDate.getUTCDate() + intervalDays);
      return baseDate.toISOString().split('T')[0];
    }

    if (customConfig.type === 'specific_days' && Array.isArray(customConfig.days) && customConfig.days.length > 0) {
      const targetDays = customConfig.days
        .map((d) => WEEKDAY_MAP[d.toLowerCase()])
        .filter((d) => d !== undefined);

      if (targetDays.length === 0) {
        baseDate.setUTCDate(baseDate.getUTCDate() + 1);
        return baseDate.toISOString().split('T')[0];
      }

      const currentDay = baseDate.getUTCDay();

      for (let offset = 1; offset <= 7; offset++) {
        const checkDay = (currentDay + offset) % 7;
        if (targetDays.includes(checkDay)) {
          baseDate.setUTCDate(baseDate.getUTCDate() + offset);
          return baseDate.toISOString().split('T')[0];
        }
      }
    }
  }

  baseDate.setUTCDate(baseDate.getUTCDate() + 1);
  return baseDate.toISOString().split('T')[0];
}

export const tasksRouter = Router();

// GET /api/tasks/streaks?userId=
tasksRouter.get('/streaks', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = (req.query.userId as string) || req.user!.id;
  const streaks = await calculateUserStreak(userId);
  res.json(streaks);
});

// GET /api/tasks/weekly-summary?flatId=
tasksRouter.get('/weekly-summary', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  if (!flatId) {
    res.status(400).json({ error: 'flatId query param is required' });
    return;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const completedRecords = await db
    .select({
      userId: taskOccurrenceMembers.userId,
      userName: user.name,
      userImage: user.image,
      taskTitle: tasks.title,
      completedAt: taskOccurrenceMembers.completedAt,
    })
    .from(taskOccurrenceMembers)
    .innerJoin(taskOccurrences, eq(taskOccurrenceMembers.occurrenceId, taskOccurrences.id))
    .innerJoin(tasks, eq(taskOccurrences.taskId, tasks.id))
    .innerJoin(user, eq(taskOccurrenceMembers.userId, user.id))
    .where(
      and(
        eq(tasks.flatId, flatId),
        eq(taskOccurrenceMembers.status, 'completed'),
        gte(taskOccurrenceMembers.completedAt, sevenDaysAgo)
      )
    );

  const summaryByUser = new Map<
    string,
    {
      userId: string;
      userName: string;
      userImage: string | null;
      taskCounts: Record<string, number>;
      totalCompleted: number;
    }
  >();

  completedRecords.forEach((rec) => {
    let userSummary = summaryByUser.get(rec.userId);
    if (!userSummary) {
      userSummary = {
        userId: rec.userId,
        userName: rec.userName,
        userImage: rec.userImage,
        taskCounts: {},
        totalCompleted: 0,
      };
      summaryByUser.set(rec.userId, userSummary);
    }
    userSummary.totalCompleted += 1;
    userSummary.taskCounts[rec.taskTitle] = (userSummary.taskCounts[rec.taskTitle] || 0) + 1;
  });

  const summary = Array.from(summaryByUser.values()).map((u) => ({
    userId: u.userId,
    userName: u.userName,
    userImage: u.userImage,
    totalCompleted: u.totalCompleted,
    breakdown: Object.entries(u.taskCounts).map(([taskTitle, count]) => ({
      taskTitle,
      count,
    })),
  }));

  res.json({ weeklySummary: summary });
});

// Get tasks for a flat
tasksRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  if (!flatId) {
    res.status(400).json({ error: 'flatId query param is required' });
    return;
  }

  // Fetch all active tasks
  const flatTasks = await db
    .select({
      id: tasks.id,
      flatId: tasks.flatId,
      title: tasks.title,
      category: tasks.category,
      description: tasks.description,
      peopleRequired: tasks.peopleRequired,
      recurrence: tasks.recurrence,
      customRecurrenceConfig: tasks.customRecurrenceConfig,
      createdBy: tasks.createdBy,
      active: tasks.active,
      createdAt: tasks.createdAt,
      creatorName: user.name,
    })
    .from(tasks)
    .innerJoin(user, eq(tasks.createdBy, user.id))
    .where(and(eq(tasks.flatId, flatId), eq(tasks.active, true)))
    .orderBy(desc(tasks.createdAt));

  if (flatTasks.length === 0) {
    res.json({ tasks: [] });
    return;
  }

  const taskIds = flatTasks.map((t) => t.id);

  // Fetch occurrences for these tasks
  const occurrences = await db
    .select()
    .from(taskOccurrences)
    .where(inArray(taskOccurrences.taskId, taskIds))
    .orderBy(desc(taskOccurrences.occurrenceDate));

  const occurrenceIds = occurrences.map((o) => o.id);

  // Fetch occurrence members
  const members = occurrenceIds.length > 0
    ? await db
        .select({
          id: taskOccurrenceMembers.id,
          occurrenceId: taskOccurrenceMembers.occurrenceId,
          userId: taskOccurrenceMembers.userId,
          status: taskOccurrenceMembers.status,
          completedAt: taskOccurrenceMembers.completedAt,
          userName: user.name,
          userImage: user.image,
        })
        .from(taskOccurrenceMembers)
        .innerJoin(user, eq(taskOccurrenceMembers.userId, user.id))
        .where(inArray(taskOccurrenceMembers.occurrenceId, occurrenceIds))
    : [];

  // Group occurrence members by occurrenceId
  const membersByOccId = new Map<string, typeof members>();
  members.forEach((m) => {
    const list = membersByOccId.get(m.occurrenceId) || [];
    list.push(m);
    membersByOccId.set(m.occurrenceId, list);
  });

  // Group occurrences by taskId
  const occsByTaskId = new Map<string, any[]>();
  occurrences.forEach((o) => {
    const occWithMembers = {
      ...o,
      members: membersByOccId.get(o.id) || [],
    };
    const list = occsByTaskId.get(o.taskId) || [];
    list.push(occWithMembers);
    occsByTaskId.set(o.taskId, list);
  });

  // Fetch rotation states for these tasks
  const rotationStates = await db
    .select()
    .from(taskRotationState)
    .where(inArray(taskRotationState.taskId, taskIds));

  const rotMap = new Map<string, number>();
  rotationStates.forEach((rs) => rotMap.set(rs.taskId, rs.currentMemberIndex));

  // Fetch flat members ordered by joinedAt for fair rotation
  const flatMembersList = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
    })
    .from(flatMembers)
    .innerJoin(user, eq(flatMembers.userId, user.id))
    .where(eq(flatMembers.flatId, flatId))
    .orderBy(asc(flatMembers.joinedAt));

  // Attach latest occurrence and nextAssignee to each task
  const enrichedTasks = flatTasks.map((task) => {
    const taskOccs = occsByTaskId.get(task.id) || [];
    const latestOccurrence = taskOccs[0] || null;

    let nextAssignee = null;
    if (task.recurrence !== 'once' && flatMembersList.length > 0) {
      const rotIdx = (rotMap.get(task.id) || 0) % flatMembersList.length;
      nextAssignee = flatMembersList[rotIdx];
    }

    return {
      ...task,
      occurrences: taskOccs,
      currentOccurrence: latestOccurrence,
      nextAssignee,
    };
  });

  res.json({ tasks: enrichedTasks });
});

// Create a task
tasksRouter.post(
  '/',
  requireAuth,
  validate(createTaskSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      flatId,
      title,
      category,
      description,
      peopleRequired,
      recurrence,
      customRecurrenceConfig,
      assigneeIds,
      occurrenceDate,
    } = req.body;
    const userId = req.user!.id;

    const todayStr = occurrenceDate || new Date().toISOString().split('T')[0];

    // 1. Create task
    const [newTask] = await db
      .insert(tasks)
      .values({
        flatId,
        title,
        category,
        description,
        peopleRequired: peopleRequired || assigneeIds.length,
        recurrence,
        customRecurrenceConfig: recurrence === 'custom' ? (customRecurrenceConfig || null) : null,
        createdBy: userId,
        active: true,
      })
      .returning();

    // 2. Create first occurrence
    const [newOccurrence] = await db
      .insert(taskOccurrences)
      .values({
        taskId: newTask.id,
        occurrenceDate: todayStr,
        status: 'pending',
      })
      .returning();

    // 3. Assign members to occurrence
    const memberValues = assigneeIds.map((assigneeId: string) => ({
      occurrenceId: newOccurrence.id,
      userId: assigneeId,
      status: 'assigned' as const,
    }));

    await db.insert(taskOccurrenceMembers).values(memberValues);

    // Initialize task rotation state for recurring tasks
    if (recurrence !== 'once') {
      const allMembers = await db
        .select({ userId: flatMembers.userId })
        .from(flatMembers)
        .where(eq(flatMembers.flatId, flatId))
        .orderBy(asc(flatMembers.joinedAt));

      let nextIndex = 1;
      if (allMembers.length > 0 && assigneeIds.length > 0) {
        const foundIdx = allMembers.findIndex((m) => m.userId === assigneeIds[0]);
        if (foundIdx !== -1) {
          nextIndex = (foundIdx + 1) % allMembers.length;
        }
      }

      await db.insert(taskRotationState).values({
        taskId: newTask.id,
        currentMemberIndex: nextIndex,
      });
    }

    // 4. Log activity
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId,
        actorId: userId,
        type: 'task_created',
        referenceId: newTask.id,
        metadata: {
          taskTitle: title,
          category,
          recurrence,
          peopleRequired: peopleRequired || assigneeIds.length,
        },
      })
      .returning();

    // 5. Broadcast realtime event
    try {
      const io = getIO();
      broadcastActivityEvent(io, flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
    } catch (_) {}

    // Send push notification to assignees
    if (assigneeIds && assigneeIds.length > 0) {
      sendPushNotification(assigneeIds, {
        title: `Task Duty: ${newTask.title}`,
        body: `You're on ${newTask.category} duty today!`,
        data: { type: 'task', taskId: newTask.id },
      });
    }

    res.status(201).json({
      task: newTask,
      occurrence: newOccurrence,
    });
  }
);

// Complete an occurrence for the authenticated user
tasksRouter.patch(
  '/occurrences/:id/complete',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const occurrenceId = String(req.params.id);
    const userId = req.user!.id;

    // Find occurrence and task
    const [occ] = await db
      .select({
        id: taskOccurrences.id,
        taskId: taskOccurrences.taskId,
        occurrenceDate: taskOccurrences.occurrenceDate,
        status: taskOccurrences.status,
        flatId: tasks.flatId,
        taskTitle: tasks.title,
        recurrence: tasks.recurrence,
        customRecurrenceConfig: tasks.customRecurrenceConfig,
        peopleRequired: tasks.peopleRequired,
      })
      .from(taskOccurrences)
      .innerJoin(tasks, eq(taskOccurrences.taskId, tasks.id))
      .where(eq(taskOccurrences.id, occurrenceId));

    if (!occ) {
      res.status(404).json({ error: 'Task occurrence not found' });
      return;
    }

    // Update the occurrence member's status
    const [updatedMember] = await db
      .update(taskOccurrenceMembers)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(
        and(
          eq(taskOccurrenceMembers.occurrenceId, occurrenceId),
          eq(taskOccurrenceMembers.userId, userId)
        )
      )
      .returning();

    if (!updatedMember) {
      res.status(400).json({ error: 'You are not assigned to this task occurrence or already completed' });
      return;
    }

    // Check if ALL members assigned to this occurrence have now completed
    const allMembers = await db
      .select({ status: taskOccurrenceMembers.status })
      .from(taskOccurrenceMembers)
      .where(eq(taskOccurrenceMembers.occurrenceId, occurrenceId));

    const isFullyDone = allMembers.every((m) => m.status === 'completed');

    if (isFullyDone) {
      await db
        .update(taskOccurrences)
        .set({ status: 'done' })
        .where(eq(taskOccurrences.id, occurrenceId));

      // Generate next occurrence for recurring task
      if (occ.recurrence !== 'once') {
        const nextDate = computeNextOccurrenceDate(
          occ.recurrence,
          occ.customRecurrenceConfig,
          occ.occurrenceDate
        );

        if (nextDate) {
          const [existingNext] = await db
            .select({ id: taskOccurrences.id })
            .from(taskOccurrences)
            .where(
              and(
                eq(taskOccurrences.taskId, occ.taskId),
                eq(taskOccurrences.occurrenceDate, nextDate)
              )
            );

          if (!existingNext) {
            const [newOcc] = await db
              .insert(taskOccurrences)
              .values({
                taskId: occ.taskId,
                occurrenceDate: nextDate,
                status: 'pending',
              })
              .returning();

            const flatMembersList = await db
              .select({ userId: flatMembers.userId })
              .from(flatMembers)
              .where(eq(flatMembers.flatId, occ.flatId))
              .orderBy(asc(flatMembers.joinedAt));

            if (flatMembersList.length > 0) {
              const [rotState] = await db
                .select()
                .from(taskRotationState)
                .where(eq(taskRotationState.taskId, occ.taskId));

              const curIdx = rotState ? rotState.currentMemberIndex : 0;
              const peopleReq = Math.min(occ.peopleRequired || 1, flatMembersList.length);
              const nextAssigneeIds: string[] = [];

              for (let i = 0; i < peopleReq; i++) {
                const assignedUser = flatMembersList[(curIdx + i) % flatMembersList.length];
                nextAssigneeIds.push(assignedUser.userId);
              }

              const newMemberValues = nextAssigneeIds.map((uId) => ({
                occurrenceId: newOcc.id,
                userId: uId,
                status: 'assigned' as const,
              }));

              await db.insert(taskOccurrenceMembers).values(newMemberValues);

              const newIndex = (curIdx + peopleReq) % flatMembersList.length;
              if (rotState) {
                await db
                  .update(taskRotationState)
                  .set({ currentMemberIndex: newIndex, updatedAt: new Date() })
                  .where(eq(taskRotationState.taskId, occ.taskId));
              } else {
                await db.insert(taskRotationState).values({
                  taskId: occ.taskId,
                  currentMemberIndex: newIndex,
                });
              }
            }
          }
        }
      }
    } else {
      await db
        .update(taskOccurrences)
        .set({ status: 'in_progress' })
        .where(eq(taskOccurrences.id, occurrenceId));
    }

    // Activity Log
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId: occ.flatId,
        actorId: userId,
        type: 'task_completed',
        referenceId: occ.taskId,
        metadata: {
          taskTitle: occ.taskTitle,
          isFullyDone,
        },
      })
      .returning();

    // Broadcast realtime event
    try {
      const io = getIO();
      broadcastTaskCompleted(io, occ.flatId, {
        occurrenceId,
        userId,
        taskTitle: occ.taskTitle,
        userName: req.user!.name,
        isFullyDone,
      });

      broadcastActivityEvent(io, occ.flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
    } catch (_) {}

    res.json({
      message: 'Task completion marked',
      isFullyDone,
      updatedMember,
    });
  }
);

// Skip turn for current task occurrence (passes turn to next member in fair rotation)
tasksRouter.patch(
  '/occurrences/:id/skip-turn',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const occurrenceId = String(req.params.id);
    const userId = req.user!.id;
    const { reason } = req.body || {};

    // 1. Verify occurrence and task
    const [occ] = await db
      .select({
        id: taskOccurrences.id,
        taskId: taskOccurrences.taskId,
        status: taskOccurrences.status,
        flatId: tasks.flatId,
        taskTitle: tasks.title,
      })
      .from(taskOccurrences)
      .innerJoin(tasks, eq(taskOccurrences.taskId, tasks.id))
      .where(eq(taskOccurrences.id, occurrenceId));

    if (!occ) {
      res.status(404).json({ error: 'Task occurrence not found' });
      return;
    }

    // 2. Verify caller is assigned to this occurrence
    const [myAssignment] = await db
      .select()
      .from(taskOccurrenceMembers)
      .where(
        and(
          eq(taskOccurrenceMembers.occurrenceId, occurrenceId),
          eq(taskOccurrenceMembers.userId, userId)
        )
      );

    if (!myAssignment) {
      res.status(403).json({ error: 'You are not assigned to this task occurrence' });
      return;
    }

    if (myAssignment.status === 'completed') {
      res.status(400).json({ error: 'Cannot skip an already completed task' });
      return;
    }

    // 3. Get all flat members sorted by joinedAt
    const members = await db
      .select({
        userId: flatMembers.userId,
        name: user.name,
        image: user.image,
      })
      .from(flatMembers)
      .innerJoin(user, eq(flatMembers.userId, user.id))
      .where(eq(flatMembers.flatId, occ.flatId))
      .orderBy(asc(flatMembers.joinedAt));

    if (members.length <= 1) {
      res.status(400).json({ error: 'Cannot skip turn: no other members in flat' });
      return;
    }

    // 4. Get or initialize task_rotation_state
    const [rotState] = await db
      .select()
      .from(taskRotationState)
      .where(eq(taskRotationState.taskId, occ.taskId));

    let nextIndex = rotState ? rotState.currentMemberIndex : 0;
    let nextMember = members[nextIndex % members.length];
    if (nextMember.userId === userId) {
      nextIndex = (nextIndex + 1) % members.length;
      nextMember = members[nextIndex];
    }

    // 5. Update assignment in task_occurrence_members
    await db
      .update(taskOccurrenceMembers)
      .set({
        userId: nextMember.userId,
        status: 'assigned',
        completedAt: null,
      })
      .where(eq(taskOccurrenceMembers.id, myAssignment.id));

    // 6. Advance rotation pointer to next person so rotation remains fair
    const newPointer = (nextIndex + 1) % members.length;
    if (rotState) {
      await db
        .update(taskRotationState)
        .set({ currentMemberIndex: newPointer, updatedAt: new Date() })
        .where(eq(taskRotationState.id, rotState.id));
    } else {
      await db.insert(taskRotationState).values({
        taskId: occ.taskId,
        currentMemberIndex: newPointer,
      });
    }

    // 7. Log to activity_log
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId: occ.flatId,
        actorId: userId,
        type: 'task_skipped',
        referenceId: occ.taskId,
        metadata: {
          taskTitle: occ.taskTitle,
          skippedByName: req.user!.name,
          passedToName: nextMember.name,
          passedToUserId: nextMember.userId,
          reason: reason ? String(reason).trim() : null,
        },
      })
      .returning();

    // 8. Broadcast realtime event
    try {
      const io = getIO();
      broadcastActivityEvent(io, occ.flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
      io.to(`flat:${occ.flatId}`).emit('task_updated', {
        occurrenceId,
        taskId: occ.taskId,
        reassignedTo: nextMember,
      });
    } catch (_) {}

    // 9. Push notification
    sendPushNotification([nextMember.userId], {
      title: `Kaam Passed to You: ${occ.taskTitle}`,
      body: `${req.user!.name} passed their turn to you.${reason ? ` Reason: "${reason}"` : ''}`,
      data: { type: 'task', taskId: occ.taskId, occurrenceId },
    });

    res.json({
      message: `Turn passed to ${nextMember.name}`,
      passedTo: nextMember,
      occurrenceId,
    });
  }
);

// GET /api/tasks/:id/rotation-history
tasksRouter.get(
  '/:id/rotation-history',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const taskId = String(req.params.id);

    const pastOccurrences = await db
      .select({
        id: taskOccurrences.id,
        occurrenceDate: taskOccurrences.occurrenceDate,
        status: taskOccurrences.status,
        createdAt: taskOccurrences.createdAt,
      })
      .from(taskOccurrences)
      .where(eq(taskOccurrences.taskId, taskId))
      .orderBy(desc(taskOccurrences.occurrenceDate))
      .limit(10);

    if (pastOccurrences.length === 0) {
      res.json({ history: [] });
      return;
    }

    const occIds = pastOccurrences.map((o) => o.id);
    const members = await db
      .select({
        occurrenceId: taskOccurrenceMembers.occurrenceId,
        userId: taskOccurrenceMembers.userId,
        userName: user.name,
        userImage: user.image,
        status: taskOccurrenceMembers.status,
        completedAt: taskOccurrenceMembers.completedAt,
      })
      .from(taskOccurrenceMembers)
      .innerJoin(user, eq(taskOccurrenceMembers.userId, user.id))
      .where(inArray(taskOccurrenceMembers.occurrenceId, occIds));

    const membersByOcc = new Map<string, typeof members>();
    members.forEach((m) => {
      const list = membersByOcc.get(m.occurrenceId) || [];
      list.push(m);
      membersByOcc.set(m.occurrenceId, list);
    });

    const history = pastOccurrences.map((occ) => ({
      ...occ,
      members: membersByOcc.get(occ.id) || [],
    }));

    res.json({ history });
  }
);

// DELETE /api/tasks/:id
tasksRouter.delete(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const taskId = String(req.params.id);
    const userId = req.user!.id;

    // 1. Fetch task
    const [task] = await db
      .select({
        id: tasks.id,
        flatId: tasks.flatId,
        title: tasks.title,
        createdBy: tasks.createdBy,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // 2. Fetch user's role in the flat
    const [membership] = await db
      .select({ role: flatMembers.role })
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, task.flatId), eq(flatMembers.userId, userId)));

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this flat' });
      return;
    }

    const isCreator = task.createdBy === userId;
    const isAdmin = membership.role === 'admin';

    if (!isCreator && !isAdmin) {
      res.status(403).json({ error: 'Only the task creator or a flat admin can delete this Kaam' });
      return;
    }

    // 3. Log activity before deleting (snapshotting title into metadata)
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId: task.flatId,
        actorId: userId,
        type: 'task_deleted',
        referenceId: task.id,
        metadata: {
          taskTitle: task.title,
        },
      })
      .returning();

    // 4. Delete the task (cascades to task_occurrences, task_occurrence_members, task_rotation_state)
    await db.delete(tasks).where(eq(tasks.id, taskId));

    // 5. Broadcast realtime events
    try {
      const io = getIO();
      broadcastTaskDeleted(io, task.flatId, {
        taskId: task.id,
        taskTitle: task.title,
      });

      broadcastActivityEvent(io, task.flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
    } catch (_) {}

    res.json({ success: true, message: 'Kaam deleted successfully' });
  }
);


