import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { registerSocketHandlers } from './handlers.js';
import { logger } from '../middleware/error-handler.js';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected');

    socket.on('join_flat', (data: { flatId: string }) => {
      if (data?.flatId) {
        socket.join(data.flatId);
        logger.info({ socketId: socket.id, flatId: data.flatId }, 'Socket joined flat room');
      }
    });

    socket.on('leave_flat', (data: { flatId: string }) => {
      if (data?.flatId) {
        socket.leave(data.flatId);
      }
    });

    registerSocketHandlers(io!, socket);

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Socket disconnected');
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
