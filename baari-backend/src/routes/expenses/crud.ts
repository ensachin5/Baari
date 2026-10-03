import { Router, Response } from 'express';
import { db } from '../../db/index.js';
import {
  expenses,
  expenseSplits,
  expenseComments,
  flatMembers,
  user,
  activityLog,
} from '../../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth-guard.js';
import { validate } from '../../middleware/validate.js';
import { createExpenseSchema } from '../../schemas/expenses.js';
import { eq, and, desc, inArray, ilike } from 'drizzle-orm';
import { getIO } from '../../sockets/index.js';
import { broadcastActivityEvent } from '../../sockets/handlers.js';
import { sendPushNotification } from '../../services/push.js';
import { logger } from '../../middleware/error-handler.js';
import { isFlatMember } from '../../utils/index.js';

export const crudRouter = Router();

// GET /api/expenses?flatId=&category=&search=
crudRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;

  if (!flatId) {
    res.status(400).json({ error: 'flatId query param is required' });
    return;
  }

  if (!(await isFlatMember(flatId, req.user!.id))) {
    res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
    return;
  }

  const conditions = [eq(expenses.flatId, flatId)];
  if (category && category !== 'All') {
    conditions.push(eq(expenses.category, category));
  }
  if (search && search.trim()) {
    conditions.push(ilike(expenses.title, `%${search.trim()}%`));
  }

  const flatExpenses = await db
    .select({
      id: expenses.id,
      flatId: expenses.flatId,
      title: expenses.title,
      amount: expenses.amount,
      paidBy: expenses.paidBy,
      category: expenses.category,
      isRecurring: expenses.isRecurring,
      recurrenceInterval: expenses.recurrenceInterval,
      isEdited: expenses.isEdited,
      editedAt: expenses.editedAt,
      createdAt: expenses.createdAt,
      payerName: user.name,
      payerImage: user.image,
    })
    .from(expenses)
    .innerJoin(user, eq(expenses.paidBy, user.id))
    .where(and(...conditions))
    .orderBy(desc(expenses.createdAt));

  if (flatExpenses.length === 0) {
    res.json({ expenses: [] });
    return;
  }

  const expenseIds = flatExpenses.map((e) => e.id);

  // Fetch splits
  const splits = await db
    .select({
      id: expenseSplits.id,
      expenseId: expenseSplits.expenseId,
      userId: expenseSplits.userId,
      amountOwed: expenseSplits.amountOwed,
      isSettled: expenseSplits.isSettled,
      userName: user.name,
      userImage: user.image,
    })
    .from(expenseSplits)
    .innerJoin(user, eq(expenseSplits.userId, user.id))
    .where(inArray(expenseSplits.expenseId, expenseIds));

  const splitsByExpenseId = new Map<string, typeof splits>();
  splits.forEach((s) => {
    const list = splitsByExpenseId.get(s.expenseId) || [];
    list.push(s);
    splitsByExpenseId.set(s.expenseId, list);
  });

  const enrichedExpenses = flatExpenses.map((exp) => ({
    ...exp,
    splits: splitsByExpenseId.get(exp.id) || [],
  }));

  res.json({ expenses: enrichedExpenses });
});

// POST /api/expenses
crudRouter.post(
  '/',
  requireAuth,
  validate(createExpenseSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { flatId, title, amount, category, splitType, splits, isRecurring, recurrenceInterval } = req.body;
    const userId = req.user!.id;

    if (!(await isFlatMember(flatId, userId))) {
      res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
      return;
    }

    // 1. Insert expense
    const [newExpense] = await db
      .insert(expenses)
      .values({
        flatId,
        title,
        amount: amount.toString(),
        paidBy: userId,
        category: category || 'General',
        isRecurring: isRecurring || false,
        recurrenceInterval: recurrenceInterval || null,
      })
      .returning();

    // 2. Insert splits
    let splitRecords: { expenseId: string; userId: string; amountOwed: string }[] = [];
    if (splitType === 'equal') {
      const perPerson = (amount / splits.length).toFixed(2);
      splitRecords = splits.map((s: { userId: string }) => ({
        expenseId: newExpense.id,
        userId: s.userId,
        amountOwed: perPerson,
      }));
    } else {
      splitRecords = splits.map((s: { userId: string; amountOwed: number }) => ({
        expenseId: newExpense.id,
        userId: s.userId,
        amountOwed: s.amountOwed.toFixed(2),
      }));
    }

    await db.insert(expenseSplits).values(splitRecords);

    // 3. Log activity
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId,
        actorId: userId,
        type: 'expense_added',
        referenceId: newExpense.id,
        metadata: {
          title: newExpense.title,
          amount: newExpense.amount,
          category: newExpense.category,
        },
      })
      .returning();

    try {
      const io = getIO();
      broadcastActivityEvent(io, flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
    } catch (_) {}

    // Send push notification
    const participantUserIds = splits
      .map((s: { userId: string }) => s.userId)
      .filter((id: string) => id !== userId);

    if (participantUserIds.length > 0) {
      logger.info(
        {
          expenseId: newExpense.id,
          title: newExpense.title,
          amount: newExpense.amount,
          creatorId: req.user!.id,
          creatorName: req.user!.name,
          participantRecipientIds: participantUserIds,
        },
        '[Push Trigger 4: Expense Added / Settlement] Code path reached for new expense push'
      );
      sendPushNotification(participantUserIds, {
        title: 'New Expense Added',
        body: `${req.user!.name} added an expense: ${newExpense.title} (₹${newExpense.amount})`,
        data: { type: 'expense', expenseId: newExpense.id },
      });
    }

    res.status(201).json({
      expense: newExpense,
      splits: splitRecords,
    });
  }
);

// PATCH /api/expenses/:id (Edit title/amount/split - creator or flat admin only)
crudRouter.patch(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const expenseId = String(req.params.id);
    const userId = req.user!.id;
    const { title, amount, category, splits } = req.body;

    const [existing] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
    if (!existing) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    // Check if creator or admin
    const [membership] = await db
      .select({ role: flatMembers.role })
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, existing.flatId), eq(flatMembers.userId, userId)));

    const isCreator = existing.paidBy === userId;
    const isAdmin = membership?.role === 'admin';

    if (!isCreator && !isAdmin) {
      res.status(403).json({ error: 'Only the creator or a flat admin can edit this expense' });
      return;
    }

    const updateFields: any = {
      isEdited: true,
      editedAt: new Date(),
    };
    if (title) updateFields.title = title;
    if (amount) updateFields.amount = amount.toString();
    if (category) updateFields.category = category;

    const [updatedExpense] = await db
      .update(expenses)
      .set(updateFields)
      .where(eq(expenses.id, expenseId))
      .returning();

    // If new splits provided, replace
    if (splits && Array.isArray(splits)) {
      await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
      const splitRecords = splits.map((s: { userId: string; amountOwed: number }) => ({
        expenseId,
        userId: s.userId,
        amountOwed: s.amountOwed.toFixed(2),
      }));
      await db.insert(expenseSplits).values(splitRecords);
    }

    res.json({ expense: updatedExpense });
  }
);

// DELETE /api/expenses/:id (Creator or flat admin only)
crudRouter.delete(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const expenseId = String(req.params.id);
    const userId = req.user!.id;

    const [existing] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
    if (!existing) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    const [membership] = await db
      .select({ role: flatMembers.role })
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, existing.flatId), eq(flatMembers.userId, userId)));

    const isCreator = existing.paidBy === userId;
    const isAdmin = membership?.role === 'admin';

    if (!isCreator && !isAdmin) {
      res.status(403).json({ error: 'Only the creator or a flat admin can delete this expense' });
      return;
    }

    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
    await db.delete(expenseComments).where(eq(expenseComments.expenseId, expenseId));
    await db.delete(expenses).where(eq(expenses.id, expenseId));

    res.json({ success: true, message: 'Expense deleted successfully' });
  }
);

// Helper function: createNextRecurringInstance
export async function createNextRecurringInstance(expenseId: string) {
  const [parent] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!parent || !parent.isRecurring || !parent.recurrenceInterval) return null;

  const parentSplits = await db
    .select()
    .from(expenseSplits)
    .where(eq(expenseSplits.expenseId, expenseId));

  const [childExpense] = await db
    .insert(expenses)
    .values({
      flatId: parent.flatId,
      title: parent.title,
      amount: parent.amount,
      paidBy: parent.paidBy,
      category: parent.category,
      isRecurring: true,
      recurrenceInterval: parent.recurrenceInterval,
      parentExpenseId: parent.id,
    })
    .returning();

  if (parentSplits.length > 0) {
    const childSplits = parentSplits.map((ps) => ({
      expenseId: childExpense.id,
      userId: ps.userId,
      amountOwed: ps.amountOwed,
      isSettled: false,
    }));
    await db.insert(expenseSplits).values(childSplits);
  }

  return childExpense;
}
