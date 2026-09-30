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

// Intercept OAuth callback redirects to implement WebKit ITP-immune one-time code exchange
app.use('/api/auth/callback/*', async (req, res, next) => {
  let capturedSessionToken: string | null = null;
  const originalSetHeader = res.setHeader.bind(res);

  res.setHeader = function (name: string, value: any) {
    if (name.toLowerCase() === 'set-cookie') {
      const cookieStr = Array.isArray(value) ? value.join('; ') : String(value);
      const match = cookieStr.match(/(?:better-auth|baari)\.session_token=([^;]+)/);
      if (match?.[1]) {
        capturedSessionToken = match[1];
      }
    }
    return originalSetHeader(name, value);
  };

  const originalRedirect = res.redirect.bind(res);
  res.redirect = async function (statusOrUrl: any, url?: any) {
    const finalUrl = typeof statusOrUrl === 'string' ? statusOrUrl : url;
    const finalStatus = typeof statusOrUrl === 'number' ? statusOrUrl : 302;

    if (finalUrl) {
      if (finalUrl.includes('error=')) {
        logger.error({
          msg: 'OAuth callback redirected with error from Better Auth',
          finalUrl,
          query: req.query,
          headers: req.headers,
        });
      }

      // Mobile app redirects use custom schemes (baari:// or exp://) and receive session cookies
      // directly via @better-auth/expo deep link parameters. DO NOT intercept them!
      const isMobileRedirect =
        finalUrl.startsWith('baari://') ||
        finalUrl.startsWith('exp://') ||
        (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) ||
        Boolean(req.headers['expo-origin']);

      if (isMobileRedirect) {
        logger.info({ msg: 'Passing through mobile OAuth redirect to Expo scheme', finalUrl });
        return (originalRedirect as any)(finalStatus, finalUrl);
      }


      try {
        let tokenToExchange = capturedSessionToken;
        let targetUserId: string | null = null;

        if (!tokenToExchange) {
          const sessionRes = await pool.query(
            `SELECT token, user_id FROM "session" ORDER BY created_at DESC LIMIT 1`
          );
          if (sessionRes.rowCount && sessionRes.rowCount > 0) {
            tokenToExchange = sessionRes.rows[0].token;
            targetUserId = sessionRes.rows[0].user_id;
          }
        } else {
          const userRes = await pool.query(
            `SELECT user_id FROM "session" WHERE token = $1 LIMIT 1`,
            [tokenToExchange]
          );
          if (userRes.rowCount && userRes.rowCount > 0) {
            targetUserId = userRes.rows[0].user_id;
          }
        }

        if (tokenToExchange && targetUserId) {
          const exchangeCode = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 60000); // 60s single-use

          await pool.query(
            `INSERT INTO one_time_auth_codes (code, user_id, session_token, expires_at) VALUES ($1, $2, $3, $4)`,
            [exchangeCode, targetUserId, tokenToExchange, expiresAt]
          );

          const completionUrl = `${clientUrl}/auth/complete?code=${exchangeCode}`;
          logger.info({ msg: 'One-time auth code created for OAuth callback', targetUserId });

          // Remove Set-Cookie header from redirect so WebKit ITP doesn't drop it mid-redirect
          res.removeHeader('Set-Cookie');

          return (originalRedirect as any)(finalStatus, completionUrl);
        }
      } catch (err: any) {
        logger.error({ msg: 'Error generating one-time auth exchange code', error: err.message });
      }
    }

    return (originalRedirect as any)(statusOrUrl, url);
  };

  next();
});

// Endpoint for Same-Origin fetch completion (WebKit ITP Workaround)
app.post('/api/auth/complete-login', async (req, res): Promise<void> => {
  const { code } = req.body || {};

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'One-time exchange code is required' });
    return;
  }

  try {
    // Atomically find & delete code (single-use guarantee)
    const codeRes = await pool.query(
      `DELETE FROM one_time_auth_codes WHERE code = $1 AND expires_at > NOW() RETURNING *`,
      [code]
    );

    if (!codeRes.rowCount || codeRes.rowCount === 0) {
      res.status(400).json({ error: 'Invalid, used, or expired authentication code' });
      return;
    }

    const { user_id, session_token } = codeRes.rows[0];

    // Fetch user and session from DB
    const userRes = await pool.query(`SELECT id, name, email, image FROM "user" WHERE id = $1`, [user_id]);
    const sessRes = await pool.query(`SELECT id, expires_at, token FROM "session" WHERE token = $1`, [session_token]);

    if (!userRes.rowCount || !sessRes.rowCount) {
      res.status(401).json({ error: 'Associated user or session not found' });
      return;
    }

    const userData = userRes.rows[0];
    const sessionData = sessRes.rows[0];

    const host = (req.headers.host || '').toString();
    const isProd = process.env.NODE_ENV === 'production' && !host.includes('localhost') && !host.includes('127.0.0.1');

    const cookieHeaders = [
      `baari.session_token=${session_token}; Path=/; Max-Age=2592000; ${isProd ? 'SameSite=None; Secure;' : 'SameSite=Lax;'} HttpOnly`,
      `better-auth.session_token=${session_token}; Path=/; Max-Age=2592000; ${isProd ? 'SameSite=None; Secure;' : 'SameSite=Lax;'} HttpOnly`,
    ];

    res.setHeader('Set-Cookie', cookieHeaders);

    res.json({
      success: true,
      token: session_token,
      user: userData,
      session: sessionData,
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
