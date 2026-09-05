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

// 6. Auth Diagnostic Middleware & Better Auth Handler
app.use('/api/auth/*', async (req, res, next) => {
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

app.all('/api/auth/*', lenientAuthRateLimiter, toNodeHandler(auth));

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
