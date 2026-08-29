import { logger } from '../middleware/error-handler.js';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info({ to: payload.to, subject: payload.subject }, 'Resend API key not configured. Mocking email delivery.');
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Baari <notifications@baari.app>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ error: errorText }, 'Failed to send email via Resend');
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ error }, 'Error sending email');
    return false;
  }
};
