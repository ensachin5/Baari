"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const auth_js_1 = require("../auth.js");
const node_1 = require("better-auth/node");
const index_js_1 = require("../db/index.js");
const auth_schema_js_1 = require("../db/auth-schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const error_handler_js_1 = require("./error-handler.js");
const requireAuth = async (req, res, next) => {
    const reqUrl = req.originalUrl || req.url;
    const authHeader = req.headers.authorization;
    const cookieHeader = req.headers.cookie;
    const logHeaderInfo = {
        method: req.method,
        url: reqUrl,
        hasCookie: !!cookieHeader,
        cookieSnippet: cookieHeader ? (cookieHeader.length > 60 ? `${cookieHeader.substring(0, 60)}...` : cookieHeader) : 'NONE',
        hasAuthHeader: !!authHeader,
        authHeaderSnippet: authHeader ? `${authHeader.substring(0, 25)}...` : 'NONE',
        host: req.headers.host,
        referer: req.headers.referer,
    };
    error_handler_js_1.logger.info({
        msg: `[Session Verification START] ${req.method} ${reqUrl}`,
        ...logHeaderInfo,
    });
    try {
        // 1. Primary verification: Better Auth getSession with parsed node headers
        const session = await auth_js_1.auth.api.getSession({
            headers: (0, node_1.fromNodeHeaders)(req.headers),
        });
        if (session && session.user) {
            const successMsg = `[Session Verification SUCCESS via BetterAuth] ${req.method} ${reqUrl} | User ID: ${session.user.id} | Session ID: ${session.session.id}`;
            console.log(`\n>>> ${successMsg}\n`);
            error_handler_js_1.logger.info({
                msg: `[Session Verification SUCCESS via BetterAuth] ${req.method} ${reqUrl}`,
                userId: session.user.id,
                sessionId: session.session.id,
                tokenSnippet: session.session.token ? `${session.session.token.substring(0, 12)}...` : undefined,
            });
            req.user = session.user;
            req.session = session.session;
            return next();
        }
        error_handler_js_1.logger.info({
            msg: `[Session Verification BetterAuth Returned Null] ${req.method} ${reqUrl} - Attempting direct DB token fallback verification`,
        });
        // 2. Direct fallback verification: check Authorization: Bearer <token> or Cookie
        let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
        if (!token && cookieHeader) {
            const match = cookieHeader.match(/(?:better-auth\.session_token|session_token|baari_session_token)=([^;]+)/);
            if (match?.[1]) {
                token = decodeURIComponent(match[1]);
            }
        }
        if (!token) {
            const failMsg = `[Session Verification FAIL] ${req.method} ${reqUrl} | Reason: No cookie (better-auth.session_token) or Authorization header token present in request headers.`;
            console.log(`\n<<< ${failMsg}\n`);
            error_handler_js_1.logger.warn({
                msg: `[Session Verification FAIL] ${req.method} ${reqUrl}`,
                reason: 'No cookie (better-auth.session_token) or Authorization header token present in request headers',
                hasCookieHeader: !!cookieHeader,
                hasAuthHeader: !!authHeader,
            });
            res.status(401).json({ error: 'Unauthorized. Valid session required.' });
            return;
        }
        const cleanToken = token.split('.')[0] || token;
        const tokenSnippet = cleanToken ? `${cleanToken.substring(0, 12)}...` : '';
        const [foundSession] = await index_js_1.db
            .select()
            .from(auth_schema_js_1.session)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(auth_schema_js_1.session.token, cleanToken), (0, drizzle_orm_1.gt)(auth_schema_js_1.session.expiresAt, new Date())));
        if (!foundSession) {
            // Check if session exists in DB but is expired
            const [expiredSession] = await index_js_1.db
                .select()
                .from(auth_schema_js_1.session)
                .where((0, drizzle_orm_1.eq)(auth_schema_js_1.session.token, cleanToken));
            if (expiredSession) {
                const expiredMsg = `[Session Verification FAIL] ${req.method} ${reqUrl} | Reason: Token (${tokenSnippet}) found in DB for session ${expiredSession.id}, but session is EXPIRED (expired at: ${expiredSession.expiresAt.toISOString()})`;
                console.log(`\n<<< ${expiredMsg}\n`);
                error_handler_js_1.logger.warn({
                    msg: `[Session Verification FAIL] ${req.method} ${reqUrl}`,
                    reason: `Token (${tokenSnippet}) found in DB for session ${expiredSession.id}, but session is EXPIRED`,
                    sessionId: expiredSession.id,
                    userId: expiredSession.userId,
                    expiresAt: expiredSession.expiresAt,
                    currentTime: new Date(),
                });
            }
            else {
                const noSessionMsg = `[Session Verification FAIL] ${req.method} ${reqUrl} | Reason: Token (${tokenSnippet}) present in request header/cookie but NO matching session record found in database.`;
                console.log(`\n<<< ${noSessionMsg}\n`);
                error_handler_js_1.logger.warn({
                    msg: `[Session Verification FAIL] ${req.method} ${reqUrl}`,
                    reason: `Token (${tokenSnippet}) present in request header/cookie, but NO matching session record found in database`,
                    tokenSnippet,
                });
            }
            res.status(401).json({ error: 'Unauthorized. Valid session required.' });
            return;
        }
        const [foundUser] = await index_js_1.db
            .select()
            .from(auth_schema_js_1.user)
            .where((0, drizzle_orm_1.eq)(auth_schema_js_1.user.id, foundSession.userId));
        if (!foundUser) {
            const noUserMsg = `[Session Verification FAIL] ${req.method} ${reqUrl} | Reason: Session ${foundSession.id} found in DB for token ${tokenSnippet}, but user ${foundSession.userId} record not found in database.`;
            console.log(`\n<<< ${noUserMsg}\n`);
            error_handler_js_1.logger.warn({
                msg: `[Session Verification FAIL] ${req.method} ${reqUrl}`,
                reason: `Session ${foundSession.id} found in DB for token ${tokenSnippet}, but user ${foundSession.userId} record not found in database`,
                sessionId: foundSession.id,
                userId: foundSession.userId,
            });
            res.status(401).json({ error: 'Unauthorized. Valid session required.' });
            return;
        }
        const fallbackSuccessMsg = `[Session Verification SUCCESS via Fallback DB Lookup] ${req.method} ${reqUrl} | User ID: ${foundUser.id} | Session ID: ${foundSession.id}`;
        console.log(`\n>>> ${fallbackSuccessMsg}\n`);
        error_handler_js_1.logger.info({
            msg: `[Session Verification SUCCESS via Fallback DB Lookup] ${req.method} ${reqUrl}`,
            userId: foundUser.id,
            sessionId: foundSession.id,
            tokenSnippet,
        });
        req.user = foundUser;
        req.session = foundSession;
        return next();
    }
    catch (error) {
        const errorMsg = `[Session Verification ERROR] ${req.method} ${reqUrl} | Error: ${error?.message || error}`;
        console.log(`\n<<< ${errorMsg}\n`);
        error_handler_js_1.logger.error({
            msg: `[Session Verification ERROR] ${req.method} ${reqUrl}`,
            error: error?.message || error,
            stack: error?.stack,
        });
        res.status(401).json({ error: 'Authentication failed' });
    }
};
exports.requireAuth = requireAuth;
