import { Router, Response } from 'express';
import { db } from '../db/index.js';
import {
  expenses,
  expenseSplits,
  settlements,
  flatMembers,
  user,
  activityLog,
} from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { validate } from '../middleware/validate.js';
import { createExpenseSchema, createSettlementSchema } from '../schemas/expenses.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getIO } from '../sockets/index.js';
import { broadcastActivityEvent } from '../sockets/handlers.js';
import { sendPushNotification } from '../services/push.js';

export const expensesRouter = Router();

// Get expenses for a flat
expensesRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  const category = req.query.category as string | undefined;

  if (!flatId) {
    res.status(400).json({ error: 'flatId query param is required' });
    return;
  }

  const queryConditions = category
    ? and(eq(expenses.flatId, flatId), eq(expenses.category, category))
    : eq(expenses.flatId, flatId);

  const flatExpenses = await db
    .select({
      id: expenses.id,
      flatId: expenses.flatId,
      title: expenses.title,
      amount: expenses.amount,
      paidBy: expenses.paidBy,
      category: expenses.category,
      createdAt: expenses.createdAt,
      payerName: user.name,
      payerImage: user.image,
    })
    .from(expenses)
    .innerJoin(user, eq(expenses.paidBy, user.id))
    .where(queryConditions)
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

// Add an expense
expensesRouter.post(
  '/',
  requireAuth,
  validate(createExpenseSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { flatId, title, amount, category, splitType, splits } = req.body;
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
      })
      .returning();

    // 2. Insert calculated splits
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

    // Send push notification to participants (excluding paidBy creator)
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

// Get balances and debts summary
expensesRouter.get('/balances', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  const currentUserId = req.user!.id;

  if (!flatId) {
    res.status(400).json({ error: 'flatId is required' });
    return;
  }

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

  // Initialize net balance map (userId -> net amount in rupees)
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

  // 4. Adjust for settlements
  const flatSettlements = await db
    .select({
      paidBy: settlements.paidBy,
      paidTo: settlements.paidTo,
      amount: settlements.amount,
    })
    .from(settlements)
    .where(eq(settlements.flatId, flatId));

  flatSettlements.forEach((st) => {
    const amt = parseFloat(st.amount);
    // Payer sent money -> increases their net balance
    netBalances.set(st.paidBy, (netBalances.get(st.paidBy) || 0) + amt);
    // Payee received money -> decreases their net balance
    netBalances.set(st.paidTo, (netBalances.get(st.paidTo) || 0) - amt);
  });

  // Build member balance list
  const memberBalances = members.map((m) => {
    const net = Math.round((netBalances.get(m.id) || 0) * 100) / 100;
    return {
      userId: m.id,
      name: m.name,
      image: m.image,
      netBalance: net,
    };
  });

  // Compute pairwise simplified debts
  // Debtors have net < 0, Creditors have net > 0
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

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
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

  // Current user's summary
  const currentUserNet = netBalances.get(currentUserId) || 0;
  const youAreOwed = currentUserNet > 0 ? Math.round(currentUserNet * 100) / 100 : 0;
  const youOwe = currentUserNet < 0 ? Math.round(-currentUserNet * 100) / 100 : 0;

  res.json({
    summary: {
      youAreOwed,
      youOwe,
      netBalance: Math.round(currentUserNet * 100) / 100,
    },
    memberBalances,
    simplifiedDebts,
  });
});

// Record a settlement
expensesRouter.post(
  ['/settle', '/settlements'],
  requireAuth,
  validate(createSettlementSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { flatId, paidTo, amount, note } = req.body;
    const paidBy = req.user!.id;

    // Insert settlement
    const [newSettlement] = await db
      .insert(settlements)
      .values({
        flatId,
        paidBy,
        paidTo,
        amount: amount.toString(),
        note,
      })
      .returning();

    // Get payee details for activity log
    const [payee] = await db.select({ name: user.name }).from(user).where(eq(user.id, paidTo));

    // Log activity
    const [activity] = await db
      .insert(activityLog)
      .values({
        flatId,
        actorId: paidBy,
        type: 'settlement',
        referenceId: newSettlement.id,
        metadata: {
          amount: newSettlement.amount,
          paidToName: payee?.name || 'Flatmate',
          note,
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

    res.status(201).json({ settlement: newSettlement });
  }
);
