import { Router, Response } from 'express';
import { db } from '../../db/index.js';
import {
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  user,
} from '../../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth-guard.js';
import { eq, and, or, lt, desc, inArray } from 'drizzle-orm';
import { isFlatMember, UUID_REGEX } from '../../utils/index.js';

export const rotationRouter = Router();

// GET /api/tasks/:id/history - Task definition and occurrence history with assignees
rotationRouter.get('/:id/history', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
  if (!(await isFlatMember(task.flatId, userId))) {
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

// GET /api/tasks/:id/rotation-history
rotationRouter.get(
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
