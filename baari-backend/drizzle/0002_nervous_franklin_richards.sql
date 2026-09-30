ALTER TYPE "public"."activity_type" ADD VALUE 'reminder_sent';--> statement-breakpoint
CREATE TABLE "one_time_auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "one_time_auth_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "task_occurrence_members" ADD COLUMN "last_reminded_at" timestamp;--> statement-breakpoint
ALTER TABLE "one_time_auth_codes" ADD CONSTRAINT "one_time_auth_codes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;