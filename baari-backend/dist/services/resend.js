"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDigestEmail = exports.sendEmail = void 0;
const error_handler_js_1 = require("../middleware/error-handler.js");
const sendEmail = async (payload) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        error_handler_js_1.logger.info({ to: payload.to, subject: payload.subject }, 'Resend API key not configured. Mocking email delivery.');
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
            error_handler_js_1.logger.error({ error: errorText }, 'Failed to send email via Resend');
            return false;
        }
        return true;
    }
    catch (error) {
        error_handler_js_1.logger.error({ error }, 'Error sending email');
        return false;
    }
};
exports.sendEmail = sendEmail;
const sendDigestEmail = async (user, summary) => {
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
    return (0, exports.sendEmail)({
        to: user.email,
        subject: 'Your Weekly Household Digest — Baari',
        html,
    });
};
exports.sendDigestEmail = sendDigestEmail;
