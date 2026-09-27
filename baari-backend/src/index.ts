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

const ALLOWED_ORIGINS = [
  'https://baari-app.vercel.app',
  'https://baari-wkqq.onrender.com',
  'https://baari-backend.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081',
  'http://localhost:19000',
  'http://localhost:19006',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.replace(/\/+$/, '')] : []),
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
        origin.startsWith('baari://') ||
        origin.startsWith('exp://')
      ) {
        return callback(null, true);
      }

      // Allow all in dev / fallback
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

// 4. Pino HTTP Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/health-ping',
      },
    })
  );
}

// 5. Root & Health Check Endpoints
app.get('/health-ping', (_req, res) => {
  res.status(200).send('pong');
});

app.get('/', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
  const clientUrl = (process.env.CLIENT_URL || (isProd ? 'https://baari-app.vercel.app' : 'http://localhost:3000')).replace(/\/+$/, '');
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

app.get('/health', async (_req, res) => {
  try {
    // Ping database
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

app.use('/api/*', (req, res, next) => {
  const cookieHeader = req.headers.cookie;
  const hasSessionCookie = cookieHeader ? cookieHeader.includes('better-auth.session_token') : false;

  const host = (req.headers.host || '').toString();
  const xForwardedHost = (req.headers['x-forwarded-host'] || '').toString();
  const xForwardedProto = (req.headers['x-forwarded-proto'] || '').toString();

  // If this is an auth endpoint (/api/auth/*), print an explicit console trace
  if (req.originalUrl.includes('/api/auth')) {
    const isProxied = xForwardedHost.includes('baari-app.vercel.app') || host.includes('baari-app.vercel.app');
    console.log(`\n==================================================`);
    console.log(`[AUTH PROXY STEP TRACE] ${req.method} ${req.originalUrl}`);
    console.log(`  Host: ${host || 'NONE'}`);
    console.log(`  X-Forwarded-Host: ${xForwardedHost || 'NONE'}`);
    console.log(`  X-Forwarded-Proto: ${xForwardedProto || 'NONE'}`);
    console.log(`  Origin: ${req.headers.origin || 'NONE'}`);
    console.log(`  Referer: ${req.headers.referer || 'NONE'}`);
    console.log(`  Session Cookie Present: ${hasSessionCookie}`);
    console.log(`  Proxied via Vercel: ${isProxied ? 'YES (baari-app.vercel.app)' : 'NO (Direct to backend)'}`);
    console.log(`==================================================\n`);
  }

  logger.info({
    msg: `[Proxy Inbound Header Trace] ${req.method} ${req.originalUrl}`,
    host,
    xForwardedHost,
    xForwardedProto,
    hasCookieHeader: !!cookieHeader,
    hasSessionTokenCookie: hasSessionCookie,
    cookieSnippet: cookieHeader ? (cookieHeader.length > 60 ? `${cookieHeader.substring(0, 60)}...` : cookieHeader) : 'NONE',
  });

  // Intercept setHeader to log Set-Cookie responses sent by backend
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function (name: string, value: any) {
    if (name.toLowerCase() === 'set-cookie') {
      const cookieVal = Array.isArray(value) ? value.join('; ') : String(value);
      console.log(`\n>>> [Proxy Outbound Set-Cookie] Backend sending Set-Cookie for ${req.method} ${req.originalUrl}: ${cookieVal.substring(0, 80)}...\n`);
      logger.info({
        msg: `[Proxy Outbound Set-Cookie] ${req.method} ${req.originalUrl}`,
        setCookie: cookieVal,
      });
    }
    return originalSetHeader(name, value);
  };

  next();
});

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

    if (finalUrl && (finalUrl.includes('baari-app.vercel.app') || finalUrl.includes('localhost') || finalUrl.includes('baari://'))) {
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

          const clientUrl = process.env.CLIENT_URL || 'https://baari-app.vercel.app';
          const completionUrl = `${clientUrl.replace(/\/+$/, '')}/auth/complete?code=${exchangeCode}`;

          console.log(`\n==================================================`);
          console.log(`[TOKEN EXCHANGE STEP 1: CODE GENERATION & STORE]`);
          console.log(`  Exchange Code: ${exchangeCode}`);
          console.log(`  Target User ID: ${targetUserId}`);
          console.log(`  Session Token Snippet: ${tokenToExchange.substring(0, 10)}...`);
          console.log(`  Expires At: ${expiresAt.toISOString()} (60 seconds TTL)`);
          console.log(`  DB Storage Status: [EXCHANGE DB STORE SUCCESS]`);
          console.log(`--------------------------------------------------`);
          console.log(`[TOKEN EXCHANGE STEP 2: REDIRECT URL SENT TO BROWSER]`);
          console.log(`  HTTP Status: ${finalStatus}`);
          console.log(`  Redirect Target URL: ${completionUrl}`);
          console.log(`  Set-Cookie Header: STRIPPED FROM REDIRECT (WebKit ITP immune)`);
          console.log(`==================================================\n`);

          // Remove Set-Cookie header from redirect so WebKit ITP doesn't drop it mid-redirect
          res.removeHeader('Set-Cookie');

          return (originalRedirect as any)(finalStatus, completionUrl);
        }
      } catch (err: any) {
        console.error('[ITP WORKAROUND] Error generating exchange code:', err.message);
      }
    }

    return (originalRedirect as any)(statusOrUrl, url);
  };

  next();
});

// Endpoint for Same-Origin fetch completion (WebKit ITP Workaround)
app.post('/api/auth/complete-login', async (req, res): Promise<void> => {
  const { code } = req.body || {};

  console.log(`\n==================================================`);
  console.log(`[TOKEN EXCHANGE STEP 3: ENDPOINT INVOKED] POST /api/auth/complete-login`);
  console.log(`  Received Code in Request Body: ${code || 'NONE'}`);
  console.log(`  Headers Host: ${req.headers.host}`);
  console.log(`  X-Forwarded-Host: ${req.headers['x-forwarded-host'] || 'NONE'}`);

  if (!code || typeof code !== 'string') {
    console.warn(`  [EXCHANGE FAIL] One-time exchange code missing or invalid.`);
    console.log(`==================================================\n`);
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
      console.warn(`  [EXCHANGE FAIL] Code lookup failed for code: ${code}. Reason: Invalid, already used, or expired (>60s).`);
      console.log(`==================================================\n`);
      res.status(400).json({ error: 'Invalid, used, or expired authentication code' });
      return;
    }

    const { user_id, session_token, expires_at } = codeRes.rows[0];
    console.log(`  [EXCHANGE DB LOOKUP SUCCESS] Code atomically matched & consumed.`);
    console.log(`    Associated User ID: ${user_id}`);
    console.log(`    Associated Session Token Snippet: ${session_token.substring(0, 10)}...`);

    // Fetch user and session from DB
    const userRes = await pool.query(`SELECT id, name, email, image FROM "user" WHERE id = $1`, [user_id]);
    const sessRes = await pool.query(`SELECT id, expires_at, token FROM "session" WHERE token = $1`, [session_token]);

    if (!userRes.rowCount || !sessRes.rowCount) {
      console.warn(`  [EXCHANGE FAIL] User or session record not found in database.`);
      console.log(`==================================================\n`);
      res.status(401).json({ error: 'Associated user or session not found' });
      return;
    }

    const userData = userRes.rows[0];
    const sessionData = sessRes.rows[0];

    // Set same-origin, non-redirect Set-Cookie header (WebKit ITP immune!)
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    const cookieHeaders = [
      `baari.session_token=${session_token}; Path=/; Max-Age=2592000; ${isProd ? 'SameSite=None; Secure;' : 'SameSite=Lax;'} HttpOnly`,
      `better-auth.session_token=${session_token}; Path=/; Max-Age=2592000; ${isProd ? 'SameSite=None; Secure;' : 'SameSite=Lax;'} HttpOnly`,
    ];

    res.setHeader('Set-Cookie', cookieHeaders);

    console.log(`  [EXCHANGE COOKIE SET SUCCESS] Attached 30-day Set-Cookie headers to Same-Origin fetch response:`);
    console.log(`    Cookie 1: ${cookieHeaders[0]}`);
    console.log(`    Cookie 2: ${cookieHeaders[1]}`);
    console.log(`  User Authenticated: ${userData.name} (${userData.email})`);
    console.log(`  Status: 200 OK (Returning User + Session Payload)`);
    console.log(`==================================================\n`);

    res.json({
      success: true,
      token: session_token,
      user: userData,
      session: sessionData,
    });
  } catch (err: any) {
    console.error(`  [EXCHANGE ERROR] complete-login endpoint exception:`, err);
    console.log(`==================================================\n`);
    res.status(500).json({ error: 'Internal server error finalizing authentication' });
  }
});

app.use('/api/auth*', async (req, res, next) => {
  const start = Date.now();
  const reqState = (req.query.state as string) || (req.body?.state as string);
  const logPrefix = `[Auth Diagnostic ${req.method} ${req.originalUrl}]`;

  logger.info({
    msg: `${logPrefix} Incoming auth request`,
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined,
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      cookie: req.headers.cookie ? 'present' : 'none',
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-host': req.headers['x-forwarded-host'],
    },
  });

  // If OAuth callback or state is present, check verification table in DB
  if (reqState) {
    try {
      const verRes = await pool.query(
        'SELECT id, identifier, value, expires_at, created_at FROM verification WHERE identifier = $1',
        [reqState]
      );
      if (verRes.rowCount && verRes.rowCount > 0) {
        logger.info({
          msg: `${logPrefix} Verification record FOUND in DB for state`,
          state: reqState,
          record: verRes.rows[0],
          isExpired: new Date(verRes.rows[0].expires_at).getTime() < Date.now(),
        });
      } else {
        logger.warn({
          msg: `${logPrefix} Verification record NOT FOUND in DB for state!`,
          state: reqState,
        });
      }
    } catch (dbErr: any) {
      logger.error({
        msg: `${logPrefix} Error querying verification table in DB`,
        error: dbErr.message,
      });
    }
  }

  // Intercept redirect to log where Better Auth is sending the user
  const originalRedirect = res.redirect.bind(res);
  res.redirect = function (statusOrUrl: any, url?: any) {
    const finalUrl = typeof statusOrUrl === 'string' ? statusOrUrl : url;
    const finalStatus = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
    logger.info({
      msg: `${logPrefix} Auth response REDIRECT`,
      statusCode: finalStatus,
      location: finalUrl,
      durationMs: Date.now() - start,
    });
    return (originalRedirect as any)(statusOrUrl, url);
  };

  next();
});

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
