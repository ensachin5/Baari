import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { auth } from '../auth.js';
import { db } from '../db/index.js';
import { flatMembers } from '../db/schema.js';
import { session as sessionTable, user as userTable } from '../db/auth-schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { registerSocketHandlers } from './handlers.js';
import { logger } from '../middleware/error-handler.js';

let io: SocketIOServer | null = null;

export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
    };
    session?: any;
  };
}

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // 1. Authenticate Socket Connections on initial handshake
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      const headers = new Headers();
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      } else if (socket.handshake.headers.cookie) {
        headers.set('cookie', socket.handshake.headers.cookie);
      }

      const session = await auth.api.getSession({ headers });

      if (session && session.user) {
        socket.data.user = session.user as any;
        socket.data.session = session.session;
        return next();
      }

      // Fallback: check session table directly in Neon DB
      if (token) {
        const foundSession = await db.query.session.findFirst({
          where: and(eq(sessionTable.token, token), gt(sessionTable.expiresAt, new Date())),
        });

        if (foundSession) {
          const foundUser = await db.query.user.findFirst({
            where: eq(userTable.id, foundSession.userId),
          });

          if (foundUser) {
            socket.data.user = foundUser as any;
            socket.data.session = foundSession as any;
            return next();
          }
        }
      }

      logger.warn({ socketId: socket.id }, 'Rejected unauthenticated socket connection');
      return next(new Error('Unauthorized'));
    } catch (err: any) {
      logger.error({ err, socketId: socket.id }, 'Socket authentication error');
      next(new Error('Authentication failed'));
    }
  });

  // 2. Connection Handler
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.data.user;

    logger.info({ socketId: socket.id, userId: user.id, email: user.email }, 'Authenticated socket connected');

    // Room-per-flat join handler with DB membership verification
    socket.on('join_flat', async (data: { flatId: string }) => {
      try {
        if (!data?.flatId) return;

        // Verify user is actually a member of this flat
        const [membership] = await db
          .select()
          .from(flatMembers)
          .where(
            and(
              eq(flatMembers.flatId, data.flatId),
              eq(flatMembers.userId, user.id)
            )
          );

        if (!membership) {
          logger.warn(
            { socketId: socket.id, userId: user.id, flatId: data.flatId },
            'Unauthorized attempt to join flat room'
          );
          socket.emit('error', { message: 'Not a member of this flat' });
          return;
        }

        socket.join(data.flatId);
        logger.info(
          { socketId: socket.id, userId: user.id, flatId: data.flatId },
          'User joined flat socket room'
        );
      } catch (error) {
        logger.error({ error, socketId: socket.id }, 'Error joining flat socket room');
      }
    });

    socket.on('leave_flat', (data: { flatId: string }) => {
      if (data?.flatId) {
        socket.leave(data.flatId);
        logger.info({ socketId: socket.id, flatId: data.flatId }, 'User left flat socket room');
      }
    });

    // Register event handlers (e.g. send_message)
    registerSocketHandlers(io!, authSocket);

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId: user.id, reason }, 'Socket disconnected');
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
