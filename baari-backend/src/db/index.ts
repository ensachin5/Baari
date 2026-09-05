import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const rawConnectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/baari';
// Normalize sslmode=require / prefer / verify-ca to verify-full to silence pg v8.13+ alias warnings on Neon
const connectionString = rawConnectionString.replace(/sslmode=(require|prefer|verify-ca)/g, 'sslmode=verify-full');

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
