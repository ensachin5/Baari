"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const handlers_js_1 = require("./handlers.js");
const error_handler_js_1 = require("../middleware/error-handler.js");
let io = null;
const initSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        error_handler_js_1.logger.info({ socketId: socket.id }, 'Socket connected');
        socket.on('join_flat', (data) => {
            if (data?.flatId) {
                socket.join(data.flatId);
                error_handler_js_1.logger.info({ socketId: socket.id, flatId: data.flatId }, 'Socket joined flat room');
            }
        });
        socket.on('leave_flat', (data) => {
            if (data?.flatId) {
                socket.leave(data.flatId);
            }
        });
        (0, handlers_js_1.registerSocketHandlers)(io, socket);
        socket.on('disconnect', () => {
            error_handler_js_1.logger.info({ socketId: socket.id }, 'Socket disconnected');
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
