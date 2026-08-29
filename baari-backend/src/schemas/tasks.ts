import { z } from 'zod';

export const createTaskSchema = z.object({
  flatId: z.string().uuid('Invalid flat ID'),
  title: z.string().min(2, 'Title is required').max(100),
  category: z.enum(['water', 'garbage', 'chore', 'custom']),
  description: z.string().max(500).optional(),
  peopleRequired: z.number().int().min(1).default(1),
  recurrence: z.enum(['once', 'daily', 'weekly']),
  assigneeIds: z.array(z.string().uuid()).min(1, 'At least one assignee is required'),
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
});

export const completeOccurrenceSchema = z.object({
  occurrenceId: z.string().uuid('Invalid occurrence ID'),
});
