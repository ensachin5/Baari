"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const auth_guard_js_1 = require("../middleware/auth-guard.js");
const validate_js_1 = require("../middleware/validate.js");
const tasks_js_1 = require("../schemas/tasks.js");
const drizzle_orm_1 = require("drizzle-orm");
const index_js_2 = require("../sockets/index.js");
const handlers_js_1 = require("../sockets/handlers.js");
exports.tasksRouter = (0, express_1.Router)();
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
    // Attach latest occurrence to each task
    const enrichedTasks = flatTasks.map((task) => {
        const taskOccs = occsByTaskId.get(task.id) || [];
        const latestOccurrence = taskOccs[0] || null;
        return {
            ...task,
            occurrences: taskOccs,
            currentOccurrence: latestOccurrence,
        };
    });
    res.json({ tasks: enrichedTasks });
});
// Create a task
exports.tasksRouter.post('/', auth_guard_js_1.requireAuth, (0, validate_js_1.validate)(tasks_js_1.createTaskSchema), async (req, res) => {
    const { flatId, title, category, description, peopleRequired, recurrence, assigneeIds, occurrenceDate, } = req.body;
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
    // 4. Log activity
    const [activity] = await index_js_1.db
        .insert(schema_js_1.activityLog)
        .values({
        flatId,
        actorId: userId,
        type: 'task_created',
        referenceId: newTask.id,
        metadata: {
            taskTitle: newTask.title,
            category: newTask.category,
            peopleRequired: newTask.peopleRequired,
        },
    })
        .returning();
    try {
        const io = (0, index_js_2.getIO)();
        (0, handlers_js_1.broadcastActivityEvent)(io, flatId, {
            ...activity,
            actor: { id: req.user.id, name: req.user.name, image: req.user.image },
        });
    }
    catch (_) { }
    res.status(201).json({
        task: newTask,
        occurrence: newOccurrence,
    });
});
// Complete an occurrence for the authenticated user
exports.tasksRouter.patch('/occurrences/:id/complete', auth_guard_js_1.requireAuth, async (req, res) => {
    const occurrenceId = req.params.id;
    const userId = req.user.id;
    // Find occurrence and task
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
