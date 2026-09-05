"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const dotenv = __importStar(require("dotenv"));
const auth_js_1 = require("./auth.js");
const node_1 = require("better-auth/node");
const index_js_1 = require("./db/index.js");
const index_js_2 = require("./sockets/index.js");
const error_handler_js_1 = require("./middleware/error-handler.js");
const rate_limit_js_1 = require("./middleware/rate-limit.js");
// Route imports
const flats_js_1 = require("./routes/flats.js");
const tasks_js_1 = require("./routes/tasks.js");
const expenses_js_1 = require("./routes/expenses.js");
const activity_js_1 = require("./routes/activity.js");
const profile_js_1 = require("./routes/profile.js");
const messages_js_1 = require("./routes/messages.js");
const dev_js_1 = require("./routes/dev.js");
const quick_picks_js_1 = require("./routes/quick-picks.js");
const announcements_js_1 = require("./routes/announcements.js");
const groceries_js_1 = require("./routes/groceries.js");
dotenv.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
// 0. Trust Proxy for Render & Cloudflare SSL termination
app.set('trust proxy', 1);
// 1. Helmet
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
}));
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow mobile apps, curl, SSR requests with no Origin header
        if (!origin)
            return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            origin.startsWith('baari://') ||
            origin.startsWith('exp://')) {
            return callback(null, true);
        }
        // Allow all in dev / fallback
        return callback(null, true);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'expo-origin', 'x-skip-oauth-proxy', 'x-requested-with'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
// 3. Normalize multiple consecutive slashes in request URLs (e.g. //api/flats -> /api/flats)
app.use((req, _res, next) => {
    if (req.url.includes('//')) {
        req.url = req.url.replace(/\/{2,}/g, '/');
    }
    next();
});
// 4. Body parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 4. Pino HTTP Logger
if (process.env.NODE_ENV !== 'test') {
    app.use((0, pino_http_1.default)({
        logger: error_handler_js_1.logger,
        autoLogging: {
            ignore: (req) => req.url === '/health' || req.url === '/health-ping',
        },
    }));
}
// 5. Root & Health Check Endpoints
app.get('/health-ping', (_req, res) => {
    res.status(200).send('pong');
});
app.get('/', (req, res) => {
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    const clientUrl = (process.env.CLIENT_URL || (isProd ? 'https://baari-app.vercel.app' : 'http://localhost:3000')).replace(/\/+$/, '');
    if (req.accepts('html')) {
        const query = new URLSearchParams(req.query).toString();
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
        await index_js_1.pool.query('SELECT 1');
        res.json({
            status: 'ok',
            service: 'baari-backend',
            timestamp: new Date().toISOString(),
            database: 'connected',
        });
    }
    catch (error) {
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
    const reqState = req.query.state || req.body?.state;
    const logPrefix = `[Auth Diagnostic ${req.method} ${req.originalUrl}]`;
    error_handler_js_1.logger.info({
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
            const verRes = await index_js_1.pool.query('SELECT id, identifier, value, expires_at, created_at FROM verification WHERE identifier = $1', [reqState]);
            if (verRes.rowCount && verRes.rowCount > 0) {
                error_handler_js_1.logger.info({
                    msg: `${logPrefix} Verification record FOUND in DB for state`,
                    state: reqState,
                    record: verRes.rows[0],
                    isExpired: new Date(verRes.rows[0].expires_at).getTime() < Date.now(),
                });
            }
            else {
                error_handler_js_1.logger.warn({
                    msg: `${logPrefix} Verification record NOT FOUND in DB for state!`,
                    state: reqState,
                });
            }
        }
        catch (dbErr) {
            error_handler_js_1.logger.error({
                msg: `${logPrefix} Error querying verification table in DB`,
                error: dbErr.message,
            });
        }
    }
    // Intercept redirect to log where Better Auth is sending the user
    const originalRedirect = res.redirect.bind(res);
    res.redirect = function (statusOrUrl, url) {
        const finalUrl = typeof statusOrUrl === 'string' ? statusOrUrl : url;
        const finalStatus = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
        error_handler_js_1.logger.info({
            msg: `${logPrefix} Auth response REDIRECT`,
            statusCode: finalStatus,
            location: finalUrl,
            durationMs: Date.now() - start,
        });
        return originalRedirect(statusOrUrl, url);
    };
    next();
});
app.all('/api/auth/*', rate_limit_js_1.lenientAuthRateLimiter, (0, node_1.toNodeHandler)(auth_js_1.auth));
// 7. API Routes with general rate limiting
app.use('/api', rate_limit_js_1.generalRateLimiter);
app.use('/api/flats', flats_js_1.flatsRouter);
app.use('/api/tasks', tasks_js_1.tasksRouter);
app.use('/api/expenses', expenses_js_1.expensesRouter);
app.use('/api/activity', activity_js_1.activityRouter);
app.use('/api/profile', profile_js_1.profileRouter);
app.use('/api/messages', messages_js_1.messagesRouter);
app.use('/api/quick-picks', quick_picks_js_1.quickPicksRouter);
app.use('/api/announcements', announcements_js_1.announcementsRouter);
app.use('/api/grocery-items', groceries_js_1.groceriesRouter);
app.use('/api/dev', dev_js_1.devRouter);
// Alias route for POST /api/push-tokens
app.post('/api/push-tokens', (req, res, next) => {
    req.url = '/push-token';
    (0, profile_js_1.profileRouter)(req, res, next);
});
// 8. Global Error Handler
app.use(error_handler_js_1.errorHandler);
// 9. Initialize Socket.io
(0, index_js_2.initSocket)(httpServer);
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    error_handler_js_1.logger.info(`Baari backend server running on http://localhost:${PORT}`);
});
