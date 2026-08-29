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

    const tokens = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(inArray(pushTokens.userId, userIds));

    if (tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title: message.title,
      body: message.body,
      data: message.data || {},
    }));

    // Chunk messages for Expo Push API (max 100 per request)
    const chunks: typeof messages[] = [];
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
        logger.error({ status: response.status }, 'Expo push notification batch failed');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error sending push notifications');
  }
};
