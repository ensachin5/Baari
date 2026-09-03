"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastActivityEvent = exports.broadcastTaskDeleted = exports.broadcastTaskCompleted = exports.registerSocketHandlers = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const chat_js_1 = require("../schemas/chat.js");
const error_handler_js_1 = require("../middleware/error-handler.js");
const push_js_1 = require("../services/push.js");
const drizzle_orm_1 = require("drizzle-orm");
const registerSocketHandlers = (io, socket) => {
    // Realtime Chat Message Handler
    socket.on('send_message', async (data, callback) => {
        try {
            const parsed = chat_js_1.sendMessageSchema.safeParse(data);
            if (!parsed.success) {
                const errorMsg = parsed.error.issues[0]?.message || 'Invalid message payload';
                if (callback)
                    callback({ error: errorMsg });
                return;
            }
            const { flatId, content } = parsed.data;
            const senderId = socket.data.user.id;
            // Verify sender is a member of the flat
            const [membership] = await index_js_1.db
                .select()
                .from(schema_js_1.flatMembers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, senderId)));
            if (!membership) {
                if (callback)
                    callback({ error: 'You are not a member of this flat' });
                return;
            }
            // Save message to DB
            const [newMessage] = await index_js_1.db
                .insert(schema_js_1.messages)
                .values({
                flatId,
                senderId,
                content: content.trim(),
            })
                .returning();
            // Fetch sender info for frontend rendering
            const [sender] = await index_js_1.db
                .select({
                id: schema_js_1.user.id,
                name: schema_js_1.user.name,
                image: schema_js_1.user.image,
            })
                .from(schema_js_1.user)
                .where((0, drizzle_orm_1.eq)(schema_js_1.user.id, senderId));
            const messagePayload = {
                ...newMessage,
                sender: sender || { id: senderId, name: socket.data.user.name, image: socket.data.user.image },
            };
            // Broadcast new message to everyone in the flat room (including sender)
            io.to(flatId).emit('new_message', { message: messagePayload });
            // Send push notification to offline/disconnected members
            try {
                const allMembers = await index_js_1.db
                    .select({ userId: schema_js_1.flatMembers.userId })
                    .from(schema_js_1.flatMembers)
                    .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId));
                const roomSockets = await io.in(flatId).fetchSockets();
                const activeUserIdsInRoom = new Set(roomSockets.map((s) => s.data?.user?.id));
                const offlineUserIds = allMembers
                    .map((m) => m.userId)
                    .filter((uid) => uid !== senderId && !activeUserIdsInRoom.has(uid));
                if (offlineUserIds.length > 0) {
                    const truncated = content.length > 50 ? `${content.substring(0, 47)}...` : content;
                    (0, push_js_1.sendPushNotification)(offlineUserIds, {
                        title: socket.data.user.name || 'Flatmate',
                        body: truncated,
                        data: { type: 'chat', flatId },
                    });
                }
            }
            catch (_) { }
            if (callback)
                callback({ success: true, message: messagePayload });
        }
        catch (error) {
            error_handler_js_1.logger.error({ error, socketId: socket.id }, 'Error in send_message socket handler');
            if (callback)
                callback({ error: 'Failed to send message' });
        }
    });
    // Typing Indicator Handler
    socket.on('typing', (data) => {
        if (!data?.flatId)
            return;
        socket.to(data.flatId).emit('user_typing', {
            userId: socket.data.user.id,
            userName: socket.data.user.name,
            isTyping: !!data.isTyping,
        });
    });
};
exports.registerSocketHandlers = registerSocketHandlers;
// Helper broadcaster functions for REST endpoints
const broadcastTaskCompleted = (io, flatId, data) => {
    io.to(flatId).emit('task_completed', data);
};
exports.broadcastTaskCompleted = broadcastTaskCompleted;
const broadcastTaskDeleted = (io, flatId, data) => {
    io.to(flatId).emit('task_deleted', data);
};
exports.broadcastTaskDeleted = broadcastTaskDeleted;
const broadcastActivityEvent = (io, flatId, entry) => {
    io.to(flatId).emit('activity_event', { entry });
};
exports.broadcastActivityEvent = broadcastActivityEvent;
