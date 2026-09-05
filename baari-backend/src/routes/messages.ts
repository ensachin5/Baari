import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { messages, user, flatMembers, messageReads } from '../db/schema.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { eq, and, desc, lt, lte, inArray } from 'drizzle-orm';
import { getIO } from '../sockets/index.js';

export const messagesRouter = Router();

// GET /api/messages?flatId=&cursor=
messagesRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const flatId = req.query.flatId as string;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 30, 50);
  const userId = req.user!.id;

  if (!flatId) {
    res.status(400).json({ error: 'flatId query parameter is required' });
    return;
  }

  // 1. Verify requesting user is a member of the flat
  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userId)));

  if (!membership) {
    res.status(403).json({ error: 'Forbidden. You are not a member of this flat.' });
    return;
  }

  // 2. Build query conditions
  const conditions = [eq(messages.flatId, flatId)];
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!isNaN(cursorDate.getTime())) {
      conditions.push(lt(messages.createdAt, cursorDate));
    }
  }

  // 3. Query messages with sender info
  const fetchedMessages = await db
    .select({
      id: messages.id,
      flatId: messages.flatId,
      senderId: messages.senderId,
      content: messages.content,
      createdAt: messages.createdAt,
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

  // Fetch read receipts for these messages
  const reads = messageIds.length > 0
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
    reads: readsMap.get(m.id) || [],
  }));

  res.json({
    messages: enrichedMessages,
    nextCursor,
  });
});

// POST /api/messages — Send message via REST
messagesRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { flatId, content } = req.body;
  const senderId = req.user!.id;

  if (!flatId || !content?.trim()) {
    res.status(400).json({ error: 'flatId and content are required' });
    return;
  }

  // Verify membership
  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, senderId)));

  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this flat' });
    return;
  }

  // Insert message
  const [newMessage] = await db
    .insert(messages)
    .values({
      flatId,
      senderId,
      content: content.trim(),
    })
    .returning();

  // Sender info
  const [sender] = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, senderId));

  const messagePayload = {
    ...newMessage,
    sender: sender || { id: senderId, name: req.user!.name, image: req.user!.image },
    reads: [],
  };

  // Broadcast via Socket.io
  try {
    const io = getIO();
    io.to(flatId).emit('new_message', { message: messagePayload });
  } catch (_) {}

  res.status(201).json({ message: messagePayload });
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// POST /api/messages/read-up-to — body: { messageId }
messagesRouter.post('/read-up-to', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { messageId } = req.body;
  const userId = req.user!.id;

  if (!messageId || typeof messageId !== 'string' || !UUID_REGEX.test(messageId)) {
    res.status(400).json({ error: 'Valid UUID messageId is required' });
    return;
  }

  // Find target message
  const [targetMessage] = await db
    .select({
      id: messages.id,
      flatId: messages.flatId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.id, messageId));

  if (!targetMessage) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  // Find all messages in the flat with createdAt <= targetMessage.createdAt
  const eligibleMessages = await db
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.flatId, targetMessage.flatId),
        lte(messages.createdAt, targetMessage.createdAt)
      )
    );

  // Insert message_reads records (ignore duplicates)
  for (const msg of eligibleMessages) {
    try {
      await db
        .insert(messageReads)
        .values({
          messageId: msg.id,
          userId,
        })
        .onConflictDoNothing();
    } catch (_) {}
  }

  // Broadcast message_read event via socket
  try {
    const io = getIO();
    io.to(targetMessage.flatId).emit('message_read', {
      userId,
      messageId,
      userName: req.user!.name,
      userImage: req.user!.image,
    });
  } catch (_) {}

  res.json({ message: 'Marked messages as read up to target message' });
});
