import rateLimit from 'express-rate-limit';

const getClientIp = (req: any): string => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) return String(cfIp).split(',')[0].trim();
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) return String(xForwardedFor).split(',')[0].trim();
  return req.ip || '127.0.0.1';
};

// Strict limiter for credential-guessing sensitive endpoints (sign-in/email, sign-up/email): 50 req / 15 min
export const strictAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: getClientIp,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient limiter for OAuth flows, callbacks, session checks, and proxy endpoints: 600 req / 15 min
export const lenientAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  keyGenerator: getClientIp,
  message: { error: 'Too many auth requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.includes('/callback') || req.path.includes('/complete-login'),
});

// Backward compatibility alias for lenient auth limiter
export const authRateLimiter = lenientAuthRateLimiter;

// General API limiter: 1000 req / 15 min
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  keyGenerator: getClientIp,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
