import { eq, and } from "drizzle-orm";
import { requireDb } from "@/db/drizzle";
import { toolExecutions } from "@/db/schema";
import type { ToolExecution } from "@/db/schema";
import { redactForLog } from "@/lib/security/redact";

export async function recordToolExecution(input: {
  telegramUserId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  status: string;
  idempotencyKey?: string;
}): Promise<ToolExecution> {
  const db = requireDb();
  const [execution] = await db
    .insert(toolExecutions)
    .values({
      telegramUserId: input.telegramUserId,
      toolName: input.toolName,
      inputRedactedJson: redactForLog(input.input),
      outputRedactedJson: input.output
        ? redactForLog(input.output)
        : null,
      status: input.status,
      idempotencyKey: input.idempotencyKey ?? null,
    })
    .returning();
  return execution;
}

export async function getToolExecutionByIdempotency(
  telegramUserId: string,
  idempotencyKey: string,
): Promise<ToolExecution | null> {
  const db = requireDb();
  const [execution] = await db
    .select()
    .from(toolExecutions)
    .where(
      and(
        eq(toolExecutions.telegramUserId, telegramUserId),
        eq(toolExecutions.idempotencyKey, idempotencyKey),
      ),
    );
  return execution ?? null;
}
