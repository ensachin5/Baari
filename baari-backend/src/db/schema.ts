import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  date,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth-schema.js';

// Enums
export const flatMemberRole = pgEnum('flat_member_role', ['admin', 'member']);
export const taskCategory = pgEnum('task_category', ['water', 'garbage', 'chore', 'custom']);
export const taskRecurrence = pgEnum('task_recurrence', ['once', 'daily', 'weekly', 'custom']);
export const occurrenceStatus = pgEnum('occurrence_status', ['pending', 'in_progress', 'done', 'missed']);
export const occurrenceMemberStatus = pgEnum('occurrence_member_status', ['assigned', 'completed']);
export const activityType = pgEnum('activity_type', [
  'task_created',
  'task_completed',
  'task_missed',
  'task_skipped',
  'expense_added',
  'settlement',
  'settlement_confirmed',
  'member_joined',
]);
export const pushDeviceType = pgEnum('push_device_type', ['ios', 'android']);
export const settlementStatus = pgEnum('settlement_status', ['pending', 'confirmed', 'rejected']);
export const expenseRecurrence = pgEnum('expense_recurrence', ['weekly', 'monthly']);

// 1. flats
export const flats = pgTable('flats', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdBy: uuid('created_by')
    .references(() => user.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. flat_members
export const flatMembers = pgTable(
  'flat_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    flatId: uuid('flat_id')
      .references(() => flats.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    role: flatMemberRole('role').default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_flat_members_flat_id').on(table.flatId),
    index('idx_flat_members_user_id').on(table.userId),
  ]
);

// 3. tasks (Kaam definitions)
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  flatId: uuid('flat_id')
    .references(() => flats.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  category: taskCategory('category').notNull(),
  description: text('description'),
  peopleRequired: integer('people_required').default(1).notNull(),
  recurrence: taskRecurrence('recurrence').notNull(),
  customRecurrenceConfig: jsonb('custom_recurrence_config').$type<
    | { type: 'specific_days'; days: string[] }
    | { type: 'interval'; everyNDays: number }
  >(),
  createdBy: uuid('created_by')
    .references(() => user.id)
    .notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. task_occurrences
export const taskOccurrences = pgTable(
  'task_occurrences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    taskId: uuid('task_id')
      .references(() => tasks.id, { onDelete: 'cascade' })
      .notNull(),
    occurrenceDate: date('occurrence_date').notNull(),
    status: occurrenceStatus('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_task_occurrences_task_id').on(table.taskId)]
);

// 5. task_occurrence_members
export const taskOccurrenceMembers = pgTable(
  'task_occurrence_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    occurrenceId: uuid('occurrence_id')
      .references(() => taskOccurrences.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => user.id)
      .notNull(),
    status: occurrenceMemberStatus('status').default('assigned').notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [index('idx_task_occ_members_occ_id').on(table.occurrenceId)]
);

// 5b. task_rotation_state (for fair round-robin chore assignment)
export const taskRotationState = pgTable('task_rotation_state', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  currentMemberIndex: integer('current_member_index').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. messages (group chat)
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    flatId: uuid('flat_id')
      .references(() => flats.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: uuid('sender_id')
      .references(() => user.id)
      .notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_messages_flat_id').on(table.flatId)]
);

// 6b. message_reads
export const messageReads = pgTable(
  'message_reads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    messageId: uuid('message_id')
      .references(() => messages.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    readAt: timestamp('read_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_message_reads_message_id').on(table.messageId),
    uniqueIndex('idx_message_reads_message_user').on(table.messageId, table.userId),
  ]
);

// 7. expenses
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    flatId: uuid('flat_id')
      .references(() => flats.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    paidBy: uuid('paid_by')
      .references(() => user.id)
      .notNull(),
    category: text('category'),
    isRecurring: boolean('is_recurring').default(false).notNull(),
    recurrenceInterval: expenseRecurrence('recurrence_interval'),
    parentExpenseId: uuid('parent_expense_id'),
    isEdited: boolean('is_edited').default(false).notNull(),
    editedAt: timestamp('edited_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_expenses_flat_id').on(table.flatId)]
);

// 8. expense_splits
export const expenseSplits = pgTable('expense_splits', {
  id: uuid('id').defaultRandom().primaryKey(),
  expenseId: uuid('expense_id')
    .references(() => expenses.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => user.id)
    .notNull(),
  amountOwed: numeric('amount_owed', { precision: 12, scale: 2 }).notNull(),
  isSettled: boolean('is_settled').default(false).notNull(),
});

// 8b. expense_comments
export const expenseComments = pgTable(
  'expense_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    expenseId: uuid('expense_id')
      .references(() => expenses.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => user.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_expense_comments_expense_id').on(table.expenseId)]
);

// 9. settlements
export const settlements = pgTable(
  'settlements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    flatId: uuid('flat_id')
      .references(() => flats.id, { onDelete: 'cascade' })
      .notNull(),
    paidBy: uuid('paid_by')
      .references(() => user.id)
      .notNull(),
    paidTo: uuid('paid_to')
      .references(() => user.id)
      .notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    note: text('note'),
    status: settlementStatus('status').default('pending').notNull(),
    confirmedAt: timestamp('confirmed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_settlements_flat_id').on(table.flatId)]
);

// 10. activity_log
export const activityLog = pgTable(
  'activity_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    flatId: uuid('flat_id')
      .references(() => flats.id, { onDelete: 'cascade' })
      .notNull(),
    actorId: uuid('actor_id')
      .references(() => user.id)
      .notNull(),
    type: activityType('type').notNull(),
    referenceId: uuid('reference_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_activity_log_flat_id').on(table.flatId)]
);

// 11. push_tokens
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  token: text('token').notNull(),
  deviceType: pushDeviceType('device_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. quick_pick_presets (per-flat customizable chore templates)
export const quickPickPresets = pgTable(
  'quick_pick_presets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    flatId: uuid('flat_id')
      .references(() => flats.id, { onDelete: 'cascade' })
      .notNull(),
    label: text('label').notNull(),
    title: text('title').notNull(),
    category: taskCategory('category').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_quick_pick_presets_flat_id').on(table.flatId)]
);

// Relations
export const flatsRelations = relations(flats, ({ one, many }) => ({
  creator: one(user, { fields: [flats.createdBy], references: [user.id] }),
  members: many(flatMembers),
  tasks: many(tasks),
  messages: many(messages),
  expenses: many(expenses),
  settlements: many(settlements),
  activities: many(activityLog),
  quickPickPresets: many(quickPickPresets),
}));

export const quickPickPresetsRelations = relations(quickPickPresets, ({ one }) => ({
  flat: one(flats, { fields: [quickPickPresets.flatId], references: [flats.id] }),
}));

export const flatMembersRelations = relations(flatMembers, ({ one }) => ({
  flat: one(flats, { fields: [flatMembers.flatId], references: [flats.id] }),
  user: one(user, { fields: [flatMembers.userId], references: [user.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  flat: one(flats, { fields: [tasks.flatId], references: [flats.id] }),
  creator: one(user, { fields: [tasks.createdBy], references: [user.id] }),
  occurrences: many(taskOccurrences),
  rotationState: one(taskRotationState, { fields: [tasks.id], references: [taskRotationState.taskId] }),
}));

export const taskOccurrencesRelations = relations(taskOccurrences, ({ one, many }) => ({
  task: one(tasks, { fields: [taskOccurrences.taskId], references: [tasks.id] }),
  members: many(taskOccurrenceMembers),
}));

export const taskOccurrenceMembersRelations = relations(taskOccurrenceMembers, ({ one }) => ({
  occurrence: one(taskOccurrences, {
    fields: [taskOccurrenceMembers.occurrenceId],
    references: [taskOccurrences.id],
  }),
  user: one(user, { fields: [taskOccurrenceMembers.userId], references: [user.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  flat: one(flats, { fields: [messages.flatId], references: [flats.id] }),
  sender: one(user, { fields: [messages.senderId], references: [user.id] }),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  flat: one(flats, { fields: [expenses.flatId], references: [flats.id] }),
  payer: one(user, { fields: [expenses.paidBy], references: [user.id] }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
  user: one(user, { fields: [expenseSplits.userId], references: [user.id] }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  flat: one(flats, { fields: [settlements.flatId], references: [flats.id] }),
  payer: one(user, { fields: [settlements.paidBy], references: [user.id] }),
  payee: one(user, { fields: [settlements.paidTo], references: [user.id] }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  flat: one(flats, { fields: [activityLog.flatId], references: [flats.id] }),
  actor: one(user, { fields: [activityLog.actorId], references: [user.id] }),
}));

export { user, session, account, verification } from './auth-schema.js';
