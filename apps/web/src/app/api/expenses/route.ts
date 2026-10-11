import { NextResponse } from 'next/server';
import {
  db,
  expenses,
  expenseSplits,
  flatMembers,
  user,
  activityLog,
} from '@baari/db';
import { createExpenseSchema } from '@baari/shared';
import { eq, and, desc, inArray } from 'drizzle-orm';
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

  const fetchedExpenses = await db
    .select({
      id: expenses.id,
      flatId: expenses.flatId,
      title: expenses.title,
      amount: expenses.amount,
      category: expenses.category,
      paidBy: expenses.paidBy,
      createdAt: expenses.createdAt,
      payerName: user.name,
      payerImage: user.image,
    })
    .from(expenses)
    .innerJoin(user, eq(expenses.paidBy, user.id))
    .where(eq(expenses.flatId, flatId))
    .orderBy(desc(expenses.createdAt))
    .limit(50);

  const expenseIds = fetchedExpenses.map((e) => e.id);

  const splits =
    expenseIds.length > 0
      ? await db
          .select({
            id: expenseSplits.id,
            expenseId: expenseSplits.expenseId,
            userId: expenseSplits.userId,
            amountOwed: expenseSplits.amountOwed,
            userName: user.name,
            userImage: user.image,
          })
          .from(expenseSplits)
          .innerJoin(user, eq(expenseSplits.userId, user.id))
          .where(inArray(expenseSplits.expenseId, expenseIds))
      : [];

  const splitsByExpenseId = new Map<string, typeof splits>();
  splits.forEach((s) => {
    const list = splitsByExpenseId.get(s.expenseId) || [];
    list.push(s);
    splitsByExpenseId.set(s.expenseId, list);
  });

  const enrichedExpenses = fetchedExpenses.map((exp) => ({
    ...exp,
    splits: splitsByExpenseId.get(exp.id) || [],
  }));

  return NextResponse.json({ expenses: enrichedExpenses });
}

export async function POST(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid expense input' },
        { status: 400 }
      );
    }

    const {
      flatId,
      title,
      amount,
      category,
      paidBy = userSession.id,
      splits: rawSplits,
    } = parsed.data;

    const [membership] = await db
      .select({ role: flatMembers.role })
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

    if (!membership) {
      return forbiddenResponse('Forbidden. You are not a member of this flat.');
    }

    const [newExpense] = await db
      .insert(expenses)
      .values({
        flatId,
        title,
        amount: String(amount),
        category: category || 'general',
        paidBy,
      })
      .returning();

    if (rawSplits && rawSplits.length > 0) {
      await db.insert(expenseSplits).values(
        rawSplits.map((s) => ({
          expenseId: newExpense.id,
          userId: s.userId,
          amountOwed: String(s.amountOwed),
        }))
      );
    }

    await db.insert(activityLog).values({
      flatId,
      actorId: userSession.id,
      type: 'expense_added',
      referenceId: newExpense.id,
      metadata: {
        title: newExpense.title,
        amount: newExpense.amount,
      },
    });

    return NextResponse.json({ expense: newExpense }, { status: 201 });
  } catch (err: any) {
    console.error('[Create Expense Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to create expense' }, { status: 500 });
  }
}
