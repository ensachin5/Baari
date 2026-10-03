import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  flatId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  body: z.string().min(1, 'Body is required'),
  pinned: z.boolean().optional(),
});
