"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushToUser = exports.sendPushNotification = void 0;
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const error_handler_js_1 = require("../middleware/error-handler.js");
const sendPushNotification = async (userIds, message) => {
    const logPrefix = '[Push Notification Pipeline]';
    try {
        if (!userIds || userIds.length === 0) {
            error_handler_js_1.logger.warn({ msg: `${logPrefix} sendPushNotification called with empty userIds list` });
            return;
        }
        error_handler_js_1.logger.info({
            targetUserIds: userIds,
            userCount: userIds.length,
            notification: {
                title: message.title,
                body: message.body,
                data: message.data,
            },
        }, `${logPrefix} Initiating push dispatch to ${userIds.length} user(s)`);
        const tokenRecords = await index_js_1.db
            .select({
            id: schema_js_1.pushTokens.id,
            userId: schema_js_1.pushTokens.userId,
            token: schema_js_1.pushTokens.token,
            deviceType: schema_js_1.pushTokens.deviceType,
        })
            .from(schema_js_1.pushTokens)
            .where((0, drizzle_orm_1.inArray)(schema_js_1.pushTokens.userId, userIds));
        if (tokenRecords.length === 0) {
            error_handler_js_1.logger.info({
                targetUserIds: userIds,
                tokensFoundCount: 0,
            }, `${logPrefix} No push tokens registered in DB for targeted user(s). Notification skipped.`);
            return;
        }
        error_handler_js_1.logger.info({
            targetUserIds: userIds,
            tokensFoundCount: tokenRecords.length,
            tokens: tokenRecords.map((t) => ({
                id: t.id,
                userId: t.userId,
                deviceType: t.deviceType,
                tokenPreview: t.token.length > 25
                    ? `${t.token.substring(0, 15)}...${t.token.substring(t.token.length - 8)}`
                    : t.token,
            })),
        }, `${logPrefix} Found ${tokenRecords.length} token(s) in DB. Preparing payload...`);
        const messages = tokenRecords.map((t) => ({
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
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkStartIndex = i * 100;
            error_handler_js_1.logger.info({
                chunkIndex: i + 1,
                totalChunks: chunks.length,
                tokensInChunk: chunk.length,
            }, `${logPrefix} Sending batch ${i + 1}/${chunks.length} to Expo Push API (https://exp.host/--/api/v2/push/send)...`);
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify(chunk),
            });
            const responseStatus = response.status;
            let resData = null;
            try {
                resData = await response.json();
            }
            catch (jsonErr) {
                error_handler_js_1.logger.error({
                    httpStatus: responseStatus,
                    error: jsonErr?.message,
                }, `${logPrefix} Failed to parse JSON response from Expo Push API`);
            }
            if (!response.ok) {
                error_handler_js_1.logger.error({
                    httpStatus: responseStatus,
                    responseBody: resData,
                }, `${logPrefix} Expo Push API returned non-200 HTTP status code`);
                continue;
            }
            error_handler_js_1.logger.info({
                httpStatus: responseStatus,
                ticketsCount: resData?.data?.length || 0,
                rawResponse: resData,
            }, `${logPrefix} Received HTTP 200 response from Expo Push API`);
            // Log receipt/ticket for EACH individual token
            if (resData?.data && Array.isArray(resData.data)) {
                const invalidTokenIds = [];
                resData.data.forEach((ticket, idx) => {
                    const tokenRecord = tokenRecords[chunkStartIndex + idx];
                    const tokenPreview = tokenRecord?.token
                        ? tokenRecord.token.length > 25
                            ? `${tokenRecord.token.substring(0, 15)}...${tokenRecord.token.substring(tokenRecord.token.length - 8)}`
                            : tokenRecord.token
                        : 'unknown';
                    if (ticket.status === 'ok') {
                        error_handler_js_1.logger.info({
                            userId: tokenRecord?.userId,
                            tokenId: tokenRecord?.id,
                            deviceType: tokenRecord?.deviceType,
                            tokenPreview,
                            ticketId: ticket.id,
                            status: 'ok',
                        }, `${logPrefix} [SUCCESS] Ticket received for token (${tokenPreview}) -> Ticket ID: ${ticket.id}`);
                    }
                    else if (ticket.status === 'error') {
                        const errorCode = ticket.details?.error || 'UnknownError';
                        error_handler_js_1.logger.warn({
                            userId: tokenRecord?.userId,
                            tokenId: tokenRecord?.id,
                            deviceType: tokenRecord?.deviceType,
                            tokenPreview,
                            errorMessage: ticket.message,
                            errorCode,
                            details: ticket.details,
                        }, `${logPrefix} [ERROR] Ticket returned error for token (${tokenPreview}) -> ${errorCode}: ${ticket.message}`);
                        if (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials') {
                            if (tokenRecord?.id) {
                                invalidTokenIds.push(tokenRecord.id);
                            }
                        }
                    }
                });
                if (invalidTokenIds.length > 0) {
                    error_handler_js_1.logger.info({ invalidTokenIds }, `${logPrefix} Purging ${invalidTokenIds.length} unregistered/expired token(s) from DB`);
                    await index_js_1.db.delete(schema_js_1.pushTokens).where((0, drizzle_orm_1.inArray)(schema_js_1.pushTokens.id, invalidTokenIds));
                }
            }
        }
    }
    catch (error) {
        error_handler_js_1.logger.error({
            error: error?.message || error,
            stack: error?.stack,
            userIds,
        }, `${logPrefix} Unexpected exception in push notification dispatcher`);
    }
};
exports.sendPushNotification = sendPushNotification;
const sendPushToUser = async (userId, title, body, data) => {
    error_handler_js_1.logger.info({
        userId,
        title,
        body,
        data,
    }, '[Push Notification Pipeline] sendPushToUser called');
    return (0, exports.sendPushNotification)([userId], { title, body, data });
};
exports.sendPushToUser = sendPushToUser;
