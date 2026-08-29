"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOccurrenceSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSchema = zod_1.z.object({
    flatId: zod_1.z.string().uuid('Invalid flat ID'),
    title: zod_1.z.string().min(2, 'Title is required').max(100),
    category: zod_1.z.enum(['water', 'garbage', 'chore', 'custom']),
    description: zod_1.z.string().max(500).optional(),
    peopleRequired: zod_1.z.number().int().min(1).default(1),
    recurrence: zod_1.z.enum(['once', 'daily', 'weekly']),
    assigneeIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'At least one assignee is required'),
    occurrenceDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
});
exports.completeOccurrenceSchema = zod_1.z.object({
    occurrenceId: zod_1.z.string().uuid('Invalid occurrence ID'),
});
