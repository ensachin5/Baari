import { z } from 'zod';

export const splitItemSchema = z.object({
  userId: z.string().uuid(),
  amountOwed: z.number().positive('Split amount must be greater than 0'),
});

export const createExpenseSchema = z.object({
  flatId: z.string().uuid('Invalid flat ID'),
  title: z.string().min(2, 'Title is required').max(100),
  amount: z.number().positive('Amount must be greater than 0'),
  category: z.string().optional().default('General'),
  splitType: z.enum(['equal', 'exact', 'percentage']).default('equal'),
  splits: z.array(splitItemSchema).min(1, 'At least one participant is required'),
});

export const createSettlementSchema = z.object({
  flatId: z.string().uuid('Invalid flat ID'),
  paidTo: z.string().uuid('Invalid payee user ID'),
  amount: z.number().positive('Settlement amount must be positive'),
  note: z.string().max(200).optional(),
});
