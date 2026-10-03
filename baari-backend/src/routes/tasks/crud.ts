import { Router, Response } from 'express';
import { db } from '../../db/index.js';
import {
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  flatMembers,
  taskRotationState,
  user,
  activityLog,
} from '../../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth-guard.js';
import { validate } from '../../middleware/validate.js';
import { createTaskSchema } from '../../schemas/tasks.js';
import { eq, and, desc, inArray, asc, gte } from 'drizzle-orm';
import { getIO } from '../../sockets/index.js';
import { broadcastActivityEvent, broadcastTaskDeleted } from '../../sockets/handlers.js';
import { sendPushNotification } from '../../services/push.js';
import { calculateUserStreak } from '../../services/streaks.js';
import { logger } from '../../middleware/error-handler.js';
import { isFlatMember, getTodayString } from '../../utils/index.js';

export const crudRouter = Router();

// GET /api/tasks/streaks?userId=
crudRouter.get('/streaks', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = (req.query.userId as string) || req.user!.id;
  const streaks = await calculateUserStreak(userId);
  res.json(streaks);
});

// GET /api/tasks/weekly-summary?flatId=
crudRouter.get('/weekly-summary', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  if (!flatId) {
    res.status(400).json({ error: 'flatId query param is required' });
    return;
  }

  if (!(await isFlatMember(flatId, req.user!.id))) {
    res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
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

// GET /api/tasks?flatId= - Get active tasks for a flat
crudRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  if (!flatId) {
    res.status(400).json({ error: 'flatId query param is required' });
    return;
  }

  const userId = req.user!.id;
  if (!(await isFlatMember(flatId, userId))) {
    res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
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

  const todayStr = getTodayString();

  // Attach current occurrence and nextAssignee to each task
  const enrichedTasks = flatTasks.map((task) => {
    const taskOccs = occsByTaskId.get(task.id) || [];
    
    let currentOcc = taskOccs.find((o) => String(o.occurrenceDate).substring(0, 10) === todayStr);
    
    if (!currentOcc) {
      const pastOrTodayOccs = taskOccs.filter(
        (o) => String(o.occurrenceDate).substring(0, 10) <= todayStr
      );
      if (pastOrTodayOccs.length > 0) {
        currentOcc = pastOrTodayOccs.find((o) => o.status !== 'done') || pastOrTodayOccs[0];
      } else {
        currentOcc = taskOccs[taskOccs.length - 1] || null;
      }
    }

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
      currentOccurrence: currentOcc || null,
      nextAssignee,
    };
  });

  res.json({ tasks: enrichedTasks });
});

// POST /api/tasks - Create a task
crudRouter.post(
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

    if (!(await isFlatMember(flatId, userId))) {
      res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
      return;
    }

    const todayStr = occurrenceDate || new Date().toISOString().split('T')[0];

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
      logger.info(
        {
          taskId: newTask.id,
          taskTitle: newTask.title,
          category: newTask.category,
          assigneeIds,
          creatorId: req.user!.id,
          creatorName: req.user!.name,
        },
        '[Push Trigger 2: Kaam Turn Assignment] Code path reached for new task assignment push'
      );
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

// DELETE /api/tasks/:id
crudRouter.delete(
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

    // 3. Log activity before deleting
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

    // 4. Delete task
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
