import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { expo } from '@better-auth/expo';
import { bearer, emailOTP } from 'better-auth/plugins';
import { db } from './db/index.js';
import * as authSchema from './db/auth-schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

const resolvedBaseURL = (
  process.env.BETTER_AUTH_URL || 'http://localhost:3000'
).trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');

const isProduction = process.env.NODE_ENV === 'production';
const isLocalhost = resolvedBaseURL.includes('localhost') || resolvedBaseURL.includes('127.0.0.1');
const isHttps = resolvedBaseURL.startsWith('https://');
const useSecureCookies = isHttps || (isProduction && !isLocalhost);

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '') : null;
const additionalOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, ''))
  : [];

const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');

export const auth = betterAuth({
  secret: (process.env.BETTER_AUTH_SECRET || 'baari-default-secret-change-in-production-min-32-chars').trim().replace(/^["']|["']$/g, ''),
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  baseURL: resolvedBaseURL,
  logger: {
    level: 'debug',
  },
  onAPIError: {
    onError(error) {
      console.error('[BETTER_AUTH_API_ERROR]', error);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24,      // Refresh/extend session if active within last 24 hours (rolling expiry)
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
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
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
  },
  plugins: [
    expo(),
    bearer(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      async sendVerificationOTP({ email, otp, type }) {
        const { sendEmail } = await import('./services/resend.js');
        await sendEmail({
          to: email,
          subject: type === 'sign-in' ? 'Your Baari sign-in code' : 'Verify your Baari email',
          html: `<div style="font-family: Arial, sans-serif; color: #0A2540;">
            <h2>Your verification code</h2>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
            <p>This code expires in 5 minutes.</p>
          </div>`,
        });
      },
    }),
  ],
  trustedOrigins: async (request) => {
    const dynamicOrigins: string[] = [];
    if (request && typeof (request as any).headers?.get === 'function') {
      const origin = (request as any).headers.get('origin');
      const referer = (request as any).headers.get('referer');
      if (origin) {
        if (
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.onrender.com') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          dynamicOrigins.push(origin);
        }
      }
      if (referer) {
        try {
          const refOrigin = new URL(referer).origin;
          if (
            refOrigin.endsWith('.vercel.app') ||
            refOrigin.endsWith('.onrender.com') ||
            refOrigin.includes('localhost') ||
            refOrigin.includes('127.0.0.1')
          ) {
            dynamicOrigins.push(refOrigin);
          }
        } catch {}
      }
    }
    return [
      'https://*.vercel.app',
      '*.vercel.app',
      'https://*.onrender.com',
      '*.onrender.com',
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081',
      'http://localhost:19000',
      'http://localhost:19006',
      'http://10.*:*',
      'http://192.168.*:*',
      'http://172.*:*',
      ...(resolvedBaseURL ? [resolvedBaseURL] : []),
      ...(clientUrl ? [clientUrl] : []),
      ...additionalOrigins,
      ...dynamicOrigins,
      'baari://',
      'baari://*',
      'baari://**',
      'exp://',
      'exp://*',
      'exp://**',
    ];
  },
});


