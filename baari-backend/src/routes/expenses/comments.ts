import { Router, Response } from 'express';
import { db } from '../../db/index.js';
import {
  expenses,
  expenseSplits,
  expenseComments,
  user,
} from '../../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth-guard.js';
import { eq, and, asc } from 'drizzle-orm';
import { sendPushNotification } from '../../services/push.js';
import { isFlatMember } from '../../utils/index.js';

export const commentsRouter = Router();

// GET /api/expenses/:id/comments
commentsRouter.get(
  '/:id/comments',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const expenseId = String(req.params.id);

    const [expense] = await db.select({ flatId: expenses.flatId }).from(expenses).where(eq(expenses.id, expenseId));
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (!(await isFlatMember(expense.flatId, req.user!.id))) {
      res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
      return;
    }

    const comments = await db
      .select({
        id: expenseComments.id,
        expenseId: expenseComments.expenseId,
        userId: expenseComments.userId,
        content: expenseComments.content,
        createdAt: expenseComments.createdAt,
        userName: user.name,
        userImage: user.image,
      })
      .from(expenseComments)
      .innerJoin(user, eq(expenseComments.userId, user.id))
      .where(eq(expenseComments.expenseId, expenseId))
      .orderBy(asc(expenseComments.createdAt));

    res.json({ comments });
  }
);

// POST /api/expenses/:id/comments
commentsRouter.post(
  '/:id/comments',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const expenseId = String(req.params.id);
    const userId = req.user!.id;
    const { content } = req.body;

    if (!content || !String(content).trim()) {
      res.status(400).json({ error: 'Comment content cannot be empty' });
      return;
    }

    const [expense] = await db.select({ flatId: expenses.flatId }).from(expenses).where(eq(expenses.id, expenseId));
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (!(await isFlatMember(expense.flatId, userId))) {
      res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
      return;
    }

    const [newComment] = await db
      .insert(expenseComments)
      .values({
        expenseId,
        userId,
        content: String(content).trim(),
      })
      .returning();

    const [commentWithUser] = await db
      .select({
        id: expenseComments.id,
        expenseId: expenseComments.expenseId,
        userId: expenseComments.userId,
        content: expenseComments.content,
        createdAt: expenseComments.createdAt,
        userName: user.name,
        userImage: user.image,
      })
      .from(expenseComments)
      .innerJoin(user, eq(expenseComments.userId, user.id))
      .where(eq(expenseComments.id, newComment.id));

    res.status(201).json({ comment: commentWithUser });
  }
);

// POST /api/expenses/:id/remind (Push notification nudge)
commentsRouter.post(
  '/:id/remind',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const expenseId = String(req.params.id);
    const userId = req.user!.id;
    const { targetUserId } = req.body || {};

    const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (!(await isFlatMember(expense.flatId, userId))) {
      res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
      return;
    }

    // Get unsettled splits
    const unsettled = await db
      .select({
        userId: expenseSplits.userId,
        amountOwed: expenseSplits.amountOwed,
      })
      .from(expenseSplits)
      .where(
        and(
          eq(expenseSplits.expenseId, expenseId),
          eq(expenseSplits.isSettled, false)
        )
      );

    const debtorsToRemind = unsettled
      .filter((u) => u.userId !== userId)
      .filter((u) => (targetUserId ? u.userId === targetUserId : true));

    if (debtorsToRemind.length > 0) {
      const recipientIds = debtorsToRemind.map((d) => d.userId);
      sendPushNotification(recipientIds, {
        title: 'Expense Reminder 💸',
        body: `${req.user!.name} sent a reminder for "${expense.title}"`,
        data: { type: 'expense', expenseId },
      });
    }

    res.json({
      message: 'Reminder sent',
      remindedCount: debtorsToRemind.length,
    });
  }
);
