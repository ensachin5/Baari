import { Router, Response } from 'express';
import { db } from '../../db/index.js';
import {
  expenses,
  expenseSplits,
  settlements,
  flatMembers,
  user,
} from '../../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth-guard.js';
import { eq, and } from 'drizzle-orm';
import { isFlatMember } from '../../utils/index.js';

export const balancesRouter = Router();

// Helper: Calculate Balances and Simplified Debts
export async function calculateBalances(flatId: string, currentUserId: string) {
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
balancesRouter.get(
  '/balances/simplified',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const flatId = req.query.flatId as string;
    const currentUserId = req.user!.id;

    if (!flatId) {
      res.status(400).json({ error: 'flatId is required' });
      return;
    }

    if (!(await isFlatMember(flatId, currentUserId))) {
      res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
      return;
    }

    const { summary, simplifiedDebts } = await calculateBalances(flatId, currentUserId);
    res.json({ summary, simplifiedDebts });
  }
);

// GET /api/expenses/balances?flatId=
balancesRouter.get(
  '/balances',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const flatId = req.query.flatId as string;
    const currentUserId = req.user!.id;

    if (!flatId) {
      res.status(400).json({ error: 'flatId is required' });
      return;
    }

    if (!(await isFlatMember(flatId, currentUserId))) {
      res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
      return;
    }

    const result = await calculateBalances(flatId, currentUserId);
    res.json(result);
  }
);
