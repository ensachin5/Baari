import { NextResponse } from 'next/server';
import { db, messages, messageReads } from '@baari/db';
import { eq, and, lte } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { messageId } = await req.json();
  if (!messageId) {
    return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
  }

  const [targetMessage] = await db
    .select({
      id: messages.id,
      flatId: messages.flatId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.id, messageId));

  if (!targetMessage) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  const eligibleMessages = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.flatId, targetMessage.flatId),
        lte(messages.createdAt, targetMessage.createdAt)
      )
    );

  if (eligibleMessages.length > 0) {
    try {
      await db
        .insert(messageReads)
        .values(eligibleMessages.map((msg) => ({ messageId: msg.id, userId: userSession.id })))
        .onConflictDoNothing();
    } catch (_) {}
  }

  return NextResponse.json({ message: 'Marked messages as read up to target message' });
}
