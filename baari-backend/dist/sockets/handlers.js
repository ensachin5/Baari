"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastMessageDeleted = exports.broadcastMessageEdited = exports.broadcastAnnouncementUpdated = exports.broadcastGroceryUpdated = exports.broadcastActivityEvent = exports.broadcastTaskDeleted = exports.broadcastTaskCompleted = exports.registerSocketHandlers = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const chat_js_1 = require("../schemas/chat.js");
const error_handler_js_1 = require("../middleware/error-handler.js");
const push_js_1 = require("../services/push.js");
const drizzle_orm_1 = require("drizzle-orm");
const registerSocketHandlers = (io, socket) => {
    // Realtime Chat Message Handler
    socket.on('send_message', async (data, callback) => {
        const senderId = socket.data.user.id;
        const senderName = socket.data.user.name;
        error_handler_js_1.logger.info({
            socketId: socket.id,
            senderId,
            senderName,
            flatId: data?.flatId,
            payload: { flatId: data?.flatId, contentLength: data?.content?.length, contentPreview: data?.content?.slice(0, 30) },
        }, '[Socket send_message] Received send_message event');
        try {
            const parsed = chat_js_1.sendMessageSchema.safeParse(data);
            if (!parsed.success) {
                const errorMsg = parsed.error.issues[0]?.message || 'Invalid message payload';
                error_handler_js_1.logger.warn({ socketId: socket.id, senderId, errorMsg, issues: parsed.error.issues }, '[Socket send_message] Validation failed');
                if (callback)
                    callback({ error: errorMsg });
                return;
            }
            const { flatId, content } = parsed.data;
            // Verify sender is a member of the flat
            const [membership] = await index_js_1.db
                .select()
                .from(schema_js_1.flatMembers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId), (0, drizzle_orm_1.eq)(schema_js_1.flatMembers.userId, senderId)));
            if (!membership) {
                error_handler_js_1.logger.warn({ socketId: socket.id, senderId, flatId }, '[Socket send_message] Sender is not a member of flat');
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
            error_handler_js_1.logger.info({
                socketId: socket.id,
                messageId: newMessage.id,
                flatId,
                senderId,
                dbInsertSucceeded: true,
            }, '[Socket send_message] DB insert succeeded');
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
                sender: sender || { id: senderId, name: senderName, image: socket.data.user.image },
            };
            // Check how many sockets are currently in the flat room at broadcast time
            const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
            const roomSockets = await io.in(flatId).fetchSockets();
            const connectedUserIdsInRoom = roomSockets.map((s) => ({
                socketId: s.id,
                userId: s.data?.user?.id,
                userName: s.data?.user?.name,
            }));
            // Broadcast new message to everyone in the flat room (including sender)
            io.to(flatId).emit('new_message', { message: messagePayload });
            error_handler_js_1.logger.info({
                socketId: socket.id,
                messageId: newMessage.id,
                flatId,
                roomSocketCount: roomSize,
                connectedUsersInRoom: connectedUserIdsInRoom,
            }, '[Socket send_message] Broadcasted new_message to flat room');
            // Send push notification to offline/disconnected members
            try {
                const allMembers = await index_js_1.db
                    .select({ userId: schema_js_1.flatMembers.userId })
                    .from(schema_js_1.flatMembers)
                    .where((0, drizzle_orm_1.eq)(schema_js_1.flatMembers.flatId, flatId));
                const activeUserIdsInRoom = new Set(roomSockets.map((s) => s.data?.user?.id));
                const offlineUserIds = allMembers
                    .map((m) => m.userId)
                    .filter((uid) => uid !== senderId && !activeUserIdsInRoom.has(uid));
                error_handler_js_1.logger.info({
                    flatId,
                    senderId,
                    senderName,
                    totalFlatMembers: allMembers.length,
                    activeSocketsInRoom: roomSockets.length,
                    offlineRecipientIds: offlineUserIds,
                }, '[Push Trigger 1: Chat Message] Code path reached for chat message push dispatch');
                if (offlineUserIds.length > 0) {
                    const truncated = content.length > 50 ? `${content.substring(0, 47)}...` : content;
                    (0, push_js_1.sendPushNotification)(offlineUserIds, {
                        title: senderName || 'Flatmate',
                        body: truncated,
                        data: { type: 'chat', flatId },
                    });
                    error_handler_js_1.logger.info({ flatId, offlineUserCount: offlineUserIds.length, offlineUserIds }, '[Push Trigger 1: Chat Message] Dispatched sendPushNotification to offline members');
                }
                else {
                    error_handler_js_1.logger.info({ flatId }, '[Push Trigger 1: Chat Message] All other flat members are currently active in room. No offline push required.');
                }
            }
            catch (pushErr) {
                error_handler_js_1.logger.warn({ pushErr: pushErr?.message, flatId }, '[Push Trigger 1: Chat Message] Failed to dispatch push notification');
            }
            if (callback) {
                callback({ success: true, message: messagePayload });
            }
        }
        catch (error) {
            error_handler_js_1.logger.error({ error: error?.message || error, socketId: socket.id, senderId }, 'Error in send_message socket handler');
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
    const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
    error_handler_js_1.logger.info({ flatId, roomSocketCount: roomSize, occurrenceId: data.occurrenceId }, 'Broadcasting task_completed');
    io.to(flatId).emit('task_completed', data);
};
exports.broadcastTaskCompleted = broadcastTaskCompleted;
const broadcastTaskDeleted = (io, flatId, data) => {
    const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
    error_handler_js_1.logger.info({ flatId, roomSocketCount: roomSize, taskId: data.taskId }, 'Broadcasting task_deleted');
    io.to(flatId).emit('task_deleted', data);
};
exports.broadcastTaskDeleted = broadcastTaskDeleted;
const broadcastActivityEvent = (io, flatId, entry) => {
    const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
    error_handler_js_1.logger.info({
        flatId,
        activityType: entry?.type,
        actorId: entry?.actorId || entry?.actor?.id,
        actorName: entry?.actorName || entry?.actor?.name,
        roomSocketCount: roomSize,
    }, '[Push Trigger 3: Activity Event] Code path reached for activity event broadcast');
    io.to(flatId).emit('activity_event', { entry });
};
exports.broadcastActivityEvent = broadcastActivityEvent;
const broadcastGroceryUpdated = (io, flatId, data) => {
    const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
    error_handler_js_1.logger.info({ flatId, roomSocketCount: roomSize }, 'Broadcasting grocery_updated');
    io.to(flatId).emit('grocery_updated', data || {});
};
exports.broadcastGroceryUpdated = broadcastGroceryUpdated;
const broadcastAnnouncementUpdated = (io, flatId, data) => {
    const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
    error_handler_js_1.logger.info({ flatId, roomSocketCount: roomSize }, 'Broadcasting announcement_updated');
    io.to(flatId).emit('announcement_updated', data || {});
};
exports.broadcastAnnouncementUpdated = broadcastAnnouncementUpdated;
const broadcastMessageEdited = (io, flatId, data) => {
    const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
    error_handler_js_1.logger.info({ flatId, messageId: data.messageId, roomSocketCount: roomSize }, 'Broadcasting message_edited to flat room');
    io.to(flatId).emit('message_edited', data);
};
exports.broadcastMessageEdited = broadcastMessageEdited;
const broadcastMessageDeleted = (io, flatId, data) => {
    const roomSize = io.sockets.adapter.rooms.get(flatId)?.size || 0;
    error_handler_js_1.logger.info({ flatId, messageId: data.messageId, roomSocketCount: roomSize }, 'Broadcasting message_deleted to flat room');
    io.to(flatId).emit('message_deleted', data);
};
exports.broadcastMessageDeleted = broadcastMessageDeleted;
