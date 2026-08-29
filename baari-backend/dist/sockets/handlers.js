"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastActivityEvent = exports.broadcastTaskCompleted = exports.registerSocketHandlers = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const error_handler_js_1 = require("../middleware/error-handler.js");
const drizzle_orm_1 = require("drizzle-orm");
const registerSocketHandlers = (io, socket) => {
    // Realtime Chat Message Sending
    socket.on('send_message', async (data) => {
        try {
            if (!data.flatId || !data.senderId || !data.content?.trim())
                return;
            const [newMessage] = await index_js_1.db
                .insert(schema_js_1.messages)
                .values({
                flatId: data.flatId,
                senderId: data.senderId,
                content: data.content.trim(),
            })
                .returning();
            // Fetch sender details
            const [sender] = await index_js_1.db
                .select({
                id: schema_js_1.user.id,
                name: schema_js_1.user.name,
                image: schema_js_1.user.image,
            })
                .from(schema_js_1.user)
                .where((0, drizzle_orm_1.eq)(schema_js_1.user.id, data.senderId));
            const messagePayload = {
                ...newMessage,
                sender: sender || { id: data.senderId, name: 'Flatmate', image: null },
            };
            // Broadcast to flat room
            io.to(data.flatId).emit('new_message', { message: messagePayload });
        }
        catch (error) {
            error_handler_js_1.logger.error({ error }, 'Error in send_message socket handler');
        }
    });
};
exports.registerSocketHandlers = registerSocketHandlers;
// Helper broadcaster functions for REST endpoints
const broadcastTaskCompleted = (io, flatId, data) => {
    io.to(flatId).emit('task_completed', data);
};
exports.broadcastTaskCompleted = broadcastTaskCompleted;
const broadcastActivityEvent = (io, flatId, entry) => {
    io.to(flatId).emit('activity_event', { entry });
};
exports.broadcastActivityEvent = broadcastActivityEvent;
