import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from './index.js';
import { db } from '../db/index.js';
import { messages, user, flatMembers } from '../db/schema.js';
import { sendMessageSchema } from '../schemas/chat.js';
import { logger } from '../middleware/error-handler.js';
import { sendPushNotification } from '../services/push.js';
import { eq, and } from 'drizzle-orm';

export const registerSocketHandlers = (io: SocketIOServer, socket: AuthenticatedSocket) => {
  // Realtime Chat Message Handler
  socket.on('send_message', async (data: { flatId: string; content: string }, callback?: (res: any) => void) => {
    const senderId = socket.data.user.id;
    const senderName = socket.data.user.name;

    logger.info(
      { socketId: socket.id, senderId, senderName, flatId: data?.flatId, contentLength: data?.content?.length },
      '[Socket send_message] Received send_message event'
    );

    try {
      const parsed = sendMessageSchema.safeParse(data);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || 'Invalid message payload';
        logger.warn({ socketId: socket.id, senderId, errorMsg }, '[Socket send_message] Validation failed');
        if (callback) callback({ error: errorMsg });
        return;
      }

      const { flatId, content } = parsed.data;

      // Verify sender is a member of the flat
      const [membership] = await db
        .select()
        .from(flatMembers)
        .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, senderId)));

      if (!membership) {
        logger.warn(
          { socketId: socket.id, senderId, flatId },
          '[Socket send_message] Sender is not a member of flat'
        );
        if (callback) callback({ error: 'You are not a member of this flat' });
        return;
      }

      // Save message to DB
      const [newMessage] = await db
        .insert(messages)
        .values({
          flatId,
          senderId,
          content: content.trim(),
        })
        .returning();

      logger.info(
        { socketId: socket.id, messageId: newMessage.id, flatId, senderId },
        '[Socket send_message] Saved message to DB'
      );

      // Fetch sender info for frontend rendering
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
        sender: sender || { id: senderId, name: senderName, image: socket.data.user.image },
      };

      // Broadcast new message to everyone in the flat room (including sender)
      io.to(flatId).emit('new_message', { message: messagePayload });
      logger.info(
        { socketId: socket.id, messageId: newMessage.id, flatId },
        '[Socket send_message] Broadcast new_message to flat room'
      );

      // Send push notification to offline/disconnected members
      try {
        const allMembers = await db
          .select({ userId: flatMembers.userId })
          .from(flatMembers)
          .where(eq(flatMembers.flatId, flatId));

        const roomSockets = await io.in(flatId).fetchSockets();
        const activeUserIdsInRoom = new Set(roomSockets.map((s) => (s as any).data?.user?.id));

        const offlineUserIds = allMembers
          .map((m) => m.userId)
          .filter((uid) => uid !== senderId && !activeUserIdsInRoom.has(uid));

        if (offlineUserIds.length > 0) {
          const truncated = content.length > 50 ? `${content.substring(0, 47)}...` : content;
          sendPushNotification(offlineUserIds, {
            title: senderName || 'Flatmate',
            body: truncated,
            data: { type: 'chat', flatId },
          });
        }
      } catch (_) {}

      if (callback) {
        callback({ success: true, message: messagePayload });
      }
    } catch (error) {
      logger.error({ error, socketId: socket.id, senderId }, 'Error in send_message socket handler');
      if (callback) callback({ error: 'Failed to send message' });
    }
  });

  // Typing Indicator Handler
  socket.on('typing', (data: { flatId: string; isTyping: boolean }) => {
    if (!data?.flatId) return;
    socket.to(data.flatId).emit('user_typing', {
      userId: socket.data.user.id,
      userName: socket.data.user.name,
      isTyping: !!data.isTyping,
    });
  });
};

// Helper broadcaster functions for REST endpoints
export const broadcastTaskCompleted = (
  io: SocketIOServer,
  flatId: string,
  data: {
    occurrenceId: string;
    userId: string;
    taskTitle: string;
    userName: string;
    isFullyDone: boolean;
  }
) => {
  io.to(flatId).emit('task_completed', data);
};

export const broadcastTaskDeleted = (
  io: SocketIOServer,
  flatId: string,
  data: {
    taskId: string;
    taskTitle: string;
  }
) => {
  io.to(flatId).emit('task_deleted', data);
};

export const broadcastActivityEvent = (
  io: SocketIOServer,
  flatId: string,
  entry: any
) => {
  io.to(flatId).emit('activity_event', { entry });
};

export const broadcastGroceryUpdated = (
  io: SocketIOServer,
  flatId: string,
  data?: any
) => {
  io.to(flatId).emit('grocery_updated', data || {});
};

export const broadcastAnnouncementUpdated = (
  io: SocketIOServer,
  flatId: string,
  data?: any
) => {
  io.to(flatId).emit('announcement_updated', data || {});
};
