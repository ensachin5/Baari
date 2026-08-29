import { Router, Response } from 'express';
import { db } from '../db/index.js';
import {
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  user,
  activityLog,
} from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { validate } from '../middleware/validate.js';
import { createTaskSchema, completeOccurrenceSchema } from '../schemas/tasks.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getIO } from '../sockets/index.js';
import { broadcastTaskCompleted, broadcastActivityEvent } from '../sockets/handlers.js';

export const tasksRouter = Router();

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

  // Attach latest occurrence to each task
  const enrichedTasks = flatTasks.map((task) => {
    const taskOccs = occsByTaskId.get(task.id) || [];
    const latestOccurrence = taskOccs[0] || null;
    return {
      ...task,
      occurrences: taskOccs,
      currentOccurrence: latestOccurrence,
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

    // 4. Log activity
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId,
        actorId: userId,
        type: 'task_created',
        referenceId: newTask.id,
        metadata: {
          taskTitle: newTask.title,
          category: newTask.category,
          peopleRequired: newTask.peopleRequired,
        },
      })
      .returning();

    try {
      const io = getIO();
      broadcastActivityEvent(io, flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
    } catch (_) {}

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
