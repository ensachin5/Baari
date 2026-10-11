import { NextResponse } from 'next/server';
import {
  db,
  expenses,
  expenseSplits,
  settlements,
  flatMembers,
  user,
} from '@baari/db';
import { simplifyDebts } from '@baari/shared';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const flatId = searchParams.get('flatId');
  if (!flatId) {
    return NextResponse.json({ error: 'flatId query param is required' }, { status: 400 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Forbidden. You are not a member of this flat.');
  }

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

  const simplifiedDebts = simplifyDebts(memberBalances);

  const currentUserNet = netBalances.get(userSession.id) || 0;
  const youAreOwed = currentUserNet > 0 ? Math.round(currentUserNet * 100) / 100 : 0;
  const youOwe = currentUserNet < 0 ? Math.round(-currentUserNet * 100) / 100 : 0;

  return NextResponse.json({
    summary: {
      youAreOwed,
      youOwe,
      totalBalance: Math.round(currentUserNet * 100) / 100,
    },
    memberBalances,
    simplifiedDebts,
  });
}
