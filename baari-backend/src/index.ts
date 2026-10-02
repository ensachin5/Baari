import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import * as dotenv from 'dotenv';
import { auth } from './auth.js';
import { toNodeHandler } from 'better-auth/node';
import { db, pool } from './db/index.js';
import { initSocket } from './sockets/index.js';
import { logger, errorHandler } from './middleware/error-handler.js';
import { lenientAuthRateLimiter, generalRateLimiter } from './middleware/rate-limit.js';

// Route imports
import { flatsRouter } from './routes/flats.js';
import { tasksRouter } from './routes/tasks.js';
import { expensesRouter } from './routes/expenses.js';
import { activityRouter } from './routes/activity.js';
import { profileRouter } from './routes/profile.js';
import { messagesRouter } from './routes/messages.js';
import { devRouter } from './routes/dev.js';
import { quickPicksRouter } from './routes/quick-picks.js';
import { announcementsRouter } from './routes/announcements.js';
import { groceriesRouter } from './routes/groceries.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// 0. Trust Proxy for Render & Cloudflare SSL termination
app.set('trust proxy', 1);

// 1. Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
const additionalOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
  : [];

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081',
  'http://localhost:19000',
  'http://localhost:19006',
  clientUrl,
  ...additionalOrigins,
];

// 2. CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile apps, curl, SSR requests with no Origin header
      if (!origin) return callback(null, true);

      if (
        ALLOWED_ORIGINS.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.') ||
        origin.startsWith('http://172.') ||
        origin.startsWith('baari://') ||
        origin.startsWith('exp://')
      ) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'expo-origin', 'x-skip-oauth-proxy', 'x-requested-with'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// 3. Normalize multiple consecutive slashes in request URLs (e.g. //api/flats -> /api/flats)
app.use((req, _res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});

// 4. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Pino HTTP Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/health-ping' || req.url === '/health/db',
      },
    })
  );
}

// 6. Root & Health Check Endpoints
app.get('/health-ping', (_req, res) => {
  res.status(200).send('pong');
});

app.get('/', (req, res) => {
  if (req.accepts('html')) {
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    const target = query ? `${clientUrl}?${query}` : clientUrl;
    return res.redirect(target);
  }
  res.json({
    status: 'ok',
    service: 'baari-backend',
    timestamp: new Date().toISOString(),
  });
});

// Pure Express liveness check (Fast, zero database query)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'baari-backend',
    timestamp: new Date().toISOString(),
  });
});

// Deep health check (Includes DB connectivity ping)
app.get('/health/db', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'baari-backend',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      service: 'baari-backend',
      database: 'disconnected',
      error: error.message,
    });
  }
});

// Diagnostic endpoint to verify OAuth and Better Auth environment variables safely
app.get('/health/auth-config', (_req, res) => {
  const hasId = Boolean(process.env.GOOGLE_CLIENT_ID);
  const id = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
  const idPrefix = id ? id.slice(0, 15) : '';
  const idSuffix = id ? id.slice(-15) : '';
  const hasSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
  const secret = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');
  const secretPrefix = secret ? secret.slice(0, 7) : '';
  const secretLength = secret.length;
  const rawBetterAuthUrl = process.env.BETTER_AUTH_URL || '';
  const resolvedBaseURL = rawBetterAuthUrl.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');

  res.json({
    hasGoogleClientId: hasId,
    googleClientIdPrefix: idPrefix,
    googleClientIdSuffix: idSuffix,
    googleClientIdLength: id.length,
    hasGoogleClientSecret: hasSecret,
    googleClientSecretPrefix: secretPrefix,
    googleClientSecretLength: secretLength,
    rawBetterAuthUrl,
    resolvedBaseURL,
    computedRedirectUri: `${resolvedBaseURL}/api/auth/callback/google`,
    nodeEnv: process.env.NODE_ENV || 'undefined',
  });
});

import crypto from 'crypto';

// Ensure one_time_auth_codes table exists in PostgreSQL
pool.query(`
  CREATE TABLE IF NOT EXISTS one_time_auth_codes (
    id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  );
`).catch((err) => logger.error({ msg: 'Failed creating one_time_auth_codes table', error: err.message }));

const SESSION_COOKIE_RE = /(?:^|[\s;,])((?:__Secure-)?(?:better-auth|baari)\.session_token)=([^;]+)/;

/** Signed cookie value is "<token>.<signature>"; DB stores only "<token>". */
const rawTokenFromCookieValue = (value: string): string => {
  let v = value;
  try { v = decodeURIComponent(v); } catch (_) {}
  return v.replace(/^["']|["']$/g, '').split('.')[0].trim();
};

app.use('/api/auth/callback/*', (req, res, next) => {
  // Re-inject the OAuth state cookie from ?state= (plain + __Secure- names)
  if (typeof req.query.state === 'string' && req.query.state) {
    const existing = req.headers.cookie || '';
    if (!/(?:^|;\s*)(?:__Secure-)?better-auth\.state=/.test(existing)) {
      const extra = `better-auth.state=${req.query.state}; __Secure-better-auth.state=${req.query.state}`;
      req.headers.cookie = existing ? `${existing}; ${extra}` : extra;
      logger.info({ msg: 'Injected OAuth state cookie from query parameter' });
    }
  }

  let capturedCookieValue: string | null = null;
  const captureFrom = (setCookie: unknown) => {
    if (!setCookie) return;
    const list = Array.isArray(setCookie) ? setCookie : [String(setCookie)];
    for (const c of list) {
      const m = String(c).match(SESSION_COOKIE_RE);
      if (m?.[2]) capturedCookieValue = m[2];
    }
  };

  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = ((name: string, value: any) => {
    if (name.toLowerCase() === 'set-cookie') captureFrom(value);
    return originalSetHeader(name, value);
  }) as typeof res.setHeader;

  const isMobileRedirect = (loc: string) =>
    Boolean(req.headers['expo-origin']) ||
    loc.startsWith('baari://') ||
    loc.startsWith('exp://') ||
    !/^https?:\/\//i.test(loc);

  const originalWriteHead = res.writeHead.bind(res) as any;
  (res as any).writeHead = (statusCode: number, ...rest: any[]) => {
    let statusMessage: string | undefined;
    let headers: any;
    if (typeof rest[0] === 'string') { statusMessage = rest[0]; headers = rest[1]; }
    else { headers = rest[0]; }

    let location: string | undefined;
    const readHeaders = (h: any) => {
      if (!h) return;
      if (Array.isArray(h)) {
        if (h.length && Array.isArray(h[0])) {
          for (const [k, v] of h) {
            if (String(k).toLowerCase() === 'location') location = String(v);
            if (String(k).toLowerCase() === 'set-cookie') captureFrom(v);
          }
        } else {
          for (let i = 0; i + 1 < h.length; i += 2) {
            if (String(h[i]).toLowerCase() === 'location') location = String(h[i + 1]);
            if (String(h[i]).toLowerCase() === 'set-cookie') captureFrom(h[i + 1]);
          }
        }
      } else {
        for (const k of Object.keys(h)) {
          if (k.toLowerCase() === 'location') location = String(h[k]);
          if (k.toLowerCase() === 'set-cookie') captureFrom(h[k]);
        }
      }
    };
    readHeaders(headers);
    if (!location) { const l = res.getHeader('location'); if (l) location = String(l); }
    captureFrom(res.getHeader('set-cookie'));

    const isRedirect = statusCode >= 300 && statusCode < 400 && !!location;

    if (isRedirect && location) {
      if (location.includes('error=')) {
        logger.error({ msg: 'OAuth callback redirected with error', location, query: req.query });
      } else if (isMobileRedirect(location)) {
        logger.info({ msg: 'Passing through mobile OAuth redirect', location });
      } else if (capturedCookieValue) {
        const cookieValue = capturedCookieValue;
        const rawToken = rawTokenFromCookieValue(cookieValue);
        const loc = location;
        (async () => {
          try {
            const sess = await pool.query(`SELECT user_id FROM "session" WHERE token = $1 LIMIT 1`, [rawToken]);
            if (!sess.rowCount) throw new Error('session row not found for callback token');
            const code = crypto.randomBytes(32).toString('hex');
            await pool.query(
              `INSERT INTO one_time_auth_codes (code, user_id, session_token, expires_at) VALUES ($1, $2, $3, $4)`,
              [code, sess.rows[0].user_id, decodeURIComponent(cookieValue), new Date(Date.now() + 60_000)]
            );
            const origin = new URL(loc).origin;
            const completionUrl = `${origin}/auth/complete?code=${code}`;
            logger.info({ msg: 'One-time auth code created for OAuth callback', completionUrl: `${origin}/auth/complete` });
            res.removeHeader('Set-Cookie');
            res.removeHeader('set-cookie');
            originalSetHeader('Location', completionUrl);
            originalWriteHead(302, { Location: completionUrl, 'Cache-Control': 'no-store' });
            res.end();
          } catch (err: any) {
            logger.error({ msg: 'One-time code handoff failed; using original redirect', error: err?.message });
            originalWriteHead(statusCode, ...(statusMessage ? [statusMessage] : []), headers);
            res.end();
          }
        })();
        return res;
      }
    }

    return statusMessage !== undefined
      ? originalWriteHead(statusCode, statusMessage, headers)
      : originalWriteHead(statusCode, headers);
  };

  next();
});

app.post('/api/auth/complete-login', async (req, res): Promise<void> => {
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'One-time exchange code is required' });
    return;
  }
  try {
    const codeRes = await pool.query(
      `DELETE FROM one_time_auth_codes WHERE code = $1 AND expires_at > NOW() RETURNING *`,
      [code]
    );
    if (!codeRes.rowCount) {
      res.status(400).json({ error: 'Invalid, used, or expired authentication code' });
      return;
    }
    const { user_id, session_token: signedToken } = codeRes.rows[0];
    const rawToken = rawTokenFromCookieValue(signedToken);

    const userRes = await pool.query(`SELECT id, name, email, image FROM "user" WHERE id = $1`, [user_id]);
    const sessRes = await pool.query(
      `SELECT id, expires_at, token FROM "session" WHERE token = $1 AND expires_at > NOW()`,
      [rawToken]
    );
    if (!userRes.rowCount || !sessRes.rowCount) {
      res.status(401).json({ error: 'Associated user or session not found' });
      return;
    }

    const isHttps =
      (req.headers['x-forwarded-proto'] || req.protocol) === 'https' ||
      process.env.NODE_ENV === 'production';
    const cookieName = isHttps ? '__Secure-better-auth.session_token' : 'better-auth.session_token';
    const attrs = `Path=/; Max-Age=2592000; HttpOnly; ${isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax'}`;

    res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(decodeURIComponent(signedToken))}; ${attrs}`);
    res.setHeader('Cache-Control', 'no-store');

    res.json({
      success: true,
      token: decodeURIComponent(signedToken), // signed value: works as Bearer for Better Auth AND requireAuth
      user: userRes.rows[0],
      session: sessRes.rows[0],
    });
  } catch (err: any) {
    logger.error({ msg: 'complete-login endpoint exception', error: err?.message });
    res.status(500).json({ error: 'Internal server error finalizing authentication' });
  }
});

// Better Auth router
app.all('/api/auth*', lenientAuthRateLimiter, toNodeHandler(auth));


// 7. API Routes with general rate limiting
app.use('/api', generalRateLimiter);
app.use('/api/flats', flatsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/activity', activityRouter);
app.use('/api/profile', profileRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/quick-picks', quickPicksRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/grocery-items', groceriesRouter);
app.use('/api/dev', devRouter);

// Alias route for POST /api/push-tokens
app.post('/api/push-tokens', (req, res, next) => {
  req.url = '/push-token';
  profileRouter(req, res, next);
});

// 8. Global Error Handler
app.use(errorHandler);

// 9. Initialize Socket.io
initSocket(httpServer);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Baari backend server running on http://localhost:${PORT}`);
});

export { app, httpServer };
