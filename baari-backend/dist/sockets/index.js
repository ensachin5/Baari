"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const auth_js_1 = require("../auth.js");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const auth_schema_js_1 = require("../db/auth-schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const handlers_js_1 = require("./handlers.js");
const error_handler_js_1 = require("../middleware/error-handler.js");
let io = null;
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
const initSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow mobile apps, curl, tools with no origin header
                if (!origin)
                    return callback(null, true);
                if (ALLOWED_SOCKET_ORIGINS.includes(origin) ||
                    origin.endsWith('.vercel.app') ||
                    origin.startsWith('http://localhost:') ||
                    origin.startsWith('http://127.0.0.1:') ||
                    origin.startsWith('baari://') ||
                    origin.startsWith('exp://')) {
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
            const rawToken = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
            const rawCookie = socket.handshake.headers?.cookie;
            let cookieToken = null;
            if (rawCookie) {
                const match = rawCookie.match(/(?:better-auth\.session_token|session_token|baari_session_token)=([^;]+)/);
                if (match?.[1]) {
                    cookieToken = decodeURIComponent(match[1]);
                }
            }
            const token = rawToken || cookieToken;
            error_handler_js_1.logger.info({ socketId: socket.id, hasToken: !!token, hasCookie: !!rawCookie }, '[Socket Handshake] Authenticating incoming socket connection');
            // 1. Try Better Auth getSession
            try {
                const headers = new Headers();
                if (token) {
                    headers.set('authorization', `Bearer ${token}`);
                }
                if (rawCookie) {
                    headers.set('cookie', rawCookie);
                }
                const session = await auth_js_1.auth.api.getSession({ headers });
                if (session && session.user) {
                    socket.data.user = session.user;
                    socket.data.session = session.session;
                    error_handler_js_1.logger.info({ socketId: socket.id, userId: session.user.id, name: session.user.name, authenticated: true, method: 'better-auth' }, '[Socket Handshake] Authentication succeeded via Better Auth');
                    return next();
                }
            }
            catch (err) {
                error_handler_js_1.logger.debug({ err: err?.message, socketId: socket.id }, '[Socket Handshake] Better Auth getSession returned error');
            }
            // 2. Direct database query fallback against session & user tables
            if (token) {
                const cleanToken = token.split('.')[0] || token;
                const [foundSession] = await index_js_1.db
                    .select()
                    .from(auth_schema_js_1.session)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(auth_schema_js_1.session.token, cleanToken), (0, drizzle_orm_1.gt)(auth_schema_js_1.session.expiresAt, new Date())));
                if (foundSession) {
                    const [foundUser] = await index_js_1.db
                        .select()
                        .from(auth_schema_js_1.user)
                        .where((0, drizzle_orm_1.eq)(auth_schema_js_1.user.id, foundSession.userId));
                    if (foundUser) {
                        socket.data.user = foundUser;
                        socket.data.session = foundSession;
                        error_handler_js_1.logger.info({ socketId: socket.id, userId: foundUser.id, name: foundUser.name, authenticated: true, method: 'db-fallback' }, '[Socket Handshake] Authentication succeeded via DB fallback');
                        return next();
                    }
                }
            }
            error_handler_js_1.logger.warn({ socketId: socket.id, authenticated: false, tokenProvided: !!token, cookieProvided: !!rawCookie }, '[Socket Handshake] Rejected unauthenticated socket connection');
            return next(new Error('Unauthorized'));
        }
        catch (err) {
            error_handler_js_1.logger.error({ err: err?.message || err, socketId: socket.id, authenticated: false }, '[Socket Handshake] Authentication exception');
            next(new Error('Authentication failed'));
        }
    });
    // 2. Connection Handler
    io.on('connection', (socket) => {
        const authSocket = socket;
        const user = authSocket.data.user;
        // Track joined flats on this socket for disconnect logging
        authSocket.data.joinedFlats = authSocket.data.joinedFlats || new Set();
        error_handler_js_1.logger.info({ socketId: socket.id, userId: user?.id, userName: user?.name, email: user?.email, authenticated: true }, 'Socket connected');
        // Room-per-flat join handler with DB membership verification
        socket.on('join_flat', async (data) => {
            const flatId = data?.flatId;
            error_handler_js_1.logger.info({ socketId: socket.id, userId: user.id, flatId }, '[Socket join_flat] Received join_flat request');
            try {
                if (!flatId) {
                    error_handler_js_1.logger.warn({ socketId: socket.id, userId: user.id }, '[Socket join_flat] Missing flatId in payload');
                    return;
                }
                // Verify user is actually a member of this flat
                const [membership] = await index_js_1.db
                    .select()
                    .from(schema_js_1.flatMembers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, user.id)));
                if (!membership) {
                    error_handler_js_1.logger.warn({ socketId: socket.id, userId: user.id, flatId, membershipPassed: false }, '[Socket join_flat] Unauthorized: user is not a member of requested flat');
                    socket.emit('error', { message: 'Not a member of this flat' });
                    return;
                }
                // Join room and record
                socket.join(flatId);
                authSocket.data.joinedFlats.add(flatId);
                const roomSize = io?.sockets.adapter.rooms.get(flatId)?.size || 0;
                error_handler_js_1.logger.info({
                    socketId: socket.id,
                    userId: user.id,
                    userName: user.name,
                    flatId,
                    membershipPassed: true,
                    roomSocketCount: roomSize,
                }, 'Socket joined flat room');
            }
            catch (error) {
                error_handler_js_1.logger.error({ error: error?.message || error, socketId: socket.id, userId: user.id, flatId }, '[Socket join_flat] Error joining flat socket room');
            }
        });
        socket.on('leave_flat', (data) => {
            if (data?.flatId) {
                socket.leave(data.flatId);
                authSocket.data.joinedFlats?.delete(data.flatId);
                const roomSize = io?.sockets.adapter.rooms.get(data.flatId)?.size || 0;
                error_handler_js_1.logger.info({ socketId: socket.id, userId: user.id, flatId: data.flatId, remainingInRoom: roomSize }, 'Socket left flat room');
            }
        });
        // Register event handlers (e.g. send_message)
        (0, handlers_js_1.registerSocketHandlers)(io, authSocket);
        socket.on('disconnect', (reason) => {
            const joinedFlats = Array.from(authSocket.data.joinedFlats || []);
            error_handler_js_1.logger.info({
                socketId: socket.id,
                userId: user.id,
                userName: user.name,
                joinedFlats,
                reason,
            }, 'Socket disconnected');
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
exports.getIO = getIO;
