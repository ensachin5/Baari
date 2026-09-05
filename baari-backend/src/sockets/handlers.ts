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
      {
        socketId: socket.id,
        senderId,
        senderName,
        flatId: data?.flatId,
        payload: { flatId: data?.flatId, contentLength: data?.content?.length, contentPreview: data?.content?.slice(0, 30) },
      },
      '[Socket send_message] Received send_message event'
    );

    try {
      const parsed = sendMessageSchema.safeParse(data);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || 'Invalid message payload';
        logger.warn(
          { socketId: socket.id, senderId, errorMsg, issues: parsed.error.issues },
          '[Socket send_message] Validation failed'
        );
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
        {
          socketId: socket.id,
          messageId: newMessage.id,
          flatId,
          senderId,
          dbInsertSucceeded: true,
        },
        '[Socket send_message] DB insert succeeded'
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

      // Check how many sockets are currently in the flat room at broadcast time
      const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
      const roomSockets = await io.in(flatId).fetchSockets();
      const connectedUserIdsInRoom = roomSockets.map((s) => ({
        socketId: s.id,
        userId: (s as any).data?.user?.id,
        userName: (s as any).data?.user?.name,
      }));

      // Broadcast new message to everyone in the flat room (including sender)
      io.to(flatId).emit('new_message', { message: messagePayload });

      logger.info(
        {
          socketId: socket.id,
          messageId: newMessage.id,
          flatId,
          roomSocketCount: roomSize,
          connectedUsersInRoom: connectedUserIdsInRoom,
        },
        '[Socket send_message] Broadcasted new_message to flat room'
      );

      // Send push notification to offline/disconnected members
      try {
        const allMembers = await db
          .select({ userId: flatMembers.userId })
          .from(flatMembers)
          .where(eq(flatMembers.flatId, flatId));

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
          logger.info(
            { flatId, offlineUserCount: offlineUserIds.length, offlineUserIds },
            '[Socket send_message] Sent push notifications to offline members'
          );
        }
      } catch (pushErr: any) {
        logger.warn({ pushErr: pushErr?.message, flatId }, '[Socket send_message] Failed to dispatch push notification');
      }

      if (callback) {
        callback({ success: true, message: messagePayload });
      }
    } catch (error: any) {
      logger.error(
        { error: error?.message || error, socketId: socket.id, senderId },
        'Error in send_message socket handler'
      );
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
  const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
  logger.info({ flatId, roomSocketCount: roomSize, occurrenceId: data.occurrenceId }, 'Broadcasting task_completed');
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
  const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
  logger.info({ flatId, roomSocketCount: roomSize, taskId: data.taskId }, 'Broadcasting task_deleted');
  io.to(flatId).emit('task_deleted', data);
};

export const broadcastActivityEvent = (
  io: SocketIOServer,
  flatId: string,
  entry: any
) => {
  const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
  logger.info({ flatId, roomSocketCount: roomSize }, 'Broadcasting activity_event');
  io.to(flatId).emit('activity_event', { entry });
};

export const broadcastGroceryUpdated = (
  io: SocketIOServer,
  flatId: string,
  data?: any
) => {
  const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
  logger.info({ flatId, roomSocketCount: roomSize }, 'Broadcasting grocery_updated');
  io.to(flatId).emit('grocery_updated', data || {});
};

export const broadcastAnnouncementUpdated = (
  io: SocketIOServer,
  flatId: string,
  data?: any
) => {
  const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
  logger.info({ flatId, roomSocketCount: roomSize }, 'Broadcasting announcement_updated');
  io.to(flatId).emit('announcement_updated', data || {});
};

export const broadcastMessageEdited = (
  io: SocketIOServer,
  flatId: string,
  data: {
    messageId: string;
    content: string;
    editedAt: string | Date;
  }
) => {
  const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
  logger.info(
    { flatId, messageId: data.messageId, roomSocketCount: roomSize },
    'Broadcasting message_edited to flat room'
  );
  io.to(flatId).emit('message_edited', data);
};

export const broadcastMessageDeleted = (
  io: SocketIOServer,
  flatId: string,
  data: {
    messageId: string;
    deletedAt: string | Date;
  }
) => {
  const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
  logger.info(
    { flatId, messageId: data.messageId, roomSocketCount: roomSize },
    'Broadcasting message_deleted to flat room'
  );
  io.to(flatId).emit('message_deleted', data);
};
