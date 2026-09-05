"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const auth_js_1 = require("../auth.js");
const node_1 = require("better-auth/node");
const index_js_1 = require("../db/index.js");
const auth_schema_js_1 = require("../db/auth-schema.js");
const drizzle_orm_1 = require("drizzle-orm");
const requireAuth = async (req, res, next) => {
    try {
        // 1. Primary verification: Better Auth getSession with parsed node headers
        const session = await auth_js_1.auth.api.getSession({
            headers: (0, node_1.fromNodeHeaders)(req.headers),
        });
        if (session && session.user) {
            req.user = session.user;
            req.session = session.session;
            return next();
        }
        // 2. Direct fallback verification: check Authorization: Bearer <token> or Cookie
        const authHeader = req.headers.authorization;
        const cookieHeader = req.headers.cookie;
        let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
        if (!token && cookieHeader) {
            const match = cookieHeader.match(/(?:better-auth\.session_token|session_token|baari_session_token)=([^;]+)/);
            if (match?.[1]) {
                token = decodeURIComponent(match[1]);
            }
        }
        if (token) {
            const cleanToken = token.split('.')[0] || token;
            const [foundSession] = await index_js_1.db
                .select()
                .from(auth_schema_js_1.session)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(auth_schema_js_1.session.token, cleanToken), (0, drizzle_orm_1.gt)(auth_schema_js_1.session.expiresAt, new Date())));
            if (foundSession) {
                const [foundUser] = await index_js_1.db
                    .select()
                    .from(auth_schema_js_1.user)
                    .where((0, drizzle_orm_1.eq)(auth_schema_js_1.user.id, foundSession.userId));
                if (foundUser) {
                    req.user = foundUser;
                    req.session = foundSession;
                    return next();
                }
            }
        }
        res.status(401).json({ error: 'Unauthorized. Valid session required.' });
    }
    catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};
exports.requireAuth = requireAuth;
