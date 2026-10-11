import { NextResponse } from 'next/server';
import {
  db,
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  taskRotationState,
  flatMembers,
  user,
  activityLog,
} from '@baari/db';
import { eq, and, asc } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSkip(req, params);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSkip(req, params);
}

async function handleSkip(
  req: Request,
  paramsPromise: Promise<{ id: string }>
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: occurrenceId } = await paramsPromise;
  const body = await req.json().catch(() => ({}));
  const { reason } = body || {};

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
    return NextResponse.json({ error: 'Task occurrence not found' }, { status: 404 });
  }

  const [myAssignment] = await db
    .select()
    .from(taskOccurrenceMembers)
    .where(
      and(
        eq(taskOccurrenceMembers.occurrenceId, occurrenceId),
        eq(taskOccurrenceMembers.userId, userSession.id)
      )
    );

  if (!myAssignment) {
    return forbiddenResponse('You are not assigned to this task occurrence');
  }

  if (myAssignment.status === 'completed') {
    return NextResponse.json({ error: 'Cannot skip an already completed task' }, { status: 400 });
  }

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
    return NextResponse.json({ error: 'Cannot skip turn: no other members in flat' }, { status: 400 });
  }

  const [rotState] = await db
    .select()
    .from(taskRotationState)
    .where(eq(taskRotationState.taskId, occ.taskId));

  let nextIndex = rotState ? rotState.currentMemberIndex : 0;
  let nextMember = members[nextIndex % members.length];
  if (nextMember.userId === userSession.id) {
    nextIndex = (nextIndex + 1) % members.length;
    nextMember = members[nextIndex];
  }

  const nextAssigneeId = nextMember.userId;
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

  await db
    .update(taskOccurrenceMembers)
    .set({ userId: nextAssigneeId })
    .where(eq(taskOccurrenceMembers.id, myAssignment.id));

  await db.insert(activityLog).values({
    flatId: occ.flatId,
    actorId: userSession.id,
    type: 'task_skipped',
    referenceId: occ.taskId,
    metadata: {
      taskTitle: occ.taskTitle,
      reason: reason || 'Turn skipped',
      passedToName: nextMember.name,
    },
  });

  return NextResponse.json({
    success: true,
    passedTo: nextMember,
  });
}
