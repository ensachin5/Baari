import { Router, Response } from 'express';
import { db } from '../db/index.js';
import {
  expenses,
  expenseSplits,
  expenseComments,
  settlements,
  flatMembers,
  user,
  activityLog,
} from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { validate } from '../middleware/validate.js';
import { createExpenseSchema, createSettlementSchema } from '../schemas/expenses.js';
import { eq, and, desc, inArray, ilike, asc } from 'drizzle-orm';
import { getIO } from '../sockets/index.js';
import { broadcastActivityEvent } from '../sockets/handlers.js';
import { sendPushNotification } from '../services/push.js';

export const expensesRouter = Router();

// Helper: Calculate Balances and Simplified Debts
async function calculateBalances(flatId: string, currentUserId: string) {
  // 1. Get all flat members
  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(flatMembers)
    .innerJoin(user, eq(flatMembers.userId, user.id))
    .where(eq(flatMembers.flatId, flatId));

  const netBalances = new Map<string, number>();
  members.forEach((m) => netBalances.set(m.id, 0));

  // 2. Add all amounts paid by members
  const flatExpenses = await db
    .select({
      id: expenses.id,
      amount: expenses.amount,
      paidBy: expenses.paidBy,
    })
    .from(expenses)
    .where(eq(expenses.flatId, flatId));

  flatExpenses.forEach((exp) => {
    const paid = parseFloat(exp.amount);
    const curr = netBalances.get(exp.paidBy) || 0;
    netBalances.set(exp.paidBy, curr + paid);
  });

  // 3. Subtract all splits owed by members
  const flatSplits = await db
    .select({
      userId: expenseSplits.userId,
      amountOwed: expenseSplits.amountOwed,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(eq(expenses.flatId, flatId));

  flatSplits.forEach((sp) => {
    const owed = parseFloat(sp.amountOwed);
    const curr = netBalances.get(sp.userId) || 0;
    netBalances.set(sp.userId, curr - owed);
  });

  // 4. Adjust for confirmed settlements only
  const flatSettlements = await db
    .select({
      paidBy: settlements.paidBy,
      paidTo: settlements.paidTo,
      amount: settlements.amount,
    })
    .from(settlements)
    .where(and(eq(settlements.flatId, flatId), eq(settlements.status, 'confirmed')));

  flatSettlements.forEach((st) => {
    const amt = parseFloat(st.amount);
    netBalances.set(st.paidBy, (netBalances.get(st.paidBy) || 0) + amt);
    netBalances.set(st.paidTo, (netBalances.get(st.paidTo) || 0) - amt);
  });

  const memberBalances = members.map((m) => {
    const net = Math.round((netBalances.get(m.id) || 0) * 100) / 100;
    return {
      userId: m.id,
      name: m.name,
      image: m.image,
      netBalance: net,
    };
  });

  const debtors: { id: string; name: string; amount: number }[] = [];
  const creditors: { id: string; name: string; amount: number }[] = [];

  memberBalances.forEach((m) => {
    if (m.netBalance < -0.01) {
      debtors.push({ id: m.userId, name: m.name, amount: -m.netBalance });
    } else if (m.netBalance > 0.01) {
      creditors.push({ id: m.userId, name: m.name, amount: m.netBalance });
    }
  });

  const simplifiedDebts: {
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amount: number;
  }[] = [];

  let dIdx = 0;
  let cIdx = 0;
  const debtorsCopy = debtors.map((d) => ({ ...d }));
  const creditorsCopy = creditors.map((c) => ({ ...c }));

  while (dIdx < debtorsCopy.length && cIdx < creditorsCopy.length) {
    const debtor = debtorsCopy[dIdx];
    const creditor = creditorsCopy[cIdx];
    const settleAmt = Math.min(debtor.amount, creditor.amount);

    if (settleAmt > 0.01) {
      simplifiedDebts.push({
        fromUserId: debtor.id,
        fromUserName: debtor.name,
        toUserId: creditor.id,
        toUserName: creditor.name,
        amount: Math.round(settleAmt * 100) / 100,
      });
    }

    debtor.amount -= settleAmt;
    creditor.amount -= settleAmt;

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  const currentUserNet = netBalances.get(currentUserId) || 0;
  const youAreOwed = currentUserNet > 0 ? Math.round(currentUserNet * 100) / 100 : 0;
  const youOwe = currentUserNet < 0 ? Math.round(-currentUserNet * 100) / 100 : 0;

  return {
    summary: {
      youAreOwed,
      youOwe,
      netBalance: Math.round(currentUserNet * 100) / 100,
    },
    memberBalances,
    simplifiedDebts,
  };
}

// GET /api/expenses/balances/simplified?flatId=
expensesRouter.get(
  '/balances/simplified',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const flatId = req.query.flatId as string;
    const currentUserId = req.user!.id;

    if (!flatId) {
      res.status(400).json({ error: 'flatId is required' });
      return;
    }

    const { summary, simplifiedDebts } = await calculateBalances(flatId, currentUserId);
    res.json({ summary, simplifiedDebts });
  }
);

// GET /api/expenses/balances?flatId=
expensesRouter.get(
  '/balances',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const flatId = req.query.flatId as string;
    const currentUserId = req.user!.id;

    if (!flatId) {
      res.status(400).json({ error: 'flatId is required' });
      return;
    }

    const result = await calculateBalances(flatId, currentUserId);
    res.json(result);
  }
);

// GET /api/expenses?flatId=&category=&search=
expensesRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;

  if (!flatId) {
    res.status(400).json({ error: 'flatId query param is required' });
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
expensesRouter.post(
  '/',
  requireAuth,
  validate(createExpenseSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { flatId, title, amount, category, splitType, splits, isRecurring, recurrenceInterval } = req.body;
    const userId = req.user!.id;

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
expensesRouter.patch(
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

// GET /api/expenses/:id/comments
expensesRouter.get(
  '/:id/comments',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const expenseId = String(req.params.id);

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
expensesRouter.post(
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
expensesRouter.post(
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

// GET /api/settlements/pending?flatId= (Pending settlements for recipient)
expensesRouter.get(
  '/settlements/pending',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const flatId = req.query.flatId as string;
    const userId = req.user!.id;

    if (!flatId) {
      res.status(400).json({ error: 'flatId is required' });
      return;
    }

    const pending = await db
      .select({
        id: settlements.id,
        flatId: settlements.flatId,
        paidBy: settlements.paidBy,
        paidTo: settlements.paidTo,
        amount: settlements.amount,
        note: settlements.note,
        status: settlements.status,
        createdAt: settlements.createdAt,
        payerName: user.name,
        payerImage: user.image,
      })
      .from(settlements)
      .innerJoin(user, eq(settlements.paidBy, user.id))
      .where(
        and(
          eq(settlements.flatId, flatId),
          eq(settlements.paidTo, userId),
          eq(settlements.status, 'pending')
        )
      )
      .orderBy(desc(settlements.createdAt));

    res.json({ pendingSettlements: pending });
  }
);

// POST /api/settlements (Create settlement - defaults to status: pending)
expensesRouter.post(
  ['/settle', '/settlements'],
  requireAuth,
  validate(createSettlementSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { flatId, paidTo, amount, note } = req.body;
    const paidBy = req.user!.id;

    // Insert settlement as pending
    const [newSettlement] = await db
      .insert(settlements)
      .values({
        flatId,
        paidBy,
        paidTo,
        amount: amount.toString(),
        note,
        status: 'pending',
      })
      .returning();

    // Get payee details
    const [payee] = await db.select({ name: user.name }).from(user).where(eq(user.id, paidTo));

    // Send push notification to recipient to confirm
    sendPushNotification([paidTo], {
      title: 'Settlement Payment Sent',
      body: `${req.user!.name} sent you ₹${amount}. Tap to confirm receipt.`,
      data: { type: 'settlement', settlementId: newSettlement.id },
    });

    res.status(201).json({
      settlement: newSettlement,
      message: 'Settlement recorded and pending confirmation from recipient',
    });
  }
);

// PATCH /api/settlements/:id/confirm (Recipient confirms settlement)
expensesRouter.patch(
  '/settlements/:id/confirm',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const settlementId = String(req.params.id);
    const userId = req.user!.id;

    const [st] = await db.select().from(settlements).where(eq(settlements.id, settlementId));
    if (!st) {
      res.status(404).json({ error: 'Settlement not found' });
      return;
    }

    if (st.paidTo !== userId) {
      res.status(403).json({ error: 'Only the recipient can confirm this settlement' });
      return;
    }

    const [confirmed] = await db
      .update(settlements)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
      })
      .where(eq(settlements.id, settlementId))
      .returning();

    // Log activity
    const [payer] = await db.select({ name: user.name }).from(user).where(eq(user.id, st.paidBy));
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId: st.flatId,
        actorId: userId,
        type: 'settlement_confirmed',
        referenceId: confirmed.id,
        metadata: {
          amount: confirmed.amount,
          paidByName: payer?.name || 'Flatmate',
          confirmedByName: req.user!.name,
        },
      })
      .returning();

    try {
      const io = getIO();
      broadcastActivityEvent(io, st.flatId, {
        ...activity,
        actor: { id: req.user!.id, name: req.user!.name, image: req.user!.image },
      });
      io.to(`flat:${st.flatId}`).emit('balance_updated', { flatId: st.flatId });
    } catch (_) {}

    sendPushNotification([st.paidBy], {
      title: 'Settlement Confirmed! ✅',
      body: `${req.user!.name} confirmed receiving your payment of ₹${st.amount}`,
      data: { type: 'settlement', settlementId },
    });

    res.json({ message: 'Settlement confirmed', settlement: confirmed });
  }
);

// PATCH /api/settlements/:id/reject (Recipient rejects settlement)
expensesRouter.patch(
  '/settlements/:id/reject',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const settlementId = String(req.params.id);
    const userId = req.user!.id;

    const [st] = await db.select().from(settlements).where(eq(settlements.id, settlementId));
    if (!st) {
      res.status(404).json({ error: 'Settlement not found' });
      return;
    }

    if (st.paidTo !== userId) {
      res.status(403).json({ error: 'Only the recipient can reject this settlement' });
      return;
    }

    const [rejected] = await db
      .update(settlements)
      .set({ status: 'rejected' })
      .where(eq(settlements.id, settlementId))
      .returning();

    sendPushNotification([st.paidBy], {
      title: 'Settlement Rejected ❌',
      body: `${req.user!.name} could not confirm receiving your payment of ₹${st.amount}`,
      data: { type: 'settlement', settlementId },
    });

    res.json({ message: 'Settlement rejected', settlement: rejected });
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
