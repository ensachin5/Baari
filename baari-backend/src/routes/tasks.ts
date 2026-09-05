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
import { eq, and, or, lt, desc, inArray, asc, gte } from 'drizzle-orm';
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
      assignmentMode: tasks.assignmentMode,
      customRotationPool: tasks.customRotationPool,
      customRotationGroupSize: tasks.customRotationGroupSize,
      customRotationGroups: tasks.customRotationGroups,
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
    if (task.recurrence !== 'once') {
      if (task.assignmentMode === 'custom_rotation' && task.customRotationGroups && task.customRotationGroups.length > 0) {
        const groups = task.customRotationGroups;
        const rotIdx = (rotMap.get(task.id) || 0) % groups.length;
        const nextGroupUserIds = groups[rotIdx]?.userIds || [];
        if (nextGroupUserIds.length > 0) {
          nextAssignee = flatMembersList.find((m) => m.id === nextGroupUserIds[0]) || null;
        }
      } else if (flatMembersList.length > 0) {
        const rotIdx = (rotMap.get(task.id) || 0) % flatMembersList.length;
        nextAssignee = flatMembersList[rotIdx];
      }
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/tasks/:id/history - Task definition and occurrence history with assignees
tasksRouter.get('/:id/history', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const taskId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
  const userId = req.user!.id;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  if (!UUID_REGEX.test(taskId)) {
    res.status(400).json({ error: 'Invalid task ID' });
    return;
  }

  // 1. Fetch task definition with creator name
  const [task] = await db
    .select({
      id: tasks.id,
      flatId: tasks.flatId,
      title: tasks.title,
      category: tasks.category,
      description: tasks.description,
      peopleRequired: tasks.peopleRequired,
      recurrence: tasks.recurrence,
      customRecurrenceConfig: tasks.customRecurrenceConfig,
      assignmentMode: tasks.assignmentMode,
      customRotationPool: tasks.customRotationPool,
      customRotationGroupSize: tasks.customRotationGroupSize,
      customRotationGroups: tasks.customRotationGroups,
      createdBy: tasks.createdBy,
      active: tasks.active,
      createdAt: tasks.createdAt,
      creatorName: user.name,
    })
    .from(tasks)
    .innerJoin(user, eq(tasks.createdBy, user.id))
    .where(eq(tasks.id, taskId));

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  // 2. Check flat membership
  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, task.flatId), eq(flatMembers.userId, userId)));

  if (!membership) {
    res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
    return;
  }

  // 3. Visibility rule: For custom_rotation tasks, only users in the rotation pool can view history
  if (task.assignmentMode === 'custom_rotation') {
    const allowedPool = new Set<string>();
    if (Array.isArray(task.customRotationPool)) {
      task.customRotationPool.forEach((uid) => allowedPool.add(uid));
    }
    if (Array.isArray(task.customRotationGroups)) {
      task.customRotationGroups.forEach((g) => {
        if (Array.isArray(g.userIds)) {
          g.userIds.forEach((uid) => allowedPool.add(uid));
        }
      });
    }

    if (allowedPool.size > 0 && !allowedPool.has(userId) && task.createdBy !== userId) {
      res.status(403).json({ error: 'Forbidden. You are not part of this task\'s rotation pool.' });
      return;
    }
  }

  // 4. Build cursor conditions for occurrences
  const conditions = [eq(taskOccurrences.taskId, taskId)];
  if (cursor) {
    if (UUID_REGEX.test(cursor)) {
      const [cursorOcc] = await db
        .select({ occurrenceDate: taskOccurrences.occurrenceDate, createdAt: taskOccurrences.createdAt })
        .from(taskOccurrences)
        .where(eq(taskOccurrences.id, cursor));
      if (cursorOcc) {
        conditions.push(
          or(
            lt(taskOccurrences.occurrenceDate, cursorOcc.occurrenceDate),
            and(
              eq(taskOccurrences.occurrenceDate, cursorOcc.occurrenceDate),
              lt(taskOccurrences.createdAt, cursorOcc.createdAt)
            )
          )!
        );
      }
    } else {
      conditions.push(lt(taskOccurrences.occurrenceDate, cursor));
    }
  }

  // 5. Query occurrences ordered by occurrenceDate DESC, createdAt DESC
  const fetchedOccurrences = await db
    .select({
      id: taskOccurrences.id,
      taskId: taskOccurrences.taskId,
      occurrenceDate: taskOccurrences.occurrenceDate,
      status: taskOccurrences.status,
      createdAt: taskOccurrences.createdAt,
    })
    .from(taskOccurrences)
    .where(and(...conditions))
    .orderBy(desc(taskOccurrences.occurrenceDate), desc(taskOccurrences.createdAt))
    .limit(limit + 1);

  const hasMore = fetchedOccurrences.length > limit;
  const pageOccurrences = hasMore ? fetchedOccurrences.slice(0, limit) : fetchedOccurrences;
  const nextCursor = hasMore && pageOccurrences.length > 0 ? pageOccurrences[pageOccurrences.length - 1].id : null;

  // 6. Fetch assignees/members for these occurrences
  const occurrenceIds = pageOccurrences.map((o) => o.id);
  const occMembers = occurrenceIds.length > 0
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

  const membersByOccId = new Map<
    string,
    Array<{
      id: string;
      userId: string;
      userName: string;
      userImage: string | null;
      status: 'assigned' | 'completed';
      completedAt: Date | null;
    }>
  >();

  occMembers.forEach((m) => {
    const list = membersByOccId.get(m.occurrenceId) || [];
    list.push(m);
    membersByOccId.set(m.occurrenceId, list);
  });

  const occurrencesWithAssignees = pageOccurrences.map((o) => ({
    id: o.id,
    occurrenceDate: o.occurrenceDate,
    status: o.status,
    createdAt: o.createdAt,
    assignees: (membersByOccId.get(o.id) || []).map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.userName,
      userImage: m.userImage,
      status: m.status,
      completedAt: m.completedAt,
    })),
  }));

  res.json({
    task,
    occurrences: occurrencesWithAssignees,
    nextCursor,
  });
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
      assignmentMode = 'auto_rotate',
      customRotationPool,
      customRotationGroupSize = 1,
      customRotationGroups,
      assigneeIds,
      occurrenceDate,
    } = req.body;
    const userId = req.user!.id;

    const todayStr = occurrenceDate || new Date().toISOString().split('T')[0];

    // Determine effective initial assignees
    let effectiveAssigneeIds = assigneeIds;
    if (assignmentMode === 'custom_rotation' && customRotationGroups && customRotationGroups.length > 0) {
      effectiveAssigneeIds = customRotationGroups[0].userIds;
    }

    // 1. Create task
    const [newTask] = await db
      .insert(tasks)
      .values({
        flatId,
        title,
        category,
        description,
        peopleRequired: peopleRequired || effectiveAssigneeIds.length,
        recurrence,
        customRecurrenceConfig: recurrence === 'custom' ? (customRecurrenceConfig || null) : null,
        assignmentMode,
        customRotationPool: customRotationPool || null,
        customRotationGroupSize: customRotationGroupSize || 1,
        customRotationGroups: customRotationGroups || null,
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
    const memberValues = effectiveAssigneeIds.map((assigneeId: string) => ({
      occurrenceId: newOccurrence.id,
      userId: assigneeId,
      status: 'assigned' as const,
    }));

    await db.insert(taskOccurrenceMembers).values(memberValues);

    // Initialize task rotation state for recurring tasks
    if (recurrence !== 'once') {
      let nextIndex = 0;
      if (assignmentMode === 'custom_rotation' && customRotationGroups && customRotationGroups.length > 0) {
        nextIndex = customRotationGroups.length > 1 ? 1 : 0;
      } else {
        const allMembers = await db
          .select({ userId: flatMembers.userId })
          .from(flatMembers)
          .where(eq(flatMembers.flatId, flatId))
          .orderBy(asc(flatMembers.joinedAt));

        if (allMembers.length > 0 && effectiveAssigneeIds.length > 0) {
          const foundIdx = allMembers.findIndex((m) => m.userId === effectiveAssigneeIds[0]);
          if (foundIdx !== -1) {
            nextIndex = (foundIdx + 1) % allMembers.length;
          }
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
          assignmentMode,
          peopleRequired: peopleRequired || effectiveAssigneeIds.length,
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
        assignmentMode: tasks.assignmentMode,
        customRotationGroups: tasks.customRotationGroups,
        customRotationGroupSize: tasks.customRotationGroupSize,
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

            const [rotState] = await db
              .select()
              .from(taskRotationState)
              .where(eq(taskRotationState.taskId, occ.taskId));

            const curIdx = rotState ? rotState.currentMemberIndex : 0;
            let nextAssigneeIds: string[] = [];
            let newIndex = 0;

            if (occ.assignmentMode === 'custom_rotation' && occ.customRotationGroups && occ.customRotationGroups.length > 0) {
              const groups = occ.customRotationGroups;
              const groupIdx = curIdx % groups.length;
              nextAssigneeIds = groups[groupIdx].userIds;
              newIndex = groups.length > 1 ? (groupIdx + 1) % groups.length : 0;
            } else {
              const flatMembersList = await db
                .select({ userId: flatMembers.userId })
                .from(flatMembers)
                .where(eq(flatMembers.flatId, occ.flatId))
                .orderBy(asc(flatMembers.joinedAt));

              if (flatMembersList.length > 0) {
                const peopleReq = Math.min(occ.peopleRequired || 1, flatMembersList.length);
                for (let i = 0; i < peopleReq; i++) {
                  const assignedUser = flatMembersList[(curIdx + i) % flatMembersList.length];
                  nextAssigneeIds.push(assignedUser.userId);
                }
                newIndex = (curIdx + peopleReq) % flatMembersList.length;
              }
            }

            if (nextAssigneeIds.length > 0) {
              const newMemberValues = nextAssigneeIds.map((uId) => ({
                occurrenceId: newOcc.id,
                userId: uId,
                status: 'assigned' as const,
              }));

              await db.insert(taskOccurrenceMembers).values(newMemberValues);

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
      broadcastActivityEvent(io, occ.flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
      io.to(`flat:${occ.flatId}`).emit('task_completed', {
        occurrenceId,
        userId,
        isFullyDone,
      });
    } catch (_) {}

    res.json({
      occurrence: occ,
      member: updatedMember,
      isFullyDone,
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
        assignmentMode: tasks.assignmentMode,
        customRotationGroups: tasks.customRotationGroups,
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

    let nextAssigneeId: string | null = null;
    let nextMemberInfo: { userId: string; name: string; image?: string | null } | null = null;

    if (occ.assignmentMode === 'custom_rotation' && occ.customRotationGroups && occ.customRotationGroups.length > 1) {
      const groups = occ.customRotationGroups;
      const [rotState] = await db
        .select()
        .from(taskRotationState)
        .where(eq(taskRotationState.taskId, occ.taskId));

      let nextIndex = rotState ? rotState.currentMemberIndex : 0;
      let nextGroup = groups[nextIndex % groups.length];
      if (nextGroup.userIds.includes(userId)) {
        nextIndex = (nextIndex + 1) % groups.length;
        nextGroup = groups[nextIndex];
      }
      nextAssigneeId = nextGroup.userIds[0];

      const [nextUser] = await db
        .select({ userId: user.id, name: user.name, image: user.image })
        .from(user)
        .where(eq(user.id, nextAssigneeId));

      nextMemberInfo = nextUser || { userId: nextAssigneeId, name: 'Flatmate' };

      const newPointer = (nextIndex + 1) % groups.length;
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
    } else {
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
      nextAssigneeId = nextMember.userId;
      nextMemberInfo = nextMember;

      // Advance rotation pointer to next person
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
    }

    if (!nextAssigneeId || !nextMemberInfo) {
      res.status(400).json({ error: 'Could not resolve next turn assignee' });
      return;
    }

    // 5. Update assignment in task_occurrence_members
    await db
      .update(taskOccurrenceMembers)
      .set({
        userId: nextAssigneeId,
        status: 'assigned',
        completedAt: null,
      })
      .where(eq(taskOccurrenceMembers.id, myAssignment.id));

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
          passedToName: nextMemberInfo.name,
          passedToUserId: nextMemberInfo.userId,
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
        reassignedTo: nextMemberInfo,
      });
    } catch (_) {}

    // 9. Push notification
    sendPushNotification([nextMemberInfo.userId], {
      title: `Kaam Passed to You: ${occ.taskTitle}`,
      body: `${req.user!.name} passed their turn to you.${reason ? ` Reason: "${reason}"` : ''}`,
      data: { type: 'task', taskId: occ.taskId, occurrenceId },
    });

    res.json({
      message: `Turn passed to ${nextMemberInfo.name}`,
      passedTo: nextMemberInfo,
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


