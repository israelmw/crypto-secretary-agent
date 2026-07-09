import { eq, desc, and } from "drizzle-orm";
import { requireDb } from "@/db/drizzle";
import { auditLogs } from "@/db/schema";
import type { AuditLog } from "@/db/schema";
import { redactForLog, summarizeOutput } from "@/lib/security/redact";

export async function createAuditLog(input: {
  telegramUserId: string;
  toolName: string;
  riskLevel: "read" | "write" | "money_movement";
  input: unknown;
  output?: unknown;
  approvalId?: string;
  success: boolean;
  error?: string;
}): Promise<AuditLog> {
  const db = requireDb();
  const [entry] = await db
    .insert(auditLogs)
    .values({
      telegramUserId: input.telegramUserId,
      toolName: input.toolName,
      riskLevel: input.riskLevel,
      inputRedactedJson: redactForLog(input.input),
      outputSummary: input.output
        ? summarizeOutput(input.output)
        : input.error ?? null,
      approvalId: input.approvalId ?? null,
      success: input.success,
      error: input.error ?? null,
    })
    .returning();
  return entry;
}

export async function getRecentAuditLogs(
  telegramUserId: string,
  limit = 10,
): Promise<AuditLog[]> {
  const db = requireDb();
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.telegramUserId, telegramUserId))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

export async function getAuditLogById(
  id: string,
  telegramUserId: string,
): Promise<AuditLog | null> {
  const db = requireDb();
  const [entry] = await db
    .select()
    .from(auditLogs)
    .where(
      and(eq(auditLogs.id, id), eq(auditLogs.telegramUserId, telegramUserId)),
    );
  return entry ?? null;
}
