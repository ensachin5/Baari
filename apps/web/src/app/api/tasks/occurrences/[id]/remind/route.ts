import { NextResponse } from 'next/server';
import {
  db,
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  flatMembers,
  activityLog,
  user,
} from '@baari/db';
import { eq, and, inArray } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { sendPushNotification } from '@/lib/services/push';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: occurrenceId } = await params;
  const body = await req.json().catch(() => ({}));
  const { targetUserId } = body || {};

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
    return NextResponse.json({ error: 'Task occurrence not found' }, { status: 404 });
  }

  const [membership] = await db
    .select({ id: flatMembers.id })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, occ.flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('You are not a member of this flat');
  }

  if (occ.status === 'done') {
    return NextResponse.json({ error: 'This task has already been completed' }, { status: 400 });
  }
  if (occ.status === 'missed') {
    return NextResponse.json({ error: 'Cannot send a reminder for a missed task' }, { status: 400 });
  }

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
    return NextResponse.json({ error: 'All assignees have already completed their turn' }, { status: 400 });
  }

  let targetsToRemind = targetUserId
    ? pendingMembers.filter((m) => m.userId === targetUserId)
    : pendingMembers.filter((m) => m.userId !== userSession.id);

  if (targetsToRemind.length === 0 && !targetUserId && pendingMembers.some((m) => m.userId === userSession.id)) {
    targetsToRemind = pendingMembers;
  }

  if (targetsToRemind.length === 0) {
    return NextResponse.json({ error: 'No eligible assignees to remind' }, { status: 400 });
  }

  const now = new Date();
  const targetMemberIds = targetsToRemind.map((m) => m.id);
  await db
    .update(taskOccurrenceMembers)
    .set({ lastRemindedAt: now })
    .where(inArray(taskOccurrenceMembers.id, targetMemberIds));

  const targetUserIds = targetsToRemind.map((m) => m.userId);
  sendPushNotification(targetUserIds, {
    title: 'Reminder 🔔',
    body: `It's your baari (turn) for "${occ.taskTitle}"!`,
    data: {
      type: 'task_reminder',
      taskId: occ.taskId,
      occurrenceId: occ.id,
      flatId: occ.flatId,
    },
  }).catch(console.error);

  const remindedNames = targetsToRemind.map((m) => m.name).join(', ');
  await db.insert(activityLog).values({
    flatId: occ.flatId,
    actorId: userSession.id,
    type: 'reminder_sent',
    referenceId: occ.taskId,
    metadata: {
      taskTitle: occ.taskTitle,
      occurrenceId: occ.id,
      remindedUserIds: targetUserIds,
      remindedNames,
      senderName: userSession.name,
    },
  });

  return NextResponse.json({
    message: 'Reminder sent successfully',
    remindedCount: targetsToRemind.length,
    remindedUsers: targetsToRemind.map((m) => ({ id: m.userId, name: m.name })),
  });
}
