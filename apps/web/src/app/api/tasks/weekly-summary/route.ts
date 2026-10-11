import { NextResponse } from 'next/server';
import {
  db,
  tasks,
  taskOccurrences,
  taskOccurrenceMembers,
  flatMembers,
  user,
} from '@baari/db';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const flatId = searchParams.get('flatId');
  if (!flatId) {
    return NextResponse.json({ error: 'flatId query param is required' }, { status: 400 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Forbidden. You are not a member of this flat.');
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const flatTasksList = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(eq(tasks.flatId, flatId));

  if (flatTasksList.length === 0) {
    return NextResponse.json({ weeklySummary: [] });
  }

  const taskTitleMap = new Map(flatTasksList.map((t) => [t.id, t.title]));
  const taskIds = flatTasksList.map((t) => t.id);

  const recentOccurrences = await db
    .select({ id: taskOccurrences.id, taskId: taskOccurrences.taskId })
    .from(taskOccurrences)
    .where(
      and(
        inArray(taskOccurrences.taskId, taskIds),
        gte(taskOccurrences.createdAt, sevenDaysAgo)
      )
    );

  if (recentOccurrences.length === 0) {
    return NextResponse.json({ weeklySummary: [] });
  }

  const occTaskIdMap = new Map(recentOccurrences.map((o) => [o.id, o.taskId]));
  const occIds = recentOccurrences.map((o) => o.id);

  const completedMembers = await db
    .select({
      userId: taskOccurrenceMembers.userId,
      occurrenceId: taskOccurrenceMembers.occurrenceId,
      name: user.name,
      image: user.image,
    })
    .from(taskOccurrenceMembers)
    .innerJoin(user, eq(taskOccurrenceMembers.userId, user.id))
    .where(
      and(
        inArray(taskOccurrenceMembers.occurrenceId, occIds),
        eq(taskOccurrenceMembers.status, 'completed')
      )
    );

  const summaryMap = new Map<
    string,
    {
      userId: string;
      userName: string;
      userImage: string | null;
      totalCompleted: number;
      taskCounts: Map<string, number>;
    }
  >();

  completedMembers.forEach((m) => {
    let entry = summaryMap.get(m.userId);
    if (!entry) {
      entry = {
        userId: m.userId,
        userName: m.name,
        userImage: m.image,
        totalCompleted: 0,
        taskCounts: new Map<string, number>(),
      };
      summaryMap.set(m.userId, entry);
    }

    entry.totalCompleted++;
    const taskId = occTaskIdMap.get(m.occurrenceId);
    if (taskId) {
      const taskTitle = taskTitleMap.get(taskId) || 'Task';
      entry.taskCounts.set(taskTitle, (entry.taskCounts.get(taskTitle) || 0) + 1);
    }
  });

  const weeklySummary = Array.from(summaryMap.values())
    .map((e) => ({
      userId: e.userId,
      userName: e.userName,
      userImage: e.userImage,
      totalCompleted: e.totalCompleted,
      breakdown: Array.from(e.taskCounts.entries()).map(([taskTitle, count]) => ({
        taskTitle,
        count,
      })),
    }))
    .sort((a, b) => b.totalCompleted - a.totalCompleted);

  return NextResponse.json({ weeklySummary });
}
