"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSettlementSchema = exports.createExpenseSchema = exports.splitItemSchema = void 0;
const zod_1 = require("zod");
exports.splitItemSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    amountOwed: zod_1.z.number().positive('Split amount must be greater than 0'),
});
exports.createExpenseSchema = zod_1.z.object({
    flatId: zod_1.z.string().uuid('Invalid flat ID'),
    title: zod_1.z.string().min(2, 'Title is required').max(100),
    amount: zod_1.z.number().positive('Amount must be greater than 0'),
    category: zod_1.z.string().optional().default('General'),
    splitType: zod_1.z.enum(['equal', 'exact', 'percentage']).default('equal'),
    splits: zod_1.z.array(exports.splitItemSchema).min(1, 'At least one participant is required'),
    isRecurring: zod_1.z.boolean().optional().default(false),
    recurrenceInterval: zod_1.z.enum(['weekly', 'monthly']).optional(),
});
exports.createSettlementSchema = zod_1.z.object({
    flatId: zod_1.z.string().uuid('Invalid flat ID'),
    paidTo: zod_1.z.string().uuid('Invalid payee user ID'),
    amount: zod_1.z.number().positive('Settlement amount must be positive'),
    note: zod_1.z.string().max(200).optional(),
});
