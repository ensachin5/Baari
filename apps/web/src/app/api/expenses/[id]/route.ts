import { NextResponse } from 'next/server';
import { db, expenses, expenseSplits, flatMembers } from '@baari/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: expenseId } = await params;
  const body = await req.json();
  const { title, amount, category, splits } = body;

  const [existing] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, existing.flatId), eq(flatMembers.userId, userSession.id)));

  const isCreator = existing.paidBy === userSession.id;
  const isAdmin = membership?.role === 'admin';

  if (!isCreator && !isAdmin) {
    return forbiddenResponse('Only the creator or a flat admin can edit this expense');
  }

  const updateFields: any = {
    isEdited: true,
    editedAt: new Date(),
  };
  if (title) updateFields.title = title.trim();
  if (amount) updateFields.amount = String(amount);
  if (category) updateFields.category = category;

  const [updatedExpense] = await db
    .update(expenses)
    .set(updateFields)
    .where(eq(expenses.id, expenseId))
    .returning();

  if (splits && Array.isArray(splits)) {
    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));
    const splitRecords = splits.map((s: { userId: string; amountOwed: number }) => ({
      expenseId,
      userId: s.userId,
      amountOwed: String(s.amountOwed),
    }));
    await db.insert(expenseSplits).values(splitRecords);
  }

  return NextResponse.json({ expense: updatedExpense });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: expenseId } = await params;

  const [existing] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, existing.flatId), eq(flatMembers.userId, userSession.id)));

  const isCreator = existing.paidBy === userSession.id;
  const isAdmin = membership?.role === 'admin';

  if (!isCreator && !isAdmin) {
    return forbiddenResponse('Only the creator or a flat admin can delete this expense');
  }

  await db.delete(expenses).where(eq(expenses.id, expenseId));

  return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
}
