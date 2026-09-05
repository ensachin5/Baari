"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOccurrenceSchema = exports.createTaskSchema = exports.customRotationGroupSchema = exports.customRecurrenceConfigSchema = void 0;
const zod_1 = require("zod");
exports.customRecurrenceConfigSchema = zod_1.z.union([
    zod_1.z.object({
        type: zod_1.z.literal('specific_days'),
        days: zod_1.z.array(zod_1.z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).min(1, 'Select at least one day'),
    }),
    zod_1.z.object({
        type: zod_1.z.literal('interval'),
        everyNDays: zod_1.z.number().int().min(1, 'Interval must be at least 1 day').max(365),
    }),
]);
exports.customRotationGroupSchema = zod_1.z.object({
    groupOrder: zod_1.z.number().int().min(1),
    userIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'Group must have at least one member'),
});
exports.createTaskSchema = zod_1.z.object({
    flatId: zod_1.z.string().uuid('Invalid flat ID'),
    title: zod_1.z.string().min(2, 'Title is required').max(100),
    category: zod_1.z.enum(['water', 'garbage', 'chore', 'custom']),
    description: zod_1.z.string().max(500).optional(),
    peopleRequired: zod_1.z.number().int().min(1).default(1),
    recurrence: zod_1.z.enum(['once', 'daily', 'weekly', 'custom']),
    customRecurrenceConfig: exports.customRecurrenceConfigSchema.optional().nullable(),
    assignmentMode: zod_1.z.enum(['auto_rotate', 'custom_rotation']).default('auto_rotate'),
    customRotationPool: zod_1.z.array(zod_1.z.string().uuid()).optional().nullable(),
    customRotationGroupSize: zod_1.z.number().int().min(1).default(1),
    customRotationGroups: zod_1.z.array(exports.customRotationGroupSchema).optional().nullable(),
    assigneeIds: zod_1.z.array(zod_1.z.string().uuid()).min(1, 'At least one assignee is required'),
    occurrenceDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
});
exports.completeOccurrenceSchema = zod_1.z.object({
    occurrenceId: zod_1.z.string().uuid('Invalid occurrence ID'),
});
