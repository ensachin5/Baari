import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

// Neon requirement: Drizzle Kit schema migrations must use direct (unpooled) connection.
// Automatically replace `-pooler` in hostname and clean non-standard query parameters.
const rawUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/baari';
const directUrl = rawUrl
  .replace('-pooler.', '.')
  .replace(/&channel_binding=[^&]*/, '')
  .replace(/\?channel_binding=[^&]*&?/, '?');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: directUrl,
  },
});
