CREATE TABLE "push_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_connection" ADD COLUMN "machine_id" text;--> statement-breakpoint
CREATE INDEX "idx_push_subscription_user" ON "push_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_push_subscription_endpoint" ON "push_subscription" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_user_settings_user" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_settings_user_key" ON "user_settings" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "idx_agent_connection_machine" ON "agent_connection" USING btree ("machine_id");