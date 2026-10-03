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
import { eq, and, inArray, asc } from 'drizzle-orm';
import { getIO } from '../../sockets/index.js';
import { broadcastActivityEvent } from '../../sockets/handlers.js';
import { sendPushNotification, sendPushToUser } from '../../services/push.js';
import { logger } from '../../middleware/error-handler.js';
import { computeNextOccurrenceDate, getTodayString, isFlatMember } from '../../utils/index.js';

export const occurrencesRouter = Router();

// PATCH /api/tasks/occurrences/:id/complete
occurrencesRouter.patch(
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

    // Check if occurrence date has arrived yet (prevent completing future tasks)
    const todayStr = getTodayString();
    const occDateStr = String(occ.occurrenceDate).substring(0, 10);

    if (occDateStr > todayStr) {
      res.status(400).json({ error: `Cannot complete a task before its scheduled date (${occDateStr})` });
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

// PATCH /api/tasks/occurrences/:id/skip-turn
occurrencesRouter.patch(
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
    logger.info(
      {
        taskId: occ.taskId,
        taskTitle: occ.taskTitle,
        occurrenceId,
        passedToUserId: nextMemberInfo.userId,
        passedToName: nextMemberInfo.name,
        senderId: req.user!.id,
        senderName: req.user!.name,
        reason,
      },
      '[Push Trigger 2: Kaam Turn Assignment] Code path reached for skip turn push'
    );
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

// POST /api/tasks/occurrences/:id/remind (Nudge assignees for pending occurrence)
occurrencesRouter.post(
  '/occurrences/:id/remind',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const occurrenceId = String(req.params.id);
    const userId = req.user!.id;
    const { targetUserId } = req.body || {};

    // 1. Find occurrence and parent task
    const [occ] = await db
      .select({
        id: taskOccurrences.id,
        taskId: taskOccurrences.taskId,
        occurrenceDate: taskOccurrences.occurrenceDate,
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

    // 2. Verify caller belongs to the flat
    if (!(await isFlatMember(occ.flatId, userId))) {
      res.status(403).json({ error: 'You are not a member of this flat' });
      return;
    }

    // 3. Verify occurrence status is active
    if (occ.status === 'done') {
      res.status(400).json({ error: 'This task has already been completed' });
      return;
    }
    if (occ.status === 'missed') {
      res.status(400).json({ error: 'Cannot send a reminder for a missed task' });
      return;
    }

    // 4. Look up assignees who haven't completed their part yet
    const pendingMembers = await db
      .select({
        id: taskOccurrenceMembers.id,
        userId: taskOccurrenceMembers.userId,
        status: taskOccurrenceMembers.status,
        lastRemindedAt: taskOccurrenceMembers.lastRemindedAt,
        name: user.name,
      })
      .from(taskOccurrenceMembers)
      .innerJoin(user, eq(taskOccurrenceMembers.userId, user.id))
      .where(
        and(
          eq(taskOccurrenceMembers.occurrenceId, occurrenceId),
          eq(taskOccurrenceMembers.status, 'assigned')
        )
      );

    if (pendingMembers.length === 0) {
      res.status(400).json({ error: 'All assignees have already completed their turn' });
      return;
    }

    let targetsToRemind = targetUserId
      ? pendingMembers.filter((m) => m.userId === targetUserId)
      : pendingMembers.filter((m) => m.userId !== userId);

    if (targetsToRemind.length === 0 && !targetUserId && pendingMembers.some((m) => m.userId === userId)) {
      targetsToRemind = pendingMembers;
    }

    if (targetsToRemind.length === 0) {
      res.status(400).json({ error: 'No eligible assignees to remind' });
      return;
    }

    // 5. Rate-limit check per occurrence (5 minute cooldown per assignee)
    const COOLDOWN_MINUTES = 5;
    const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
    const now = new Date();

    const throttledMember = targetsToRemind.find((m) => {
      if (!m.lastRemindedAt) return false;
      return now.getTime() - new Date(m.lastRemindedAt).getTime() < COOLDOWN_MS;
    });

    if (throttledMember) {
      const elapsedMs = now.getTime() - new Date(throttledMember.lastRemindedAt!).getTime();
      const remainingMinutes = Math.ceil((COOLDOWN_MS - elapsedMs) / 60000);
      res.status(429).json({
        error: `A reminder was sent to ${throttledMember.name} recently. Please wait ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} before reminding again.`,
        cooldownRemainingSeconds: Math.ceil((COOLDOWN_MS - elapsedMs) / 1000),
      });
      return;
    }

    // 6. Update last_reminded_at timestamp
    const targetMemberIds = targetsToRemind.map((m) => m.id);
    await db
      .update(taskOccurrenceMembers)
      .set({ lastRemindedAt: now })
      .where(inArray(taskOccurrenceMembers.id, targetMemberIds));

    // 7. Send push notifications
    for (const target of targetsToRemind) {
      await sendPushToUser(
        target.userId,
        'Reminder 🔔',
        `It's your baari (turn) for "${occ.taskTitle}"!`,
        {
          type: 'task_reminder',
          taskId: occ.taskId,
          occurrenceId: occ.id,
          flatId: occ.flatId,
        }
      );
    }

    // 8. Insert activity_log entry
    const remindedNames = targetsToRemind.map((m) => m.name).join(', ');
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId: occ.flatId,
        actorId: userId,
        type: 'reminder_sent',
        referenceId: occ.taskId,
        metadata: {
          taskTitle: occ.taskTitle,
          occurrenceId: occ.id,
          remindedUserIds: targetsToRemind.map((m) => m.userId),
          remindedNames,
          senderName: req.user!.name,
        },
      })
      .returning();

    // 9. Realtime broadcast
    try {
      const io = getIO();
      broadcastActivityEvent(io, occ.flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
    } catch (_) {}

    res.json({
      message: 'Reminder sent successfully',
      remindedCount: targetsToRemind.length,
      remindedUsers: targetsToRemind.map((m) => ({ id: m.userId, name: m.name })),
    });
  }
);
