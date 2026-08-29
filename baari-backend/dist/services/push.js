"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const error_handler_js_1 = require("../middleware/error-handler.js");
const sendPushNotification = async (userIds, message) => {
    try {
        if (!userIds || userIds.length === 0)
            return;
        const tokens = await index_js_1.db
            .select({ token: schema_js_1.pushTokens.token })
            .from(schema_js_1.pushTokens)
            .where((0, drizzle_orm_1.inArray)(schema_js_1.pushTokens.userId, userIds));
        if (tokens.length === 0)
            return;
        const messages = tokens.map((t) => ({
            to: t.token,
            sound: 'default',
            title: message.title,
            body: message.body,
            data: message.data || {},
        }));
        // Chunk messages for Expo Push API (max 100 per request)
        const chunks = [];
        for (let i = 0; i < messages.length; i += 100) {
            chunks.push(messages.slice(i, i + 100));
        }
        for (const chunk of chunks) {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(chunk),
            });
            if (!response.ok) {
                error_handler_js_1.logger.error({ status: response.status }, 'Expo push notification batch failed');
            }
        }
    }
    catch (error) {
        error_handler_js_1.logger.error({ error }, 'Error sending push notifications');
    }
};
exports.sendPushNotification = sendPushNotification;
