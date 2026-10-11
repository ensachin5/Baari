import { NextResponse } from 'next/server';
import { db, messages, messageReads, flatMembers, user } from '@baari/db';
import { eq, and, desc, lt, inArray } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const flatId = searchParams.get('flatId');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 30, 1), 100);

  if (!flatId) {
    return NextResponse.json({ error: 'flatId query parameter is required' }, { status: 400 });
  }

  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Forbidden. You are not a member of this flat.');
  }

  const conditions = [eq(messages.flatId, flatId)];
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!isNaN(cursorDate.getTime())) {
      conditions.push(lt(messages.createdAt, cursorDate));
    }
  }

  const fetchedMessages = await db
    .select({
      id: messages.id,
      flatId: messages.flatId,
      senderId: messages.senderId,
      content: messages.content,
      createdAt: messages.createdAt,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
      sender: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(messages)
    .innerJoin(user, eq(messages.senderId, user.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1);

  let nextCursor: string | null = null;
  if (fetchedMessages.length > limit) {
    const nextItem = fetchedMessages.pop();
    if (nextItem?.createdAt) {
      nextCursor = new Date(nextItem.createdAt).toISOString();
    }
  }

  const messageIds = fetchedMessages.map((m) => m.id);

  const reads =
    messageIds.length > 0
      ? await db
          .select({
            messageId: messageReads.messageId,
            userId: messageReads.userId,
            readAt: messageReads.readAt,
            userName: user.name,
            userImage: user.image,
          })
          .from(messageReads)
          .innerJoin(user, eq(messageReads.userId, user.id))
          .where(inArray(messageReads.messageId, messageIds))
      : [];

  const readsMap = new Map<string, typeof reads>();
  reads.forEach((r) => {
    const list = readsMap.get(r.messageId) || [];
    list.push(r);
    readsMap.set(r.messageId, list);
  });

  const enrichedMessages = fetchedMessages.map((m) => ({
    ...m,
    content: m.deletedAt ? '' : m.content,
    reads: readsMap.get(m.id) || [],
  }));

  return NextResponse.json({
    messages: enrichedMessages,
    nextCursor,
  });
}

export async function POST(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { flatId, content } = body;

    if (!flatId || !content?.trim()) {
      return NextResponse.json({ error: 'flatId and content are required' }, { status: 400 });
    }

    const [membership] = await db
      .select()
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

    if (!membership) {
      return forbiddenResponse('Forbidden. You are not a member of this flat.');
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        flatId,
        senderId: userSession.id,
        content: content.trim(),
      })
      .returning();

    const [senderInfo] = await db
      .select({ id: user.id, name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, userSession.id));

    return NextResponse.json(
      {
        message: {
          ...newMessage,
          sender: senderInfo || { id: userSession.id, name: userSession.name, image: userSession.image },
          reads: [],
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Send Message Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to send message' }, { status: 500 });
  }
}
