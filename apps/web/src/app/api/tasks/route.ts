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
import { createTaskSchema } from '@baari/shared';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

  const flatTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.flatId, flatId))
    .orderBy(tasks.createdAt);

  if (flatTasks.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  const taskIds = flatTasks.map((t) => t.id);

  const occurrences = await db
    .select()
    .from(taskOccurrences)
    .where(inArray(taskOccurrences.taskId, taskIds));

  const occurrenceIds = occurrences.map((o) => o.id);

  const members =
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

  const membersByOccId = new Map<string, typeof members>();
  members.forEach((m) => {
    const list = membersByOccId.get(m.occurrenceId) || [];
    list.push(m);
    membersByOccId.set(m.occurrenceId, list);
  });

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

  const rotationStates = await db
    .select()
    .from(taskRotationState)
    .where(inArray(taskRotationState.taskId, taskIds));

  const rotMap = new Map<string, number>();
  rotationStates.forEach((rs) => rotMap.set(rs.taskId, rs.currentMemberIndex));

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
      if (
        task.assignmentMode === 'custom_rotation' &&
        task.customRotationGroups &&
        task.customRotationGroups.length > 0
      ) {
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

  return NextResponse.json({ tasks: enrichedTasks });
}

export async function POST(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid task input' },
        { status: 400 }
      );
    }

    const {
      flatId,
      title,
      description,
      category,
      recurrence,
      assignmentMode,
      peopleRequired = 1,
      customRecurrenceConfig,
      customRotationPool,
      customRotationGroupSize,
      customRotationGroups,
      assigneeIds,
      occurrenceDate,
    } = parsed.data;

    const [membership] = await db
      .select({ role: flatMembers.role })
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

    if (!membership) {
      return forbiddenResponse('Forbidden. You are not a member of this flat.');
    }

    const activeMembers = await db
      .select({ id: user.id })
      .from(flatMembers)
      .innerJoin(user, eq(flatMembers.userId, user.id))
      .where(eq(flatMembers.flatId, flatId))
      .orderBy(asc(flatMembers.joinedAt));

    const allMemberIds = activeMembers.map((m) => m.id);

    const [newTask] = await db
      .insert(tasks)
      .values({
        flatId,
        title,
        description: description || null,
        category,
        recurrence,
        assignmentMode,
        peopleRequired: peopleRequired || 1,
        customRecurrenceConfig: customRecurrenceConfig || null,
        customRotationPool: customRotationPool || null,
        customRotationGroupSize: customRotationGroupSize || 1,
        customRotationGroups: customRotationGroups || null,
        createdBy: userSession.id,
      })
      .returning();

    const targetDate = occurrenceDate || getTodayString();

    const [initialOcc] = await db
      .insert(taskOccurrences)
      .values({
        taskId: newTask.id,
        occurrenceDate: targetDate,
        status: 'pending',
      })
      .returning();

    let assignedUserIds: string[] = [];
    if (assigneeIds && assigneeIds.length > 0) {
      assignedUserIds = assigneeIds;
    } else if (assignmentMode === 'custom_rotation' && customRotationGroups && customRotationGroups.length > 0) {
      assignedUserIds = customRotationGroups[0].userIds;
    } else {
      assignedUserIds = allMemberIds.slice(0, peopleRequired || 1);
    }

    if (assignedUserIds.length > 0) {
      await db.insert(taskOccurrenceMembers).values(
        assignedUserIds.map((uId) => ({
          occurrenceId: initialOcc.id,
          userId: uId,
          status: 'assigned' as const,
        }))
      );
    }

    const nextIndex =
      assignmentMode === 'custom_rotation' && customRotationGroups && customRotationGroups.length > 0
        ? 1 % customRotationGroups.length
        : assignedUserIds.length % (allMemberIds.length || 1);

    await db.insert(taskRotationState).values({
      taskId: newTask.id,
      currentMemberIndex: nextIndex,
    });

    await db.insert(activityLog).values({
      flatId,
      actorId: userSession.id,
      type: 'task_created',
      referenceId: newTask.id,
      metadata: { taskTitle: newTask.title },
    });

    return NextResponse.json({ task: newTask, initialOccurrence: initialOcc }, { status: 201 });
  } catch (err: any) {
    console.error('[Create Task Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to create task' }, { status: 500 });
  }
}
