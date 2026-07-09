CREATE TYPE "public"."risk_level" AS ENUM('read', 'write', 'money_movement');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."api_mode" AS ENUM('demo', 'sandbox', 'read_only');--> statement-breakpoint
CREATE TABLE "telegram_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" varchar(64) NOT NULL,
	"username" varchar(255),
	"first_name" varchar(255),
	"last_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_users_telegram_user_id_unique" UNIQUE("telegram_user_id")
);
--> statement-breakpoint
CREATE TABLE "api_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"base_url" text NOT NULL,
	"auth_type" varchar(64) NOT NULL,
	"openapi_url" text,
	"docs_blob_url" text,
	"summary_blob_url" text,
	"capabilities_json" jsonb,
	"risk_level" "risk_level" DEFAULT 'read' NOT NULL,
	"mode" "api_mode" DEFAULT 'sandbox' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_profile_id" uuid NOT NULL,
	"operation_name" varchar(255) NOT NULL,
	"method" varchar(16) NOT NULL,
	"path" text NOT NULL,
	"description" text,
	"risk_level" "risk_level" NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" varchar(64) NOT NULL,
	"action_type" varchar(128) NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"summary" text NOT NULL,
	"payload_redacted_json" jsonb,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" varchar(64) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"tool_name" varchar(128) NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"input_redacted_json" jsonb,
	"output_summary" text,
	"approval_id" uuid,
	"success" boolean NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "agent_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" varchar(64) NOT NULL,
	"scope" varchar(128) DEFAULT 'preference' NOT NULL,
	"content" text NOT NULL,
	"importance" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"instruction" text NOT NULL,
	"schedule" varchar(128),
	"status" varchar(64) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" varchar(64) NOT NULL,
	"tool_name" varchar(128) NOT NULL,
	"input_redacted_json" jsonb,
	"output_redacted_json" jsonb,
	"status" varchar(64) NOT NULL,
	"idempotency_key" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" varchar(64) NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"action_type" varchar(128) NOT NULL,
	"status" varchar(64) NOT NULL,
	"result_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_capabilities" ADD CONSTRAINT "api_capabilities_api_profile_id_api_profiles_id_fk" FOREIGN KEY ("api_profile_id") REFERENCES "public"."api_profiles"("id") ON DELETE cascade ON UPDATE no action;
