import { z } from 'zod';

export const createFlatSchema = z.object({
  name: z.string().min(2, 'Flat name must be at least 2 characters').max(50),
  type: z.enum(['flat', 'pg', 'hostel']).optional().default('flat'),
});

export const joinFlatSchema = z.object({
  inviteCode: z.string().min(4, 'Invalid invite code').max(20).trim(),
});
