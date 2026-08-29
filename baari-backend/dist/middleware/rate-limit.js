"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalRateLimiter = exports.authRateLimiter = exports.lenientAuthRateLimiter = exports.strictAuthRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Strict limiter for credential-guessing sensitive endpoints (sign-in/email, sign-up/email): 5 req / 15 min (50 in dev)
exports.strictAuthRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 5 : 50,
    message: { error: 'Too many authentication attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Lenient limiter for OAuth flows, callbacks, session checks, and proxy endpoints: 30 req / 15 min (300 in dev)
exports.lenientAuthRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 30 : 300,
    message: { error: 'Too many auth requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Backward compatibility alias for lenient auth limiter
exports.authRateLimiter = exports.lenientAuthRateLimiter;
// General API limiter: 200 req / 15 min (1000 in dev)
exports.generalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 200 : 1000,
    message: { error: 'Too many requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});
