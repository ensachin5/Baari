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
const initSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
        transports: ['polling', 'websocket'],
        allowUpgrades: true,
    });
    // 1. Authenticate Socket Connections on initial handshake
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
            const headers = new Headers();
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            else if (socket.handshake.headers.cookie) {
                headers.set('cookie', socket.handshake.headers.cookie);
            }
            const session = await auth_js_1.auth.api.getSession({ headers });
            if (session && session.user) {
                socket.data.user = session.user;
                socket.data.session = session.session;
                return next();
            }
            // Fallback: check session table directly in Neon DB
            if (token) {
                const foundSession = await index_js_1.db.query.session.findFirst({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(auth_schema_js_1.session.token, token), (0, drizzle_orm_1.gt)(auth_schema_js_1.session.expiresAt, new Date())),
                });
                if (foundSession) {
                    const foundUser = await index_js_1.db.query.user.findFirst({
                        where: (0, drizzle_orm_1.eq)(auth_schema_js_1.user.id, foundSession.userId),
                    });
                    if (foundUser) {
                        socket.data.user = foundUser;
                        socket.data.session = foundSession;
                        return next();
                    }
                }
            }
            error_handler_js_1.logger.warn({ socketId: socket.id }, 'Rejected unauthenticated socket connection');
            return next(new Error('Unauthorized'));
        }
        catch (err) {
            error_handler_js_1.logger.error({ err, socketId: socket.id }, 'Socket authentication error');
            next(new Error('Authentication failed'));
        }
    });
    // 2. Connection Handler
    io.on('connection', (socket) => {
        const authSocket = socket;
        const user = authSocket.data.user;
        error_handler_js_1.logger.info({ socketId: socket.id, userId: user.id, email: user.email }, 'Authenticated socket connected');
        // Room-per-flat join handler with DB membership verification
        socket.on('join_flat', async (data) => {
            try {
                if (!data?.flatId)
                    return;
                // Verify user is actually a member of this flat
                const [membership] = await index_js_1.db
                    .select()
                    .from(schema_js_1.flatMembers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, data.flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, user.id)));
                if (!membership) {
                    error_handler_js_1.logger.warn({ socketId: socket.id, userId: user.id, flatId: data.flatId }, 'Unauthorized attempt to join flat room');
                    socket.emit('error', { message: 'Not a member of this flat' });
                    return;
                }
                socket.join(data.flatId);
                error_handler_js_1.logger.info({ socketId: socket.id, userId: user.id, flatId: data.flatId }, 'User joined flat socket room');
            }
            catch (error) {
                error_handler_js_1.logger.error({ error, socketId: socket.id }, 'Error joining flat socket room');
            }
        });
        socket.on('leave_flat', (data) => {
            if (data?.flatId) {
                socket.leave(data.flatId);
                error_handler_js_1.logger.info({ socketId: socket.id, flatId: data.flatId }, 'User left flat socket room');
            }
        });
        // Register event handlers (e.g. send_message)
        (0, handlers_js_1.registerSocketHandlers)(io, authSocket);
        socket.on('disconnect', (reason) => {
            error_handler_js_1.logger.info({ socketId: socket.id, userId: user.id, reason }, 'Socket disconnected');
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
