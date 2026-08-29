import { z } from 'zod';

export const sendMessageSchema = z.object({
  flatId: z.string().uuid(),
  content: z.string().min(1, 'Message content cannot be empty').max(2000, 'Message too long'),
});
