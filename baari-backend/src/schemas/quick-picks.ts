import { z } from 'zod';

export const createQuickPickSchema = z.object({
  flatId: z.string().uuid('Invalid flat ID'),
  label: z.string().min(1, 'Label is required').max(50),
  title: z.string().min(1, 'Title is required').max(100),
  category: z.enum(['water', 'garbage', 'chore', 'custom']),
  sortOrder: z.number().int().optional(),
});

export const updateQuickPickSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(100).optional(),
  category: z.enum(['water', 'garbage', 'chore', 'custom']).optional(),
  sortOrder: z.number().int().optional(),
});
