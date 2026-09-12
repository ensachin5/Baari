import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { expo } from '@better-auth/expo';
import { bearer } from 'better-auth/plugins';
import { db } from './db/index.js';
import * as authSchema from './db/auth-schema.js';
import * as dotenv from 'dotenv';

import { logger } from './middleware/error-handler.js';

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

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  baseURL: resolvedBaseURL,
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const logMsg = `[OAuth Callback Session Created] User ID: ${session.userId} | Session ID: ${session.id} | Token: ${session.token ? session.token.substring(0, 12) + '...' : 'N/A'} | Timestamp: ${new Date().toISOString()}`;
          console.log('\n==================================================');
          console.log(logMsg);
          console.log('==================================================\n');
          logger.info({
            msg: '[OAuth Callback Session Created]',
            userId: session.userId,
            sessionId: session.id,
            tokenSnippet: session.token ? `${session.token.substring(0, 12)}...` : undefined,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            timestamp: new Date().toISOString(),
          });
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: true,
      httpOnly: true,
    },
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'cf-connecting-ip', 'x-real-ip'],
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
  plugins: [expo(), bearer()],
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
