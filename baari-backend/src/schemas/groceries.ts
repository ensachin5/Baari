import { z } from 'zod';

export const createGroceryItemSchema = z.object({
  flatId: z.string().uuid(),
  itemName: z.string().min(1, 'Item name is required').max(100, 'Item name too long'),
});
