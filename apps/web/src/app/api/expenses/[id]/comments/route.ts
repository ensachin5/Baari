import { NextResponse } from 'next/server';
import { db, expenses, expenseComments, flatMembers, user } from '@baari/db';
import { eq, and, asc } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: expenseId } = await params;

  const [expense] = await db
    .select({ flatId: expenses.flatId })
    .from(expenses)
    .where(eq(expenses.id, expenseId));

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

  return NextResponse.json({ comments });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: expenseId } = await params;
  const { content } = await req.json();

  if (!content || !String(content).trim()) {
    return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
  }

  const [expense] = await db
    .select({ flatId: expenses.flatId })
    .from(expenses)
    .where(eq(expenses.id, expenseId));

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

  const [newComment] = await db
    .insert(expenseComments)
    .values({
      expenseId,
      userId: userSession.id,
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

  return NextResponse.json({ comment: commentWithUser }, { status: 201 });
}
