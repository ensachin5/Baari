import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import * as dotenv from 'dotenv';
import { eq, and, gt } from 'drizzle-orm';
import { auth } from './auth.js';
import { toNodeHandler } from 'better-auth/node';
import { db, pool } from './db/index.js';
import { user, session, oneTimeAuthCodes } from './db/schema.js';
import { initSocket } from './sockets/index.js';
import { logger, errorHandler } from './middleware/error-handler.js';
import { lenientAuthRateLimiter, generalRateLimiter } from './middleware/rate-limit.js';
import { oauthCallbackInterceptor, rawTokenFromCookieValue } from './middleware/oauth-callback-interceptor.js';

// Route imports
import { flatsRouter } from './routes/flats.js';
import { tasksRouter } from './routes/tasks/index.js';
import { expensesRouter } from './routes/expenses/index.js';
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

// 2. CORS (Enforcing strict origin whitelist)
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

      return callback(new Error('Not allowed by CORS'));
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

// Intercept OAuth callback redirects to solve WebKit/Safari cross-site cookie restrictions
app.use('/api/auth/callback/*', oauthCallbackInterceptor);

app.post('/api/auth/complete-login', async (req, res): Promise<void> => {
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'One-time exchange code is required' });
    return;
  }
  try {
    const now = new Date();
    const deletedCodes = await db
      .delete(oneTimeAuthCodes)
      .where(and(eq(oneTimeAuthCodes.code, code), gt(oneTimeAuthCodes.expiresAt, now)))
      .returning();

    if (!deletedCodes.length) {
      res.status(400).json({ error: 'Invalid, used, or expired authentication code' });
      return;
    }

    const { userId, sessionToken: signedToken } = deletedCodes[0];
    const rawToken = rawTokenFromCookieValue(signedToken);

    const userRows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const sessRows = await db
      .select({
        id: session.id,
        expiresAt: session.expiresAt,
        token: session.token,
      })
      .from(session)
      .where(and(eq(session.token, rawToken), gt(session.expiresAt, now)))
      .limit(1);

    if (!userRows.length || !sessRows.length) {
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
      user: userRows[0],
      session: sessRows[0],
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
