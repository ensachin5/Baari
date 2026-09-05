import { db } from '../db/index.js';
import { pushTokens } from '../db/schema.js';
import { inArray } from 'drizzle-orm';
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
  const logPrefix = '[Push Notification Pipeline]';

  try {
    if (!userIds || userIds.length === 0) {
      logger.warn({ msg: `${logPrefix} sendPushNotification called with empty userIds list` });
      return;
    }

    logger.info(
      {
        targetUserIds: userIds,
        userCount: userIds.length,
        notification: {
          title: message.title,
          body: message.body,
          data: message.data,
        },
      },
      `${logPrefix} Initiating push dispatch to ${userIds.length} user(s)`
    );

    const tokenRecords = await db
      .select({
        id: pushTokens.id,
        userId: pushTokens.userId,
        token: pushTokens.token,
        deviceType: pushTokens.deviceType,
      })
      .from(pushTokens)
      .where(inArray(pushTokens.userId, userIds));

    if (tokenRecords.length === 0) {
      logger.info(
        {
          targetUserIds: userIds,
          tokensFoundCount: 0,
        },
        `${logPrefix} No push tokens registered in DB for targeted user(s). Notification skipped.`
      );
      return;
    }

    logger.info(
      {
        targetUserIds: userIds,
        tokensFoundCount: tokenRecords.length,
        tokens: tokenRecords.map((t) => ({
          id: t.id,
          userId: t.userId,
          deviceType: t.deviceType,
          tokenPreview:
            t.token.length > 25
              ? `${t.token.substring(0, 15)}...${t.token.substring(t.token.length - 8)}`
              : t.token,
        })),
      },
      `${logPrefix} Found ${tokenRecords.length} token(s) in DB. Preparing payload...`
    );

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
      const chunkStartIndex = i * 100;

      logger.info(
        {
          chunkIndex: i + 1,
          totalChunks: chunks.length,
          tokensInChunk: chunk.length,
        },
        `${logPrefix} Sending batch ${i + 1}/${chunks.length} to Expo Push API (https://exp.host/--/api/v2/push/send)...`
      );

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
      let resData: any = null;

      try {
        resData = await response.json();
      } catch (jsonErr: any) {
        logger.error(
          {
            httpStatus: responseStatus,
            error: jsonErr?.message,
          },
          `${logPrefix} Failed to parse JSON response from Expo Push API`
        );
      }

      if (!response.ok) {
        logger.error(
          {
            httpStatus: responseStatus,
            responseBody: resData,
          },
          `${logPrefix} Expo Push API returned non-200 HTTP status code`
        );
        continue;
      }

      logger.info(
        {
          httpStatus: responseStatus,
          ticketsCount: resData?.data?.length || 0,
          rawResponse: resData,
        },
        `${logPrefix} Received HTTP 200 response from Expo Push API`
      );

      // Log receipt/ticket for EACH individual token
      if (resData?.data && Array.isArray(resData.data)) {
        const invalidTokenIds: string[] = [];

        resData.data.forEach((ticket: any, idx: number) => {
          const tokenRecord = tokenRecords[chunkStartIndex + idx];
          const tokenPreview = tokenRecord?.token
            ? tokenRecord.token.length > 25
              ? `${tokenRecord.token.substring(0, 15)}...${tokenRecord.token.substring(tokenRecord.token.length - 8)}`
              : tokenRecord.token
            : 'unknown';

          if (ticket.status === 'ok') {
            logger.info(
              {
                userId: tokenRecord?.userId,
                tokenId: tokenRecord?.id,
                deviceType: tokenRecord?.deviceType,
                tokenPreview,
                ticketId: ticket.id,
                status: 'ok',
              },
              `${logPrefix} [SUCCESS] Ticket received for token (${tokenPreview}) -> Ticket ID: ${ticket.id}`
            );
          } else if (ticket.status === 'error') {
            const errorCode = ticket.details?.error || 'UnknownError';
            logger.warn(
              {
                userId: tokenRecord?.userId,
                tokenId: tokenRecord?.id,
                deviceType: tokenRecord?.deviceType,
                tokenPreview,
                errorMessage: ticket.message,
                errorCode,
                details: ticket.details,
              },
              `${logPrefix} [ERROR] Ticket returned error for token (${tokenPreview}) -> ${errorCode}: ${ticket.message}`
            );

            if (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials') {
              if (tokenRecord?.id) {
                invalidTokenIds.push(tokenRecord.id);
              }
            }
          }
        });

        if (invalidTokenIds.length > 0) {
          logger.info(
            { invalidTokenIds },
            `${logPrefix} Purging ${invalidTokenIds.length} unregistered/expired token(s) from DB`
          );
          await db.delete(pushTokens).where(inArray(pushTokens.id, invalidTokenIds));
        }
      }
    }
  } catch (error: any) {
    logger.error(
      {
        error: error?.message || error,
        stack: error?.stack,
        userIds,
      },
      `${logPrefix} Unexpected exception in push notification dispatcher`
    );
  }
};

export const sendPushToUser = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  logger.info(
    {
      userId,
      title,
      body,
      data,
    },
    '[Push Notification Pipeline] sendPushToUser called'
  );
  return sendPushNotification([userId], { title, body, data });
};
