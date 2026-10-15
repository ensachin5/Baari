import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { expo } from '@better-auth/expo';
import { bearer } from 'better-auth/plugins';
import { db, authSchema } from '@baari/db';

const resolvedBaseURL = (
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'
).trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');

const isProduction = process.env.NODE_ENV === 'production';
const isLocalhost = resolvedBaseURL.includes('localhost') || resolvedBaseURL.includes('127.0.0.1');
const isHttps = resolvedBaseURL.startsWith('https://');
const useSecureCookies = isHttps || (isProduction && !isLocalhost);

const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');

export const auth = betterAuth({
  secret: (process.env.BETTER_AUTH_SECRET || 'baari-default-secret-change-in-production-min-32-chars').trim().replace(/^["']|["']$/g, ''),
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  baseURL: resolvedBaseURL,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,      // 24 hours
  },
  emailAndPassword: {
    enabled: false,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
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
  },
  plugins: [
    expo(),
    bearer(),
  ],
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:8081',
    'exp://localhost:8081',
    'baari://',
    'https://baari-app.vercel.app',
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
  ].filter(Boolean) as string[],
});
