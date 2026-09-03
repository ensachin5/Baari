"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verification = exports.account = exports.session = exports.user = exports.activityLogRelations = exports.settlementsRelations = exports.expenseSplitsRelations = exports.expensesRelations = exports.messagesRelations = exports.taskOccurrenceMembersRelations = exports.taskOccurrencesRelations = exports.tasksRelations = exports.flatMembersRelations = exports.quickPickPresetsRelations = exports.flatsRelations = exports.quickPickPresets = exports.pushTokens = exports.activityLog = exports.settlements = exports.expenseComments = exports.expenseSplits = exports.expenses = exports.messageReads = exports.messages = exports.taskRotationState = exports.taskOccurrenceMembers = exports.taskOccurrences = exports.tasks = exports.flatMembers = exports.flats = exports.expenseRecurrence = exports.settlementStatus = exports.pushDeviceType = exports.activityType = exports.occurrenceMemberStatus = exports.occurrenceStatus = exports.taskRecurrence = exports.taskCategory = exports.flatMemberRole = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const auth_schema_js_1 = require("./auth-schema.js");
// Enums
exports.flatMemberRole = (0, pg_core_1.pgEnum)('flat_member_role', ['admin', 'member']);
exports.taskCategory = (0, pg_core_1.pgEnum)('task_category', ['water', 'garbage', 'chore', 'custom']);
exports.taskRecurrence = (0, pg_core_1.pgEnum)('task_recurrence', ['once', 'daily', 'weekly', 'custom']);
exports.occurrenceStatus = (0, pg_core_1.pgEnum)('occurrence_status', ['pending', 'in_progress', 'done', 'missed']);
exports.occurrenceMemberStatus = (0, pg_core_1.pgEnum)('occurrence_member_status', ['assigned', 'completed']);
exports.activityType = (0, pg_core_1.pgEnum)('activity_type', [
    'task_created',
    'task_completed',
    'task_missed',
    'task_skipped',
    'task_deleted',
    'expense_added',
    'settlement',
    'settlement_confirmed',
    'member_joined',
]);
exports.pushDeviceType = (0, pg_core_1.pgEnum)('push_device_type', ['ios', 'android']);
exports.settlementStatus = (0, pg_core_1.pgEnum)('settlement_status', ['pending', 'confirmed', 'rejected']);
exports.expenseRecurrence = (0, pg_core_1.pgEnum)('expense_recurrence', ['weekly', 'monthly']);
// 1. flats
exports.flats = (0, pg_core_1.pgTable)('flats', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    inviteCode: (0, pg_core_1.text)('invite_code').notNull().unique(),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .references(() => auth_schema_js_1.user.id)
        .notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// 2. flat_members
exports.flatMembers = (0, pg_core_1.pgTable)('flat_members', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    flatId: (0, pg_core_1.uuid)('flat_id')
        .references(() => exports.flats.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.uuid)('user_id')
        .references(() => auth_schema_js_1.user.id, { onDelete: 'cascade' })
        .notNull(),
    role: (0, exports.flatMemberRole)('role').default('member').notNull(),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_flat_members_flat_id').on(table.flatId),
    (0, pg_core_1.index)('idx_flat_members_user_id').on(table.userId),
]);
// 3. tasks (Kaam definitions)
exports.tasks = (0, pg_core_1.pgTable)('tasks', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    flatId: (0, pg_core_1.uuid)('flat_id')
        .references(() => exports.flats.id, { onDelete: 'cascade' })
        .notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    category: (0, exports.taskCategory)('category').notNull(),
    description: (0, pg_core_1.text)('description'),
    peopleRequired: (0, pg_core_1.integer)('people_required').default(1).notNull(),
    recurrence: (0, exports.taskRecurrence)('recurrence').notNull(),
    customRecurrenceConfig: (0, pg_core_1.jsonb)('custom_recurrence_config').$type(),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .references(() => auth_schema_js_1.user.id)
        .notNull(),
    active: (0, pg_core_1.boolean)('active').default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// 4. task_occurrences
exports.taskOccurrences = (0, pg_core_1.pgTable)('task_occurrences', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    taskId: (0, pg_core_1.uuid)('task_id')
        .references(() => exports.tasks.id, { onDelete: 'cascade' })
        .notNull(),
    occurrenceDate: (0, pg_core_1.date)('occurrence_date').notNull(),
    status: (0, exports.occurrenceStatus)('status').default('pending').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)('idx_task_occurrences_task_id').on(table.taskId)]);
// 5. task_occurrence_members
exports.taskOccurrenceMembers = (0, pg_core_1.pgTable)('task_occurrence_members', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    occurrenceId: (0, pg_core_1.uuid)('occurrence_id')
        .references(() => exports.taskOccurrences.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.uuid)('user_id')
        .references(() => auth_schema_js_1.user.id)
        .notNull(),
    status: (0, exports.occurrenceMemberStatus)('status').default('assigned').notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
}, (table) => [(0, pg_core_1.index)('idx_task_occ_members_occ_id').on(table.occurrenceId)]);
// 5b. task_rotation_state (for fair round-robin chore assignment)
exports.taskRotationState = (0, pg_core_1.pgTable)('task_rotation_state', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    taskId: (0, pg_core_1.uuid)('task_id')
        .references(() => exports.tasks.id, { onDelete: 'cascade' })
        .notNull()
        .unique(),
    currentMemberIndex: (0, pg_core_1.integer)('current_member_index').default(0).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// 6. messages (group chat)
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    flatId: (0, pg_core_1.uuid)('flat_id')
        .references(() => exports.flats.id, { onDelete: 'cascade' })
        .notNull(),
    senderId: (0, pg_core_1.uuid)('sender_id')
        .references(() => auth_schema_js_1.user.id)
        .notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)('idx_messages_flat_id').on(table.flatId)]);
// 6b. message_reads
exports.messageReads = (0, pg_core_1.pgTable)('message_reads', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    messageId: (0, pg_core_1.uuid)('message_id')
        .references(() => exports.messages.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.uuid)('user_id')
        .references(() => auth_schema_js_1.user.id, { onDelete: 'cascade' })
        .notNull(),
    readAt: (0, pg_core_1.timestamp)('read_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_message_reads_message_id').on(table.messageId),
    (0, pg_core_1.uniqueIndex)('idx_message_reads_message_user').on(table.messageId, table.userId),
]);
// 7. expenses
exports.expenses = (0, pg_core_1.pgTable)('expenses', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    flatId: (0, pg_core_1.uuid)('flat_id')
        .references(() => exports.flats.id, { onDelete: 'cascade' })
        .notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    paidBy: (0, pg_core_1.uuid)('paid_by')
        .references(() => auth_schema_js_1.user.id)
        .notNull(),
    category: (0, pg_core_1.text)('category'),
    isRecurring: (0, pg_core_1.boolean)('is_recurring').default(false).notNull(),
    recurrenceInterval: (0, exports.expenseRecurrence)('recurrence_interval'),
    parentExpenseId: (0, pg_core_1.uuid)('parent_expense_id'),
    isEdited: (0, pg_core_1.boolean)('is_edited').default(false).notNull(),
    editedAt: (0, pg_core_1.timestamp)('edited_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)('idx_expenses_flat_id').on(table.flatId)]);
// 8. expense_splits
exports.expenseSplits = (0, pg_core_1.pgTable)('expense_splits', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    expenseId: (0, pg_core_1.uuid)('expense_id')
        .references(() => exports.expenses.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.uuid)('user_id')
        .references(() => auth_schema_js_1.user.id)
        .notNull(),
    amountOwed: (0, pg_core_1.numeric)('amount_owed', { precision: 12, scale: 2 }).notNull(),
    isSettled: (0, pg_core_1.boolean)('is_settled').default(false).notNull(),
});
// 8b. expense_comments
exports.expenseComments = (0, pg_core_1.pgTable)('expense_comments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    expenseId: (0, pg_core_1.uuid)('expense_id')
        .references(() => exports.expenses.id, { onDelete: 'cascade' })
        .notNull(),
    userId: (0, pg_core_1.uuid)('user_id')
        .references(() => auth_schema_js_1.user.id, { onDelete: 'cascade' })
        .notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)('idx_expense_comments_expense_id').on(table.expenseId)]);
// 9. settlements
exports.settlements = (0, pg_core_1.pgTable)('settlements', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    flatId: (0, pg_core_1.uuid)('flat_id')
        .references(() => exports.flats.id, { onDelete: 'cascade' })
        .notNull(),
    paidBy: (0, pg_core_1.uuid)('paid_by')
        .references(() => auth_schema_js_1.user.id)
        .notNull(),
    paidTo: (0, pg_core_1.uuid)('paid_to')
        .references(() => auth_schema_js_1.user.id)
        .notNull(),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    note: (0, pg_core_1.text)('note'),
    status: (0, exports.settlementStatus)('status').default('pending').notNull(),
    confirmedAt: (0, pg_core_1.timestamp)('confirmed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)('idx_settlements_flat_id').on(table.flatId)]);
// 10. activity_log
exports.activityLog = (0, pg_core_1.pgTable)('activity_log', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    flatId: (0, pg_core_1.uuid)('flat_id')
        .references(() => exports.flats.id, { onDelete: 'cascade' })
        .notNull(),
    actorId: (0, pg_core_1.uuid)('actor_id')
        .references(() => auth_schema_js_1.user.id)
        .notNull(),
    type: (0, exports.activityType)('type').notNull(),
    referenceId: (0, pg_core_1.uuid)('reference_id'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)('idx_activity_log_flat_id').on(table.flatId)]);
// 11. push_tokens
exports.pushTokens = (0, pg_core_1.pgTable)('push_tokens', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)('user_id')
        .references(() => auth_schema_js_1.user.id, { onDelete: 'cascade' })
        .notNull(),
    token: (0, pg_core_1.text)('token').notNull(),
    deviceType: (0, exports.pushDeviceType)('device_type').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// 12. quick_pick_presets (per-flat customizable chore templates)
exports.quickPickPresets = (0, pg_core_1.pgTable)('quick_pick_presets', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    flatId: (0, pg_core_1.uuid)('flat_id')
        .references(() => exports.flats.id, { onDelete: 'cascade' })
        .notNull(),
    label: (0, pg_core_1.text)('label').notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    category: (0, exports.taskCategory)('category').notNull(),
    sortOrder: (0, pg_core_1.integer)('sort_order').default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)('idx_quick_pick_presets_flat_id').on(table.flatId)]);
// Relations
exports.flatsRelations = (0, drizzle_orm_1.relations)(exports.flats, ({ one, many }) => ({
    creator: one(auth_schema_js_1.user, { fields: [exports.flats.createdBy], references: [auth_schema_js_1.user.id] }),
    members: many(exports.flatMembers),
    tasks: many(exports.tasks),
    messages: many(exports.messages),
    expenses: many(exports.expenses),
    settlements: many(exports.settlements),
    activities: many(exports.activityLog),
    quickPickPresets: many(exports.quickPickPresets),
}));
exports.quickPickPresetsRelations = (0, drizzle_orm_1.relations)(exports.quickPickPresets, ({ one }) => ({
    flat: one(exports.flats, { fields: [exports.quickPickPresets.flatId], references: [exports.flats.id] }),
}));
exports.flatMembersRelations = (0, drizzle_orm_1.relations)(exports.flatMembers, ({ one }) => ({
    flat: one(exports.flats, { fields: [exports.flatMembers.flatId], references: [exports.flats.id] }),
    user: one(auth_schema_js_1.user, { fields: [exports.flatMembers.userId], references: [auth_schema_js_1.user.id] }),
}));
exports.tasksRelations = (0, drizzle_orm_1.relations)(exports.tasks, ({ one, many }) => ({
    flat: one(exports.flats, { fields: [exports.tasks.flatId], references: [exports.flats.id] }),
    creator: one(auth_schema_js_1.user, { fields: [exports.tasks.createdBy], references: [auth_schema_js_1.user.id] }),
    occurrences: many(exports.taskOccurrences),
    rotationState: one(exports.taskRotationState, { fields: [exports.tasks.id], references: [exports.taskRotationState.taskId] }),
}));
exports.taskOccurrencesRelations = (0, drizzle_orm_1.relations)(exports.taskOccurrences, ({ one, many }) => ({
    task: one(exports.tasks, { fields: [exports.taskOccurrences.taskId], references: [exports.tasks.id] }),
    members: many(exports.taskOccurrenceMembers),
}));
exports.taskOccurrenceMembersRelations = (0, drizzle_orm_1.relations)(exports.taskOccurrenceMembers, ({ one }) => ({
    occurrence: one(exports.taskOccurrences, {
        fields: [exports.taskOccurrenceMembers.occurrenceId],
        references: [exports.taskOccurrences.id],
    }),
    user: one(auth_schema_js_1.user, { fields: [exports.taskOccurrenceMembers.userId], references: [auth_schema_js_1.user.id] }),
}));
exports.messagesRelations = (0, drizzle_orm_1.relations)(exports.messages, ({ one }) => ({
    flat: one(exports.flats, { fields: [exports.messages.flatId], references: [exports.flats.id] }),
    sender: one(auth_schema_js_1.user, { fields: [exports.messages.senderId], references: [auth_schema_js_1.user.id] }),
}));
exports.expensesRelations = (0, drizzle_orm_1.relations)(exports.expenses, ({ one, many }) => ({
    flat: one(exports.flats, { fields: [exports.expenses.flatId], references: [exports.flats.id] }),
    payer: one(auth_schema_js_1.user, { fields: [exports.expenses.paidBy], references: [auth_schema_js_1.user.id] }),
    splits: many(exports.expenseSplits),
}));
exports.expenseSplitsRelations = (0, drizzle_orm_1.relations)(exports.expenseSplits, ({ one }) => ({
    expense: one(exports.expenses, { fields: [exports.expenseSplits.expenseId], references: [exports.expenses.id] }),
    user: one(auth_schema_js_1.user, { fields: [exports.expenseSplits.userId], references: [auth_schema_js_1.user.id] }),
}));
exports.settlementsRelations = (0, drizzle_orm_1.relations)(exports.settlements, ({ one }) => ({
    flat: one(exports.flats, { fields: [exports.settlements.flatId], references: [exports.flats.id] }),
    payer: one(auth_schema_js_1.user, { fields: [exports.settlements.paidBy], references: [auth_schema_js_1.user.id] }),
    payee: one(auth_schema_js_1.user, { fields: [exports.settlements.paidTo], references: [auth_schema_js_1.user.id] }),
}));
exports.activityLogRelations = (0, drizzle_orm_1.relations)(exports.activityLog, ({ one }) => ({
    flat: one(exports.flats, { fields: [exports.activityLog.flatId], references: [exports.flats.id] }),
    actor: one(auth_schema_js_1.user, { fields: [exports.activityLog.actorId], references: [auth_schema_js_1.user.id] }),
}));
var auth_schema_js_2 = require("./auth-schema.js");
Object.defineProperty(exports, "user", { enumerable: true, get: function () { return auth_schema_js_2.user; } });
Object.defineProperty(exports, "session", { enumerable: true, get: function () { return auth_schema_js_2.session; } });
Object.defineProperty(exports, "account", { enumerable: true, get: function () { return auth_schema_js_2.account; } });
Object.defineProperty(exports, "verification", { enumerable: true, get: function () { return auth_schema_js_2.verification; } });
