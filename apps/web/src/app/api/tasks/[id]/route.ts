import { NextResponse } from 'next/server';
import {
  db,
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  flatMembers,
  activityLog,
} from '@baari/db';
import { eq, and, desc, or } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const { id: taskId } = await params;

  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, task.flatId), eq(flatMembers.userId, user.id)));

  if (!membership) {
    return forbiddenResponse('Forbidden. You are not a member of this flat.');
  }

  return NextResponse.json({ task });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const { id: taskId } = await params;

  const [existingTask] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!existingTask) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, existingTask.flatId), eq(flatMembers.userId, user.id)));

  if (!membership) {
    return forbiddenResponse('You are not a member of this flat.');
  }

  const body = await req.json();
  const {
    title,
    category,
    description,
    peopleRequired,
    recurrence,
    customRecurrenceConfig,
    assignmentMode,
    customRotationPool,
    customRotationGroupSize,
    customRotationGroups,
    assigneeIds,
    occurrenceDate,
  } = body;

  const updateData: any = {};
  if (title !== undefined) updateData.title = title.trim();
  if (category !== undefined) updateData.category = category;
  if (description !== undefined) updateData.description = description ? description.trim() : null;
  if (peopleRequired !== undefined) updateData.peopleRequired = peopleRequired;
  if (recurrence !== undefined) updateData.recurrence = recurrence;
  if (customRecurrenceConfig !== undefined) updateData.customRecurrenceConfig = customRecurrenceConfig;
  if (assignmentMode !== undefined) updateData.assignmentMode = assignmentMode;
  if (customRotationPool !== undefined) updateData.customRotationPool = customRotationPool;
  if (customRotationGroupSize !== undefined) updateData.customRotationGroupSize = customRotationGroupSize;
  if (customRotationGroups !== undefined) updateData.customRotationGroups = customRotationGroups;

  const [updatedTask] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId))
    .returning();

  const [currentPendingOcc] = await db
    .select()
    .from(taskOccurrences)
    .where(
      and(
        eq(taskOccurrences.taskId, taskId),
        or(eq(taskOccurrences.status, 'pending'), eq(taskOccurrences.status, 'in_progress'))
      )
    )
    .orderBy(desc(taskOccurrences.occurrenceDate));

  if (currentPendingOcc) {
    if (occurrenceDate) {
      await db
        .update(taskOccurrences)
        .set({ occurrenceDate })
        .where(eq(taskOccurrences.id, currentPendingOcc.id));
    }

    if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      await db
        .delete(taskOccurrenceMembers)
        .where(eq(taskOccurrenceMembers.occurrenceId, currentPendingOcc.id));

      await db.insert(taskOccurrenceMembers).values(
        assigneeIds.map((memberId: string) => ({
          occurrenceId: currentPendingOcc.id,
          userId: memberId,
          status: 'assigned' as const,
        }))
      );
    }
  }

  return NextResponse.json({ success: true, task: updatedTask });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const { id: taskId } = await params;

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
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, task.flatId), eq(flatMembers.userId, user.id)));

  if (!membership) {
    return forbiddenResponse('You are not a member of this flat.');
  }

  await db.delete(tasks).where(eq(tasks.id, taskId));

  await db.insert(activityLog).values({
    flatId: task.flatId,
    actorId: user.id,
    type: 'task_deleted',
    referenceId: task.id,
    metadata: { taskTitle: task.title },
  });

  return NextResponse.json({ success: true, message: 'Task deleted successfully' });
}
