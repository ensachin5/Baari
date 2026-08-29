"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const auth_js_1 = require("../auth.js");
const node_1 = require("better-auth/node");
const requireAuth = async (req, res, next) => {
    try {
        const session = await auth_js_1.auth.api.getSession({
            headers: (0, node_1.fromNodeHeaders)(req.headers),
        });
        if (!session || !session.user) {
            res.status(401).json({ error: 'Unauthorized. Valid session required.' });
            return;
        }
        req.user = session.user;
        req.session = session.session;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};
exports.requireAuth = requireAuth;
