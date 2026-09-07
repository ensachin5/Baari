ALTER TYPE "public"."activity_type" ADD VALUE IF NOT EXISTS 'reminder_sent';--> statement-breakpoint
ALTER TABLE "task_occurrence_members" ADD COLUMN IF NOT EXISTS "last_reminded_at" timestamp;
