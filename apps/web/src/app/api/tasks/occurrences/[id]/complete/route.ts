import { NextResponse } from 'next/server';
import {
  db,
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  taskRotationState,
  flatMembers,
  activityLog,
} from '@baari/db';
import { computeNextOccurrenceDate } from '@baari/shared';
import { eq, and, asc } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const { id: occurrenceId } = await params;

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
      peopleRequired: tasks.peopleRequired,
    })
    .from(taskOccurrences)
    .innerJoin(tasks, eq(taskOccurrences.taskId, tasks.id))
    .where(eq(taskOccurrences.id, occurrenceId));

  if (!occ) {
    return NextResponse.json({ error: 'Task occurrence not found' }, { status: 404 });
  }

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const occDateStr = String(occ.occurrenceDate).substring(0, 10);

  if (occDateStr > todayStr) {
    return NextResponse.json(
      { error: `Cannot complete a task before its scheduled date (${occDateStr})` },
      { status: 400 }
    );
  }

  const [updatedMember] = await db
    .update(taskOccurrenceMembers)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(
      and(
        eq(taskOccurrenceMembers.occurrenceId, occurrenceId),
        eq(taskOccurrenceMembers.userId, user.id)
      )
    )
    .returning();

  if (!updatedMember) {
    return NextResponse.json(
      { error: 'You are not assigned to this task occurrence or already completed' },
      { status: 400 }
    );
  }

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

          if (
            occ.assignmentMode === 'custom_rotation' &&
            occ.customRotationGroups &&
            occ.customRotationGroups.length > 0
          ) {
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
            await db.insert(taskOccurrenceMembers).values(
              nextAssigneeIds.map((uId) => ({
                occurrenceId: newOcc.id,
                userId: uId,
                status: 'assigned' as const,
              }))
            );

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

  await db.insert(activityLog).values({
    flatId: occ.flatId,
    actorId: user.id,
    type: 'task_completed',
    referenceId: occ.taskId,
    metadata: {
      taskTitle: occ.taskTitle,
      isFullyDone,
    },
  });

  return NextResponse.json({
    success: true,
    isFullyDone,
    occurrenceId,
  });
}
