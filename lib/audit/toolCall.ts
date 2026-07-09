import type { SessionContext } from "eve/tools";
import { createAuditLog } from "@/lib/repositories/auditLogs";
import { recordToolExecution } from "@/lib/repositories/toolExecutions";
import { getTelegramUserId } from "@/lib/context/telegramUser";

type RiskLevel = "read" | "write" | "money_movement";

export async function auditToolCall<T>(
  ctx: SessionContext,
  input: {
    toolName: string;
    riskLevel: RiskLevel;
    payload: unknown;
    approvalId?: string;
    idempotencyKey?: string;
    execute: () => Promise<T>;
  },
): Promise<T> {
  const telegramUserId = getTelegramUserId(ctx);
  try {
    const result = await input.execute();
    await createAuditLog({
      telegramUserId,
      toolName: input.toolName,
      riskLevel: input.riskLevel,
      input: input.payload,
      output: result,
      approvalId: input.approvalId,
      success: true,
    });
    await recordToolExecution({
      telegramUserId,
      toolName: input.toolName,
      input: input.payload,
      output: result,
      status: "success",
      idempotencyKey: input.idempotencyKey,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await createAuditLog({
      telegramUserId,
      toolName: input.toolName,
      riskLevel: input.riskLevel,
      input: input.payload,
      approvalId: input.approvalId,
      success: false,
      error: message,
    });
    await recordToolExecution({
      telegramUserId,
      toolName: input.toolName,
      input: input.payload,
      status: "error",
      idempotencyKey: input.idempotencyKey,
    });
    throw error;
  }
}
