import rateLimit from 'express-rate-limit';

// Strict limiter for credential-guessing sensitive endpoints (sign-in/email, sign-up/email): 5 req / 15 min (50 in dev)
export const strictAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient limiter for OAuth flows, callbacks, session checks, and proxy endpoints: 30 req / 15 min (300 in dev)
export const lenientAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 300,
  message: { error: 'Too many auth requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Backward compatibility alias for lenient auth limiter
export const authRateLimiter = lenientAuthRateLimiter;

// General API limiter: 200 req / 15 min (1000 in dev)
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 1000,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
