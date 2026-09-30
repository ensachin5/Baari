import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { expo } from '@better-auth/expo';
import { bearer } from 'better-auth/plugins';
import { db } from './db/index.js';
import * as authSchema from './db/auth-schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

const resolvedBaseURL = (
  process.env.BETTER_AUTH_URL || 'http://localhost:3000'
).trim().replace(/\/+$/, '');

const isProduction = process.env.NODE_ENV === 'production';
const isLocalhost = resolvedBaseURL.includes('localhost') || resolvedBaseURL.includes('127.0.0.1');
const useSecureCookies = isProduction && !isLocalhost;

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/+$/, '') : null;
const additionalOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
  : [];

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || 'baari-default-secret-change-in-production-min-32-chars',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  baseURL: resolvedBaseURL,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24,      // Refresh/extend session if active within last 24 hours (rolling expiry)
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  advanced: {
    database: {
      generateId: 'uuid',
    },
    defaultCookieAttributes: {
      sameSite: useSecureCookies ? 'none' : 'lax',
      secure: useSecureCookies,
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
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19006',
    'http://10.*:*',
    'http://192.168.*:*',
    'http://172.*:*',
    ...(clientUrl ? [clientUrl] : []),
    ...additionalOrigins,
    'baari://',
    'baari://*',
    'exp://',
    'exp://*',
    'exp://**',
  ],
});

