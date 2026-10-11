import { NextResponse } from 'next/server';
import { db, messages, user } from '@baari/db';
import { eq } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: messageId } = await params;
  const { content } = await req.json();

  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
  }

  const [existingMessage] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId));

  if (!existingMessage) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  if (existingMessage.senderId !== userSession.id) {
    return forbiddenResponse('You can only edit your own messages');
  }

  if (existingMessage.deletedAt) {
    return NextResponse.json({ error: 'Cannot edit a deleted message' }, { status: 400 });
  }

  const [updatedMessage] = await db
    .update(messages)
    .set({
      content: content.trim(),
      editedAt: new Date(),
    })
    .where(eq(messages.id, messageId))
    .returning();

  const [sender] = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, existingMessage.senderId));

  const messagePayload = {
    ...updatedMessage,
    sender: sender || { id: userSession.id, name: userSession.name, image: userSession.image },
  };

  return NextResponse.json({ message: messagePayload });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: messageId } = await params;

  const [existingMessage] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId));

  if (!existingMessage) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  if (existingMessage.senderId !== userSession.id) {
    return forbiddenResponse('You can only delete your own messages');
  }

  const [deletedMessage] = await db
    .update(messages)
    .set({
      content: '',
      deletedAt: new Date(),
    })
    .where(eq(messages.id, messageId))
    .returning();

  return NextResponse.json({
    success: true,
    messageId: deletedMessage.id,
    deletedAt: deletedMessage.deletedAt,
  });
}
