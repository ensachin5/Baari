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
import { strictAuthRateLimiter, lenientAuthRateLimiter, generalRateLimiter } from './middleware/rate-limit.js';

// Route imports
import { flatsRouter } from './routes/flats.js';
import { tasksRouter } from './routes/tasks.js';
import { expensesRouter } from './routes/expenses.js';
import { activityRouter } from './routes/activity.js';
import { profileRouter } from './routes/profile.js';
import { messagesRouter } from './routes/messages.js';
import { devRouter } from './routes/dev.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// 1. Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// 2. CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// 3. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Pino HTTP Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    })
  );
}

// 5. Health Check Endpoint
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

// 6. Better Auth Rate Limiting & Handler
app.use('/api/auth/sign-in/email', strictAuthRateLimiter);
app.use('/api/auth/sign-up/email', strictAuthRateLimiter);
app.all('/api/auth/*', lenientAuthRateLimiter, toNodeHandler(auth));

// 7. API Routes with general rate limiting
app.use('/api', generalRateLimiter);
app.use('/api/flats', flatsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/activity', activityRouter);
app.use('/api/profile', profileRouter);
app.use('/api/messages', messagesRouter);
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
