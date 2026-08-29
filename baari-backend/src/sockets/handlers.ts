import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../db/index.js';
import { messages, user } from '../db/schema.js';
import { logger } from '../middleware/error-handler.js';
import { eq } from 'drizzle-orm';

export const registerSocketHandlers = (io: SocketIOServer, socket: Socket) => {
  // Realtime Chat Message Sending
  socket.on('send_message', async (data: { flatId: string; senderId: string; content: string }) => {
    try {
      if (!data.flatId || !data.senderId || !data.content?.trim()) return;

      const [newMessage] = await db
        .insert(messages)
        .values({
          flatId: data.flatId,
          senderId: data.senderId,
          content: data.content.trim(),
        })
        .returning();

      // Fetch sender details
      const [sender] = await db
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, data.senderId));

      const messagePayload = {
        ...newMessage,
        sender: sender || { id: data.senderId, name: 'Flatmate', image: null },
      };

      // Broadcast to flat room
      io.to(data.flatId).emit('new_message', { message: messagePayload });
    } catch (error) {
      logger.error({ error }, 'Error in send_message socket handler');
    }
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

export const broadcastActivityEvent = (
  io: SocketIOServer,
  flatId: string,
  entry: any
) => {
  io.to(flatId).emit('activity_event', { entry });
};
