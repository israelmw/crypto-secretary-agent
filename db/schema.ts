import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const riskLevelEnum = pgEnum("risk_level", [
  "read",
  "write",
  "money_movement",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const apiModeEnum = pgEnum("api_mode", ["demo", "sandbox", "read_only"]);

export const telegramUsers = pgTable("telegram_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramUserId: varchar("telegram_user_id", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const apiProfiles = pgTable("api_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramUserId: varchar("telegram_user_id", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  baseUrl: text("base_url").notNull(),
  authType: varchar("auth_type", { length: 64 }).notNull(),
  openapiUrl: text("openapi_url"),
  docsBlobUrl: text("docs_blob_url"),
  summaryBlobUrl: text("summary_blob_url"),
  capabilitiesJson: jsonb("capabilities_json").$type<Record<string, unknown>>(),
  riskLevel: riskLevelEnum("risk_level").notNull().default("read"),
  mode: apiModeEnum("mode").notNull().default("sandbox"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const apiCapabilities = pgTable("api_capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  apiProfileId: uuid("api_profile_id")
    .notNull()
    .references(() => apiProfiles.id, { onDelete: "cascade" }),
  operationName: varchar("operation_name", { length: 255 }).notNull(),
  method: varchar("method", { length: 16 }).notNull(),
  path: text("path").notNull(),
  description: text("description"),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramUserId: varchar("telegram_user_id", { length: 64 }).notNull(),
  actionType: varchar("action_type", { length: 128 }).notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  summary: text("summary").notNull(),
  payloadRedactedJson: jsonb("payload_redacted_json").$type<Record<string, unknown>>(),
  status: approvalStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramUserId: varchar("telegram_user_id", { length: 64 }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  toolName: varchar("tool_name", { length: 128 }).notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  inputRedactedJson: jsonb("input_redacted_json").$type<Record<string, unknown>>(),
  outputSummary: text("output_summary"),
  approvalId: uuid("approval_id"),
  success: boolean("success").notNull(),
  error: text("error"),
});

export const agentMemories = pgTable("agent_memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramUserId: varchar("telegram_user_id", { length: 64 }).notNull(),
  scope: varchar("scope", { length: 128 }).notNull().default("preference"),
  content: text("content").notNull(),
  importance: integer("importance").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramUserId: varchar("telegram_user_id", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  instruction: text("instruction").notNull(),
  schedule: varchar("schedule", { length: 128 }),
  status: varchar("status", { length: 64 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const toolExecutions = pgTable("tool_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramUserId: varchar("telegram_user_id", { length: 64 }).notNull(),
  toolName: varchar("tool_name", { length: 128 }).notNull(),
  inputRedactedJson: jsonb("input_redacted_json").$type<Record<string, unknown>>(),
  outputRedactedJson: jsonb("output_redacted_json").$type<Record<string, unknown>>(),
  status: varchar("status", { length: 64 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramUserId: varchar("telegram_user_id", { length: 64 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  actionType: varchar("action_type", { length: 128 }).notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  resultJson: jsonb("result_json").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type TelegramUser = typeof telegramUsers.$inferSelect;
export type ApiProfile = typeof apiProfiles.$inferSelect;
export type ApiCapability = typeof apiCapabilities.$inferSelect;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AgentMemory = typeof agentMemories.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ToolExecution = typeof toolExecutions.$inferSelect;
export type IdempotencyRecord = typeof idempotencyKeys.$inferSelect;
