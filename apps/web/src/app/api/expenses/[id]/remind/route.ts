import { NextResponse } from 'next/server';
import { db, expenses, expenseSplits, flatMembers } from '@baari/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { sendPushNotification } from '@/lib/services/push';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: expenseId } = await params;
  const body = await req.json().catch(() => ({}));
  const { targetUserId } = body || {};

  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, expense.flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Forbidden. You are not a member of this flat.');
  }

  const unsettled = await db
    .select({ userId: expenseSplits.userId })
    .from(expenseSplits)
    .where(
      and(
        eq(expenseSplits.expenseId, expenseId),
        eq(expenseSplits.isSettled, false)
      )
    );

  const debtorsToRemind = unsettled
    .filter((u) => u.userId !== userSession.id)
    .filter((u) => (targetUserId ? u.userId === targetUserId : true));

  if (debtorsToRemind.length > 0) {
    const recipientIds = debtorsToRemind.map((d) => d.userId);
    sendPushNotification(recipientIds, {
      title: 'Expense Reminder 💸',
      body: `${userSession.name || 'Flatmate'} sent a reminder for "${expense.title}"`,
      data: { type: 'expense', expenseId },
    }).catch(console.error);
  }

  return NextResponse.json({
    message: 'Reminder sent',
    remindedCount: debtorsToRemind.length,
  });
}
