CREATE TYPE "public"."flat_type" AS ENUM('flat', 'pg', 'hostel');--> statement-breakpoint
ALTER TYPE "public"."push_device_type" ADD VALUE IF NOT EXISTS 'web';--> statement-breakpoint
ALTER TABLE "flats" ADD COLUMN "type" "flat_type" DEFAULT 'flat' NOT NULL;