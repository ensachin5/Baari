import { z } from 'zod';

export const customRecurrenceConfigSchema = z.union([
  z.object({
    type: z.literal('specific_days'),
    days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).min(1, 'Select at least one day'),
  }),
  z.object({
    type: z.literal('interval'),
    everyNDays: z.number().int().min(1, 'Interval must be at least 1 day').max(365),
  }),
]);

export const customRotationGroupSchema = z.object({
  groupOrder: z.number().int().min(1),
  userIds: z.array(z.string().uuid()).min(1, 'Group must have at least one member'),
});

export const createTaskSchema = z.object({
  flatId: z.string().uuid('Invalid flat ID'),
  title: z.string().min(2, 'Title is required').max(100),
  category: z.enum(['water', 'garbage', 'chore', 'custom']),
  description: z.string().max(500).optional(),
  peopleRequired: z.number().int().min(1).default(1),
  recurrence: z.enum(['once', 'daily', 'weekly', 'custom']),
  customRecurrenceConfig: customRecurrenceConfigSchema.optional().nullable(),
  assignmentMode: z.enum(['auto_rotate', 'custom_rotation']).default('auto_rotate'),
  customRotationPool: z.array(z.string().uuid()).optional().nullable(),
  customRotationGroupSize: z.number().int().min(1).default(1),
  customRotationGroups: z.array(customRotationGroupSchema).optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).min(1, 'At least one assignee is required'),
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
});

export const completeOccurrenceSchema = z.object({
  occurrenceId: z.string().uuid('Invalid occurrence ID'),
});
