"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
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
