import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import * as authSchema from './auth-schema';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/baari';

const isLocal =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

declare global {
  // eslint-disable-next-line no-var
  var __baari_db_pool: pg.Pool | undefined;
}

// Preserve pool across serverless / Next.js Fast Refresh hot-reloads
export const pool =
  globalThis.__baari_db_pool ??
  new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: process.env.NODE_ENV === 'production' ? 10 : 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__baari_db_pool = pool;
}

pool.on('error', (err: any) => {
  console.warn('[Postgres Pool Error]', err?.message || err);
});

export const db = drizzle(pool, { schema: { ...schema, ...authSchema } });

export * from './schema';
export { schema, authSchema };
