import { db } from '../db/index.js';
import { pushTokens } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { logger } from '../middleware/error-handler.js';

export interface PushNotificationMessage {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export const sendPushNotification = async (
  userIds: string[],
  message: PushNotificationMessage
): Promise<void> => {
  try {
    if (!userIds || userIds.length === 0) return;

    const tokenRecords = await db
      .select({ id: pushTokens.id, token: pushTokens.token })
      .from(pushTokens)
      .where(inArray(pushTokens.userId, userIds));

    if (tokenRecords.length === 0) return;

    const messages = tokenRecords.map((t) => ({
      to: t.token,
      sound: 'default' as const,
      title: message.title,
      body: message.body,
      data: message.data || {},
    }));

    // Chunk messages for Expo Push API (max 100 per request)
    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        logger.error({ status: response.status }, 'Expo push notification batch failed');
        continue;
      }

      const resData = (await response.json()) as { data: any[] };

      // Identify invalid/expired tokens and remove them
      if (resData?.data && Array.isArray(resData.data)) {
        const invalidTokenIds: string[] = [];
        resData.data.forEach((ticket, idx) => {
          if (
            ticket.status === 'error' &&
            ticket.details?.error === 'DeviceNotRegistered'
          ) {
            const tokenRecordIndex = i * 100 + idx;
            if (tokenRecords[tokenRecordIndex]) {
              invalidTokenIds.push(tokenRecords[tokenRecordIndex].id);
            }
          }
        });

        if (invalidTokenIds.length > 0) {
          logger.info({ invalidTokenIds }, 'Removing expired/unregistered push tokens');
          await db.delete(pushTokens).where(inArray(pushTokens.id, invalidTokenIds));
        }
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error sending push notifications');
  }
};

export const sendPushToUser = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  return sendPushNotification([userId], { title, body, data });
};
