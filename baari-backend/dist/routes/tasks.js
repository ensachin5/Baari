"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRouter = void 0;
exports.computeNextOccurrenceDate = computeNextOccurrenceDate;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const auth_guard_js_1 = require("../middleware/auth-guard.js");
const validate_js_1 = require("../middleware/validate.js");
const tasks_js_1 = require("../schemas/tasks.js");
const drizzle_orm_1 = require("drizzle-orm");
const index_js_2 = require("../sockets/index.js");
const handlers_js_1 = require("../sockets/handlers.js");
const push_js_1 = require("../services/push.js");
const streaks_js_1 = require("../services/streaks.js");
const WEEKDAY_MAP = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
};
function computeNextOccurrenceDate(recurrence, customConfig, fromOccurrenceDate) {
    if (recurrence === 'once')
        return null;
    let baseDate;
    if (fromOccurrenceDate) {
        const [y, m, d] = fromOccurrenceDate.split('-').map(Number);
        baseDate = new Date(Date.UTC(y, m - 1, d));
    }
    else {
        const now = new Date();
        baseDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    }
    if (recurrence === 'daily') {
        baseDate.setUTCDate(baseDate.getUTCDate() + 1);
        return baseDate.toISOString().split('T')[0];
    }
    if (recurrence === 'weekly') {
        baseDate.setUTCDate(baseDate.getUTCDate() + 7);
        return baseDate.toISOString().split('T')[0];
    }
    if (recurrence === 'custom' && customConfig) {
        if (customConfig.type === 'interval') {
            const intervalDays = Math.max(1, customConfig.everyNDays || 1);
            baseDate.setUTCDate(baseDate.getUTCDate() + intervalDays);
            return baseDate.toISOString().split('T')[0];
        }
        if (customConfig.type === 'specific_days' && Array.isArray(customConfig.days) && customConfig.days.length > 0) {
            const targetDays = customConfig.days
                .map((d) => WEEKDAY_MAP[d.toLowerCase()])
                .filter((d) => d !== undefined);
            if (targetDays.length === 0) {
                baseDate.setUTCDate(baseDate.getUTCDate() + 1);
                return baseDate.toISOString().split('T')[0];
            }
            const currentDay = baseDate.getUTCDay();
            for (let offset = 1; offset <= 7; offset++) {
                const checkDay = (currentDay + offset) % 7;
                if (targetDays.includes(checkDay)) {
                    baseDate.setUTCDate(baseDate.getUTCDate() + offset);
                    return baseDate.toISOString().split('T')[0];
                }
            }
        }
    }
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
    return baseDate.toISOString().split('T')[0];
}
exports.tasksRouter = (0, express_1.Router)();
// GET /api/tasks/streaks?userId=
exports.tasksRouter.get('/streaks', auth_guard_js_1.requireAuth, async (req, res) => {
    const userId = req.query.userId || req.user.id;
    const streaks = await (0, streaks_js_1.calculateUserStreak)(userId);
    res.json(streaks);
});
// GET /api/tasks/weekly-summary?flatId=
exports.tasksRouter.get('/weekly-summary', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = req.query.flatId;
    if (!flatId) {
        res.status(400).json({ error: 'flatId query param is required' });
        return;
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const completedRecords = await index_js_1.db
        .select({
        userId: schema_js_1.taskOccurrenceMembers.userId,
        userName: schema_js_1.user.name,
        userImage: schema_js_1.user.image,
        taskTitle: schema_js_1.tasks.title,
        completedAt: schema_js_1.taskOccurrenceMembers.completedAt,
    })
        .from(schema_js_1.taskOccurrenceMembers)
        .innerJoin(schema_js_1.taskOccurrences, (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.occurrenceId, schema_js_1.taskOccurrences.id))
        .innerJoin(schema_js_1.tasks, (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.taskId, schema_js_1.tasks.id))
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.userId, schema_js_1.user.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.tasks.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.status, 'completed'), (0, drizzle_orm_1.gte)(schema_js_1.taskOccurrenceMembers.completedAt, sevenDaysAgo)));
    const summaryByUser = new Map();
    completedRecords.forEach((rec) => {
        let userSummary = summaryByUser.get(rec.userId);
        if (!userSummary) {
            userSummary = {
                userId: rec.userId,
                userName: rec.userName,
                userImage: rec.userImage,
                taskCounts: {},
                totalCompleted: 0,
            };
            summaryByUser.set(rec.userId, userSummary);
        }
        userSummary.totalCompleted += 1;
        userSummary.taskCounts[rec.taskTitle] = (userSummary.taskCounts[rec.taskTitle] || 0) + 1;
    });
    const summary = Array.from(summaryByUser.values()).map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userImage: u.userImage,
        totalCompleted: u.totalCompleted,
        breakdown: Object.entries(u.taskCounts).map(([taskTitle, count]) => ({
            taskTitle,
            count,
        })),
    }));
    res.json({ weeklySummary: summary });
});
// Get tasks for a flat
exports.tasksRouter.get('/', auth_guard_js_1.requireAuth, async (req, res) => {
    const flatId = req.query.flatId;
    if (!flatId) {
        res.status(400).json({ error: 'flatId query param is required' });
        return;
    }
    // Fetch all active tasks
    const flatTasks = await index_js_1.db
        .select({
        id: schema_js_1.tasks.id,
        flatId: schema_js_1.tasks.flatId,
        title: schema_js_1.tasks.title,
        category: schema_js_1.tasks.category,
        description: schema_js_1.tasks.description,
        peopleRequired: schema_js_1.tasks.peopleRequired,
        recurrence: schema_js_1.tasks.recurrence,
        customRecurrenceConfig: schema_js_1.tasks.customRecurrenceConfig,
        createdBy: schema_js_1.tasks.createdBy,
        active: schema_js_1.tasks.active,
        createdAt: schema_js_1.tasks.createdAt,
        creatorName: schema_js_1.user.name,
    })
        .from(schema_js_1.tasks)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.tasks.createdBy, schema_js_1.user.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.tasks.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.tasks.active, true)))
        .orderBy((0, drizzle_orm_1.desc)(schema_js_1.tasks.createdAt));
    if (flatTasks.length === 0) {
        res.json({ tasks: [] });
        return;
    }
    const taskIds = flatTasks.map((t) => t.id);
    // Fetch occurrences for these tasks
    const occurrences = await index_js_1.db
        .select()
        .from(schema_js_1.taskOccurrences)
        .where((0, drizzle_orm_1.inArray)(schema_js_1.taskOccurrences.taskId, taskIds))
        .orderBy((0, drizzle_orm_1.desc)(schema_js_1.taskOccurrences.occurrenceDate));
    const occurrenceIds = occurrences.map((o) => o.id);
    // Fetch occurrence members
    const members = occurrenceIds.length > 0
        ? await index_js_1.db
            .select({
            id: schema_js_1.taskOccurrenceMembers.id,
            occurrenceId: schema_js_1.taskOccurrenceMembers.occurrenceId,
            userId: schema_js_1.taskOccurrenceMembers.userId,
            status: schema_js_1.taskOccurrenceMembers.status,
            completedAt: schema_js_1.taskOccurrenceMembers.completedAt,
            userName: schema_js_1.user.name,
            userImage: schema_js_1.user.image,
        })
            .from(schema_js_1.taskOccurrenceMembers)
            .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.userId, schema_js_1.user.id))
            .where((0, drizzle_orm_1.inArray)(schema_js_1.taskOccurrenceMembers.occurrenceId, occurrenceIds))
        : [];
    // Group occurrence members by occurrenceId
    const membersByOccId = new Map();
    members.forEach((m) => {
        const list = membersByOccId.get(m.occurrenceId) || [];
        list.push(m);
        membersByOccId.set(m.occurrenceId, list);
    });
    // Group occurrences by taskId
    const occsByTaskId = new Map();
    occurrences.forEach((o) => {
        const occWithMembers = {
            ...o,
            members: membersByOccId.get(o.id) || [],
        };
        const list = occsByTaskId.get(o.taskId) || [];
        list.push(occWithMembers);
        occsByTaskId.set(o.taskId, list);
    });
    // Fetch rotation states for these tasks
    const rotationStates = await index_js_1.db
        .select()
        .from(schema_js_1.taskRotationState)
        .where((0, drizzle_orm_1.inArray)(schema_js_1.taskRotationState.taskId, taskIds));
    const rotMap = new Map();
    rotationStates.forEach((rs) => rotMap.set(rs.taskId, rs.currentMemberIndex));
    // Fetch flat members ordered by joinedAt for fair rotation
    const flatMembersList = await index_js_1.db
        .select({
        id: schema_js_1.user.id,
        name: schema_js_1.user.name,
        image: schema_js_1.user.image,
    })
        .from(schema_js_1.flatMembers)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, schema_js_1.user.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId))
        .orderBy((0, drizzle_orm_1.asc)(schema_js_1.flatMembers.joinedAt));
    // Attach latest occurrence and nextAssignee to each task
    const enrichedTasks = flatTasks.map((task) => {
        const taskOccs = occsByTaskId.get(task.id) || [];
        const latestOccurrence = taskOccs[0] || null;
        let nextAssignee = null;
        if (task.recurrence !== 'once' && flatMembersList.length > 0) {
            const rotIdx = (rotMap.get(task.id) || 0) % flatMembersList.length;
            nextAssignee = flatMembersList[rotIdx];
        }
        return {
            ...task,
            occurrences: taskOccs,
            currentOccurrence: latestOccurrence,
            nextAssignee,
        };
    });
    res.json({ tasks: enrichedTasks });
});
// Create a task
exports.tasksRouter.post('/', auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(tasks_js_1.createTaskSchema), async (req, res) => {
    const { flatId, title, category, description, peopleRequired, recurrence, customRecurrenceConfig, assigneeIds, occurrenceDate, } = req.body;
    const userId = req.user.id;
    const todayStr = occurrenceDate || new Date().toISOString().split('T')[0];
    // 1. Create task
    const [newTask] = await index_js_1.db
        .insert(schema_js_1.tasks)
        .values({
        flatId,
        title,
        category,
        description,
        peopleRequired: peopleRequired || assigneeIds.length,
        recurrence,
        customRecurrenceConfig: recurrence === 'custom' ? (customRecurrenceConfig || null) : null,
        createdBy: userId,
        active: true,
    })
        .returning();
    // 2. Create first occurrence
    const [newOccurrence] = await index_js_1.db
        .insert(schema_js_1.taskOccurrences)
        .values({
        taskId: newTask.id,
        occurrenceDate: todayStr,
        status: 'pending',
    })
        .returning();
    // 3. Assign members to occurrence
    const memberValues = assigneeIds.map((assigneeId) => ({
        occurrenceId: newOccurrence.id,
        userId: assigneeId,
        status: 'assigned',
    }));
    await index_js_1.db.insert(schema_js_1.taskOccurrenceMembers).values(memberValues);
    // Initialize task rotation state for recurring tasks
    if (recurrence !== 'once') {
        const allMembers = await index_js_1.db
            .select({ userId: schema_js_1.flatMembers.userId })
            .from(schema_js_1.flatMembers)
            .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId))
            .orderBy((0, drizzle_orm_1.asc)(schema_js_1.flatMembers.joinedAt));
        let nextIndex = 1;
        if (allMembers.length > 0 && assigneeIds.length > 0) {
            const foundIdx = allMembers.findIndex((m) => m.userId === assigneeIds[0]);
            if (foundIdx !== -1) {
                nextIndex = (foundIdx + 1) % allMembers.length;
            }
        }
        await index_js_1.db.insert(schema_js_1.taskRotationState).values({
            taskId: newTask.id,
            currentMemberIndex: nextIndex,
        });
    }
    // 4. Log activity
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
        .values({
        flatId,
        actorId: userId,
        type: 'task_created',
        referenceId: newTask.id,
        metadata: {
            taskTitle: title,
            category,
            recurrence,
            peopleRequired: peopleRequired || assigneeIds.length,
        },
    })
        .returning();
    // 5. Broadcast realtime event
    try {
        const io = (0, index_js_2.getIO)();
        (0, handlers_js_1.broadcastActivityEvent)(io, flatId, {
            ...activity,
            actor: { id: req.user.id, name: req.user.name, image: req.user.image },
        });
    }
    catch (_) { }
    // Send push notification to assignees
    if (assigneeIds && assigneeIds.length > 0) {
        (0, push_js_1.sendPushNotification)(assigneeIds, {
            title: `Task Duty: ${newTask.title}`,
            body: `You're on ${newTask.category} duty today!`,
            data: { type: 'task', taskId: newTask.id },
        });
    }
    res.status(201).json({
        task: newTask,
        occurrence: newOccurrence,
    });
});
// Complete an occurrence for the authenticated user
exports.tasksRouter.patch('/occurrences/:id/complete', auth_guard_js_1.requireAuth, async (req, res) => {
    const occurrenceId = String(req.params.id);
    const userId = req.user.id;
    // Find occurrence and task
    const [occ] = await index_js_1.db
        .select({
        id: schema_js_1.taskOccurrences.id,
        taskId: schema_js_1.taskOccurrences.taskId,
        occurrenceDate: schema_js_1.taskOccurrences.occurrenceDate,
        status: schema_js_1.taskOccurrences.status,
        flatId: schema_js_1.tasks.flatId,
        taskTitle: schema_js_1.tasks.title,
        recurrence: schema_js_1.tasks.recurrence,
        customRecurrenceConfig: schema_js_1.tasks.customRecurrenceConfig,
        peopleRequired: schema_js_1.tasks.peopleRequired,
    })
        .from(schema_js_1.taskOccurrences)
        .innerJoin(schema_js_1.tasks, (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.taskId, schema_js_1.tasks.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.id, occurrenceId));
    if (!occ) {
        res.status(404).json({ error: 'Task occurrence not found' });
        return;
    }
    // Update the occurrence member's status
    const [updatedMember] = await index_js_1.db
        .update(schema_js_1.taskOccurrenceMembers)
        .set({
        status: 'completed',
        completedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.occurrenceId, occurrenceId), (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.userId, userId)))
        .returning();
    if (!updatedMember) {
        res.status(400).json({ error: 'You are not assigned to this task occurrence or already completed' });
        return;
    }
    // Check if ALL members assigned to this occurrence have now completed
    const allMembers = await index_js_1.db
        .select({ status: schema_js_1.taskOccurrenceMembers.status })
        .from(schema_js_1.taskOccurrenceMembers)
        .where((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.occurrenceId, occurrenceId));
    const isFullyDone = allMembers.every((m) => m.status === 'completed');
    if (isFullyDone) {
        await index_js_1.db
            .update(schema_js_1.taskOccurrences)
            .set({ status: 'done' })
            .where((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.id, occurrenceId));
        // Generate next occurrence for recurring task
        if (occ.recurrence !== 'once') {
            const nextDate = computeNextOccurrenceDate(occ.recurrence, occ.customRecurrenceConfig, occ.occurrenceDate);
            if (nextDate) {
                const [existingNext] = await index_js_1.db
                    .select({ id: schema_js_1.taskOccurrences.id })
                    .from(schema_js_1.taskOccurrences)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.taskId, occ.taskId), (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.occurrenceDate, nextDate)));
                if (!existingNext) {
                    const [newOcc] = await index_js_1.db
                        .insert(schema_js_1.taskOccurrences)
                        .values({
                        taskId: occ.taskId,
                        occurrenceDate: nextDate,
                        status: 'pending',
                    })
                        .returning();
                    const flatMembersList = await index_js_1.db
                        .select({ userId: schema_js_1.flatMembers.userId })
                        .from(schema_js_1.flatMembers)
                        .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, occ.flatId))
                        .orderBy((0, drizzle_orm_1.asc)(schema_js_1.flatMembers.joinedAt));
                    if (flatMembersList.length > 0) {
                        const [rotState] = await index_js_1.db
                            .select()
                            .from(schema_js_1.taskRotationState)
                            .where((0, drizzle_orm_1.eq)(schema_js_1.taskRotationState.taskId, occ.taskId));
                        const curIdx = rotState ? rotState.currentMemberIndex : 0;
                        const peopleReq = Math.min(occ.peopleRequired || 1, flatMembersList.length);
                        const nextAssigneeIds = [];
                        for (let i = 0; i < peopleReq; i++) {
                            const assignedUser = flatMembersList[(curIdx + i) % flatMembersList.length];
                            nextAssigneeIds.push(assignedUser.userId);
                        }
                        const newMemberValues = nextAssigneeIds.map((uId) => ({
                            occurrenceId: newOcc.id,
                            userId: uId,
                            status: 'assigned',
                        }));
                        await index_js_1.db.insert(schema_js_1.taskOccurrenceMembers).values(newMemberValues);
                        const newIndex = (curIdx + peopleReq) % flatMembersList.length;
                        if (rotState) {
                            await index_js_1.db
                                .update(schema_js_1.taskRotationState)
                                .set({ currentMemberIndex: newIndex, updatedAt: new Date() })
                                .where((0, drizzle_orm_1.eq)(schema_js_1.taskRotationState.taskId, occ.taskId));
                        }
                        else {
                            await index_js_1.db.insert(schema_js_1.taskRotationState).values({
                                taskId: occ.taskId,
                                currentMemberIndex: newIndex,
                            });
                        }
                    }
                }
            }
        }
    }
    else {
        await index_js_1.db
            .update(schema_js_1.taskOccurrences)
            .set({ status: 'in_progress' })
            .where((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.id, occurrenceId));
    }
    // Activity Log
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
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
        const io = (0, index_js_2.getIO)();
        (0, handlers_js_1.broadcastTaskCompleted)(io, occ.flatId, {
            occurrenceId,
            userId,
            taskTitle: occ.taskTitle,
            userName: req.user.name,
            isFullyDone,
        });
        (0, handlers_js_1.broadcastActivityEvent)(io, occ.flatId, {
            ...activity,
            actor: { id: req.user.id, name: req.user.name, image: req.user.image },
        });
    }
    catch (_) { }
    res.json({
        message: 'Task completion marked',
        isFullyDone,
        updatedMember,
    });
});
// Skip turn for current task occurrence (passes turn to next member in fair rotation)
exports.tasksRouter.patch('/occurrences/:id/skip-turn', auth_guard_js_1.requireAuth, async (req, res) => {
    const occurrenceId = String(req.params.id);
    const userId = req.user.id;
    const { reason } = req.body || {};
    // 1. Verify occurrence and task
    const [occ] = await index_js_1.db
        .select({
        id: schema_js_1.taskOccurrences.id,
        taskId: schema_js_1.taskOccurrences.taskId,
        status: schema_js_1.taskOccurrences.status,
        flatId: schema_js_1.tasks.flatId,
        taskTitle: schema_js_1.tasks.title,
    })
        .from(schema_js_1.taskOccurrences)
        .innerJoin(schema_js_1.tasks, (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.taskId, schema_js_1.tasks.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.id, occurrenceId));
    if (!occ) {
        res.status(404).json({ error: 'Task occurrence not found' });
        return;
    }
    // 2. Verify caller is assigned to this occurrence
    const [myAssignment] = await index_js_1.db
        .select()
        .from(schema_js_1.taskOccurrenceMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.occurrenceId, occurrenceId), (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.userId, userId)));
    if (!myAssignment) {
        res.status(403).json({ error: 'You are not assigned to this task occurrence' });
        return;
    }
    if (myAssignment.status === 'completed') {
        res.status(400).json({ error: 'Cannot skip an already completed task' });
        return;
    }
    // 3. Get all flat members sorted by joinedAt
    const members = await index_js_1.db
        .select({
        userId: schema_js_1.flatMembers.userId,
        name: schema_js_1.user.name,
        image: schema_js_1.user.image,
    })
        .from(schema_js_1.flatMembers)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, schema_js_1.user.id))
        .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, occ.flatId))
        .orderBy((0, drizzle_orm_1.asc)(schema_js_1.flatMembers.joinedAt));
    if (members.length <= 1) {
        res.status(400).json({ error: 'Cannot skip turn: no other members in flat' });
        return;
    }
    // 4. Get or initialize task_rotation_state
    const [rotState] = await index_js_1.db
        .select()
        .from(schema_js_1.taskRotationState)
        .where((0, drizzle_orm_1.eq)(schema_js_1.taskRotationState.taskId, occ.taskId));
    let nextIndex = rotState ? rotState.currentMemberIndex : 0;
    let nextMember = members[nextIndex % members.length];
    if (nextMember.userId === userId) {
        nextIndex = (nextIndex + 1) % members.length;
        nextMember = members[nextIndex];
    }
    // 5. Update assignment in task_occurrence_members
    await index_js_1.db
        .update(schema_js_1.taskOccurrenceMembers)
        .set({
        userId: nextMember.userId,
        status: 'assigned',
        completedAt: null,
    })
        .where((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.id, myAssignment.id));
    // 6. Advance rotation pointer to next person so rotation remains fair
    const newPointer = (nextIndex + 1) % members.length;
    if (rotState) {
        await index_js_1.db
            .update(schema_js_1.taskRotationState)
            .set({ currentMemberIndex: newPointer, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_js_1.taskRotationState.id, rotState.id));
    }
    else {
        await index_js_1.db.insert(schema_js_1.taskRotationState).values({
            taskId: occ.taskId,
            currentMemberIndex: newPointer,
        });
    }
    // 7. Log to activity_log
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
        .values({
        flatId: occ.flatId,
        actorId: userId,
        type: 'task_skipped',
        referenceId: occ.taskId,
        metadata: {
            taskTitle: occ.taskTitle,
            skippedByName: req.user.name,
            passedToName: nextMember.name,
            passedToUserId: nextMember.userId,
            reason: reason ? String(reason).trim() : null,
        },
    })
        .returning();
    // 8. Broadcast realtime event
    try {
        const io = (0, index_js_2.getIO)();
        (0, handlers_js_1.broadcastActivityEvent)(io, occ.flatId, {
            ...activity,
            actor: { id: req.user.id, name: req.user.name, image: req.user.image },
        });
        io.to(`flat:${occ.flatId}`).emit('task_updated', {
            occurrenceId,
            taskId: occ.taskId,
            reassignedTo: nextMember,
        });
    }
    catch (_) { }
    // 9. Push notification
    (0, push_js_1.sendPushNotification)([nextMember.userId], {
        title: `Kaam Passed to You: ${occ.taskTitle}`,
        body: `${req.user.name} passed their turn to you.${reason ? ` Reason: "${reason}"` : ''}`,
        data: { type: 'task', taskId: occ.taskId, occurrenceId },
    });
    res.json({
        message: `Turn passed to ${nextMember.name}`,
        passedTo: nextMember,
        occurrenceId,
    });
});
// GET /api/tasks/:id/rotation-history
exports.tasksRouter.get('/:id/rotation-history', auth_guard_js_1.requireAuth, async (req, res) => {
    const taskId = String(req.params.id);
    const pastOccurrences = await index_js_1.db
        .select({
        id: schema_js_1.taskOccurrences.id,
        occurrenceDate: schema_js_1.taskOccurrences.occurrenceDate,
        status: schema_js_1.taskOccurrences.status,
        createdAt: schema_js_1.taskOccurrences.createdAt,
    })
        .from(schema_js_1.taskOccurrences)
        .where((0, drizzle_orm_1.eq)(schema_js_1.taskOccurrences.taskId, taskId))
        .orderBy((0, drizzle_orm_1.desc)(schema_js_1.taskOccurrences.occurrenceDate))
        .limit(10);
    if (pastOccurrences.length === 0) {
        res.json({ history: [] });
        return;
    }
    const occIds = pastOccurrences.map((o) => o.id);
    const members = await index_js_1.db
        .select({
        occurrenceId: schema_js_1.taskOccurrenceMembers.occurrenceId,
        userId: schema_js_1.taskOccurrenceMembers.userId,
        userName: schema_js_1.user.name,
        userImage: schema_js_1.user.image,
        status: schema_js_1.taskOccurrenceMembers.status,
        completedAt: schema_js_1.taskOccurrenceMembers.completedAt,
    })
        .from(schema_js_1.taskOccurrenceMembers)
        .innerJoin(schema_js_1.user, (0, drizzle_orm_1.eq)(schema_js_1.taskOccurrenceMembers.userId, schema_js_1.user.id))
        .where((0, drizzle_orm_1.inArray)(schema_js_1.taskOccurrenceMembers.occurrenceId, occIds));
    const membersByOcc = new Map();
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
});
// DELETE /api/tasks/:id
exports.tasksRouter.delete('/:id', auth_guard_js_1.requireAuth, async (req, res) => {
    const taskId = String(req.params.id);
    const userId = req.user.id;
    // 1. Fetch task
    const [task] = await index_js_1.db
        .select({
        id: schema_js_1.tasks.id,
        flatId: schema_js_1.tasks.flatId,
        title: schema_js_1.tasks.title,
        createdBy: schema_js_1.tasks.createdBy,
    })
        .from(schema_js_1.tasks)
        .where((0, drizzle_orm_1.eq)(schema_js_1.tasks.id, taskId));
    if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    // 2. Fetch user's role in the flat
    const [membership] = await index_js_1.db
        .select({ role: schema_js_1.flatMembers.role })
        .from(schema_js_1.flatMembers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, task.flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, userId)));
    if (!membership) {
        res.status(403).json({ error: 'You are not a member of this flat' });
        return;
    }
    const isCreator = task.createdBy === userId;
    const isAdmin = membership.role === 'admin';
    if (!isCreator && !isAdmin) {
        res.status(403).json({ error: 'Only the task creator or a flat admin can delete this Kaam' });
        return;
    }
    // 3. Log activity before deleting (snapshotting title into metadata)
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
        .values({
        flatId: task.flatId,
        actorId: userId,
        type: 'task_deleted',
        referenceId: task.id,
        metadata: {
            taskTitle: task.title,
        },
    })
        .returning();
    // 4. Delete the task (cascades to task_occurrences, task_occurrence_members, task_rotation_state)
    await index_js_1.db.delete(schema_js_1.tasks).where((0, drizzle_orm_1.eq)(schema_js_1.tasks.id, taskId));
    // 5. Broadcast realtime events
    try {
        const io = (0, index_js_2.getIO)();
        (0, handlers_js_1.broadcastTaskDeleted)(io, task.flatId, {
            taskId: task.id,
            taskTitle: task.title,
        });
        (0, handlers_js_1.broadcastActivityEvent)(io, task.flatId, {
            ...activity,
            actor: { id: req.user.id, name: req.user.name, image: req.user.image },
        });
    }
    catch (_) { }
    res.json({ success: true, message: 'Kaam deleted successfully' });
});
