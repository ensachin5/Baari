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
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const better_auth_1 = require("better-auth");
const drizzle_1 = require("better-auth/adapters/drizzle");
const expo_1 = require("@better-auth/expo");
const plugins_1 = require("better-auth/plugins");
const index_js_1 = require("./db/index.js");
const authSchema = __importStar(require("./db/auth-schema.js"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Safely resolve the base URL to prevent mismatches
const getBaseURL = () => {
    const envUrl = process.env.BETTER_AUTH_URL;
    if (envUrl && envUrl.includes('baari-backend.onrender.com')) {
        return 'https://baari-wkqq.onrender.com';
    }
    if (envUrl && envUrl.trim() !== '') {
        return envUrl.trim().replace(/\/+$/, '');
    }
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        return 'https://baari-wkqq.onrender.com';
    }
    return 'http://localhost:3000';
};
const resolvedBaseURL = getBaseURL();
console.log(`[Better Auth Init] Resolved baseURL: ${resolvedBaseURL} (process.env.BETTER_AUTH_URL: ${process.env.BETTER_AUTH_URL})`);
exports.auth = (0, better_auth_1.betterAuth)({
    database: (0, drizzle_1.drizzleAdapter)(index_js_1.db, {
        provider: 'pg',
        schema: authSchema,
    }),
    baseURL: resolvedBaseURL,
    advanced: {
        database: {
            generateId: 'uuid',
        },
        defaultCookieAttributes: {
            sameSite: 'none',
            secure: true,
            httpOnly: true,
        },
    },
    socialProviders: {
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? {
                google: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                },
            }
            : {}),
    },
    plugins: [(0, expo_1.expo)(), (0, plugins_1.bearer)()],
    trustedOrigins: [
        'https://baari-app.vercel.app',
        'https://*.vercel.app',
        'https://baari-wkqq.onrender.com',
        'https://baari-backend.onrender.com',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8081',
        'http://localhost:19000',
        'http://localhost:19006',
        ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.replace(/\/+$/, '')] : []),
        'baari://',
        'baari://*',
        'exp://',
        'exp://*',
    ],
});
