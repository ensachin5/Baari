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

const ALLOWED_SOCKET_ORIGINS = [
  'https://baari-app.vercel.app',
  'https://baari-wkqq.onrender.com',
  'https://baari-backend.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081',
  'http://localhost:19000',
  'http://localhost:19006',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.replace(/\/+$/, '')] : []),
];

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow mobile apps, curl, tools with no origin header
        if (!origin) return callback(null, true);

        if (
          ALLOWED_SOCKET_ORIGINS.includes(origin) ||
          origin.endsWith('.vercel.app') ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('baari://') ||
          origin.startsWith('exp://')
        ) {
          return callback(null, true);
        }

        // Fallback: allow origin in dev/fallback with credentials
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
  });

  // 1. Authenticate Socket Connections on initial handshake
  io.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      const rawCookie = socket.handshake.headers?.cookie;

      let cookieToken: string | null = null;
      if (rawCookie) {
        const match = rawCookie.match(/(?:better-auth\.session_token|session_token|baari_session_token)=([^;]+)/);
        if (match?.[1]) {
          cookieToken = decodeURIComponent(match[1]);
        }
      }

      const token = rawToken || cookieToken;

      logger.info(
        { socketId: socket.id, hasToken: !!token, hasCookie: !!rawCookie },
        '[Socket Handshake] Authenticating incoming socket connection'
      );

      // 1. Try Better Auth getSession
      try {
        const headers = new Headers();
        if (token) {
          headers.set('authorization', `Bearer ${token}`);
        }
        if (rawCookie) {
          headers.set('cookie', rawCookie);
        }
        const session = await auth.api.getSession({ headers });
        if (session && session.user) {
          socket.data.user = session.user as any;
          socket.data.session = session.session;
          logger.info(
            { socketId: socket.id, userId: session.user.id, name: session.user.name, authenticated: true, method: 'better-auth' },
            '[Socket Handshake] Authentication succeeded via Better Auth'
          );
          return next();
        }
      } catch (err: any) {
        logger.debug({ err: err?.message, socketId: socket.id }, '[Socket Handshake] Better Auth getSession returned error');
      }

      // 2. Direct database query fallback against session & user tables
      if (token) {
        const cleanToken = token.split('.')[0] || token;
        const [foundSession] = await db
          .select()
          .from(sessionTable)
          .where(and(eq(sessionTable.token, cleanToken), gt(sessionTable.expiresAt, new Date())));

        if (foundSession) {
          const [foundUser] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, foundSession.userId));

          if (foundUser) {
            socket.data.user = foundUser as any;
            socket.data.session = foundSession as any;
            logger.info(
              { socketId: socket.id, userId: foundUser.id, name: foundUser.name, authenticated: true, method: 'db-fallback' },
              '[Socket Handshake] Authentication succeeded via DB fallback'
            );
            return next();
          }
        }
      }

      logger.warn(
        { socketId: socket.id, authenticated: false, tokenProvided: !!token, cookieProvided: !!rawCookie },
        '[Socket Handshake] Rejected unauthenticated socket connection'
      );
      return next(new Error('Unauthorized'));
    } catch (err: any) {
      logger.error({ err: err?.message || err, socketId: socket.id, authenticated: false }, '[Socket Handshake] Authentication exception');
      next(new Error('Authentication failed'));
    }
  });

  // 2. Connection Handler
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.data.user;

    // Track joined flats on this socket for disconnect logging
    (authSocket.data as any).joinedFlats = (authSocket.data as any).joinedFlats || new Set<string>();

    logger.info(
      { socketId: socket.id, userId: user?.id, userName: user?.name, email: user?.email, authenticated: true },
      'Socket connected'
    );

    // Room-per-flat join handler with DB membership verification
    socket.on('join_flat', async (data: { flatId: string }) => {
      const flatId = data?.flatId;
      logger.info(
        { socketId: socket.id, userId: user.id, flatId },
        '[Socket join_flat] Received join_flat request'
      );

      try {
        if (!flatId) {
          logger.warn({ socketId: socket.id, userId: user.id }, '[Socket join_flat] Missing flatId in payload');
          return;
        }

        // Verify user is actually a member of this flat
        const [membership] = await db
          .select()
          .from(flatMembers)
          .where(
            and(
              eq(flatMembers.flatId, flatId),
              eq(flatMembers.userId, user.id)
            )
          );

        if (!membership) {
          logger.warn(
            { socketId: socket.id, userId: user.id, flatId, membershipPassed: false },
            '[Socket join_flat] Unauthorized: user is not a member of requested flat'
          );
          socket.emit('error', { message: 'Not a member of this flat' });
          return;
        }

        // Join room and record
        socket.join(flatId);
        (authSocket.data as any).joinedFlats.add(flatId);

        const roomSize = io?.sockets.adapter.rooms.get(flatId)?.size || 0;

        logger.info(
          {
            socketId: socket.id,
            userId: user.id,
            userName: user.name,
            flatId,
            membershipPassed: true,
            roomSocketCount: roomSize,
          },
          'Socket joined flat room'
        );
      } catch (error: any) {
        logger.error(
          { error: error?.message || error, socketId: socket.id, userId: user.id, flatId },
          '[Socket join_flat] Error joining flat socket room'
        );
      }
    });

    socket.on('leave_flat', (data: { flatId: string }) => {
      if (data?.flatId) {
        socket.leave(data.flatId);
        (authSocket.data as any).joinedFlats?.delete(data.flatId);
        const roomSize = io?.sockets.adapter.rooms.get(data.flatId)?.size || 0;
        logger.info(
          { socketId: socket.id, userId: user.id, flatId: data.flatId, remainingInRoom: roomSize },
          'Socket left flat room'
        );
      }
    });

    // Register event handlers (e.g. send_message)
    registerSocketHandlers(io!, authSocket);

    socket.on('disconnect', (reason: string) => {
      const joinedFlats = Array.from((authSocket.data as any).joinedFlats || []);
      logger.info(
        {
          socketId: socket.id,
          userId: user.id,
          userName: user.name,
          joinedFlats,
          reason,
        },
        'Socket disconnected'
      );
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
