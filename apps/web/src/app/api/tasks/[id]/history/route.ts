import { NextResponse } from 'next/server';
import {
  db,
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  flatMembers,
  user,
} from '@baari/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: taskId } = await params;

  const [task] = await db
    .select({
      id: tasks.id,
      flatId: tasks.flatId,
      title: tasks.title,
      category: tasks.category,
      description: tasks.description,
      peopleRequired: tasks.peopleRequired,
      recurrence: tasks.recurrence,
      assignmentMode: tasks.assignmentMode,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, task.flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Forbidden. You are not a member of this flat.');
  }

  const fetchedOccurrences = await db
    .select({
      id: taskOccurrences.id,
      taskId: taskOccurrences.taskId,
      occurrenceDate: taskOccurrences.occurrenceDate,
      status: taskOccurrences.status,
      createdAt: taskOccurrences.createdAt,
    })
    .from(taskOccurrences)
    .where(eq(taskOccurrences.taskId, taskId))
    .orderBy(desc(taskOccurrences.occurrenceDate), desc(taskOccurrences.createdAt))
    .limit(30);

  const occurrenceIds = fetchedOccurrences.map((o) => o.id);
  const occMembers =
    occurrenceIds.length > 0
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

  const membersByOccId = new Map<string, any[]>();
  occMembers.forEach((m) => {
    const list = membersByOccId.get(m.occurrenceId) || [];
    list.push(m);
    membersByOccId.set(m.occurrenceId, list);
  });

  const occurrencesWithAssignees = fetchedOccurrences.map((o) => ({
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

  return NextResponse.json({
    task,
    occurrences: occurrencesWithAssignees,
  });
}
