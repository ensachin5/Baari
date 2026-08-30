import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { expo } from '@better-auth/expo';
import { db } from './db/index.js';
import * as authSchema from './db/auth-schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Safely resolve the base URL to prevent mismatches between baari-backend.onrender.com and baari-wkqq.onrender.com
const getBaseURL = () => {
  const envUrl = process.env.BETTER_AUTH_URL;
  if (envUrl && envUrl.includes('baari-backend.onrender.com')) {
    return 'https://baari-wkqq.onrender.com';
  }
  return envUrl || 'http://localhost:3000';
};

const resolvedBaseURL = getBaseURL();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  baseURL: resolvedBaseURL,
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
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
  plugins: [expo()],
  trustedOrigins: [
    'http://localhost:8081',
    'http://localhost:3000',
    'http://localhost:19000',
    'http://localhost:19006',
    'https://baari-wkqq.onrender.com',
    'https://baari-backend.onrender.com',
    'baari://',
    'baari://*',
    'exp://',
    'exp://*',
  ],
});
