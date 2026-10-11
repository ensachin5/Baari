import { NextResponse } from 'next/server';
import { db, settlements, activityLog, user } from '@baari/db';
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
    return forbiddenResponse('Only the recipient can confirm this settlement');
  }

  const [confirmed] = await db
    .update(settlements)
    .set({
      status: 'confirmed',
      confirmedAt: new Date(),
    })
    .where(eq(settlements.id, settlementId))
    .returning();

  const [payer] = await db.select({ name: user.name }).from(user).where(eq(user.id, st.paidBy));

  await db.insert(activityLog).values({
    flatId: st.flatId,
    actorId: userSession.id,
    type: 'settlement_confirmed',
    referenceId: confirmed.id,
    metadata: {
      amount: confirmed.amount,
      paidByName: payer?.name || 'Flatmate',
      confirmedByName: userSession.name || 'Flatmate',
    },
  });

  sendPushNotification([st.paidBy], {
    title: 'Settlement Confirmed! ✅',
    body: `${userSession.name || 'Your flatmate'} confirmed receiving your payment of ₹${st.amount}`,
    data: { type: 'settlement', settlementId },
  }).catch(console.error);

  return NextResponse.json({ message: 'Settlement confirmed', settlement: confirmed });
}
