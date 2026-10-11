import { NextResponse } from 'next/server';
import { db, settlements } from '@baari/db';
import { eq } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { sendPushNotification } from '@/lib/services/push';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: settlementId } = await params;

  const [st] = await db.select().from(settlements).where(eq(settlements.id, settlementId));
  if (!st) {
    return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
  }

  if (st.paidTo !== userSession.id) {
    return forbiddenResponse('Only the recipient can reject this settlement');
  }

  const [rejected] = await db
    .update(settlements)
    .set({ status: 'rejected' })
    .where(eq(settlements.id, settlementId))
    .returning();

  sendPushNotification([st.paidBy], {
    title: 'Settlement Rejected ❌',
    body: `${userSession.name || 'Your flatmate'} could not confirm receiving your payment of ₹${st.amount}`,
    data: { type: 'settlement', settlementId },
  }).catch(console.error);

  return NextResponse.json({ message: 'Settlement rejected', settlement: rejected });
}
