import { NextResponse } from 'next/server';
import { db, settlements, flatMembers, user } from '@baari/db';
import { eq, and, desc } from 'drizzle-orm';
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
        eq(settlements.paidTo, userSession.id),
        eq(settlements.status, 'pending')
      )
    )
    .orderBy(desc(settlements.createdAt));

  return NextResponse.json({ pendingSettlements: pending });
}
