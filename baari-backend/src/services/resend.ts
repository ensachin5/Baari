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

export const sendDigestEmail = async (
  user: { name: string; email: string },
  summary: { completedTasks: number; totalExpenses: number; pendingTasks: number }
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0A2540; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0A2540;">Weekly Baari Summary for ${user.name}</h2>
      <p>Here is your household activity digest for the week:</p>
      <ul>
        <li><strong>Tasks Completed:</strong> ${summary.completedTasks}</li>
        <li><strong>Pending Tasks:</strong> ${summary.pendingTasks}</li>
        <li><strong>Total Expenses Logged:</strong> ₹${summary.totalExpenses}</li>
      </ul>
      <p>Keep your flat running smoothly with <a href="https://baari.app" style="color: #5AC8FA;">Baari</a>!</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Your Weekly Household Digest — Baari',
    html,
  });
};
