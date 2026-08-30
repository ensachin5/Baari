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
        // 2. Direct fallback verification: check Authorization: Bearer <token> in session table
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            if (token) {
                const foundSession = await index_js_1.db.query.session.findFirst({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(auth_schema_js_1.session.token, token), (0, drizzle_orm_1.gt)(auth_schema_js_1.session.expiresAt, new Date())),
                });
                if (foundSession) {
                    const foundUser = await index_js_1.db.query.user.findFirst({
                        where: (0, drizzle_orm_1.eq)(auth_schema_js_1.user.id, foundSession.userId),
                    });
                    if (foundUser) {
                        req.user = foundUser;
                        req.session = foundSession;
                        return next();
                    }
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
