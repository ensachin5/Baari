import { NextResponse } from 'next/server';
import { db, settlements, flatMembers, user } from '@baari/db';
import { createSettlementSchema } from '@baari/shared';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { sendPushNotification } from '@/lib/services/push';

export async function POST(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = createSettlementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid settlement input' },
        { status: 400 }
      );
    }

    const { flatId, paidTo, amount, note } = parsed.data;
    const paidBy = userSession.id;

    const [senderMembership] = await db
      .select({ role: flatMembers.role })
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, paidBy)));

    if (!senderMembership) {
      return forbiddenResponse('Forbidden. You are not a member of this flat.');
    }

    const [recipientMembership] = await db
      .select({ role: flatMembers.role })
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, paidTo)));

    if (!recipientMembership) {
      return NextResponse.json({ error: 'Recipient is not a member of this flat.' }, { status: 400 });
    }

    const [newSettlement] = await db
      .insert(settlements)
      .values({
        flatId,
        paidBy,
        paidTo,
        amount: String(amount),
        note: note || null,
        status: 'pending',
      })
      .returning();

    sendPushNotification([paidTo], {
      title: 'Settlement Payment Sent',
      body: `${userSession.name || 'Your flatmate'} sent you ₹${amount}. Tap to confirm receipt.`,
      data: { type: 'settlement', settlementId: newSettlement.id },
    }).catch(console.error);

    return NextResponse.json(
      {
        settlement: newSettlement,
        message: 'Settlement recorded and pending confirmation from recipient',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Create Settlement Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to create settlement' }, { status: 500 });
  }
}
