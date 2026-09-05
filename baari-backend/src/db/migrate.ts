import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  console.log('[Migration] Starting task assignment mode & custom rotation migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create task_assignment_mode enum if not exists
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_assignment_mode') THEN 
          CREATE TYPE task_assignment_mode AS ENUM ('auto_rotate', 'custom_rotation'); 
        END IF; 
      END $$;
    `);
    console.log('[Migration] Ensured task_assignment_mode enum exists');

    // 2. Add columns to tasks table
    await client.query(`
      ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignment_mode" task_assignment_mode DEFAULT 'auto_rotate' NOT NULL;
    `);
    await client.query(`
      ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "custom_rotation_pool" jsonb;
    `);
    await client.query(`
      ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "custom_rotation_group_size" integer DEFAULT 1;
    `);
    await client.query(`
      ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "custom_rotation_groups" jsonb;
    `);
    console.log('[Migration] Added assignment_mode, custom_rotation_pool, custom_rotation_group_size, custom_rotation_groups to tasks');

    // 3. Migrate existing tasks
    // For tasks that already have assignees in occurrences, ensure assignment_mode is valid
    await client.query(`
      UPDATE "tasks"
      SET "assignment_mode" = 'auto_rotate'
      WHERE "assignment_mode" IS NULL;
    `);

    await client.query('COMMIT');
    console.log('[Migration] Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration] Migration failed, transaction rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exit(1);
});
