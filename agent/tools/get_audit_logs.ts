import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { getRecentAuditLogs } from "@/lib/repositories/auditLogs";

export default defineTool({
  description: "Return recent audit log entries with redacted inputs.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(10),
  }),
  async execute(input, ctx) {
    return auditToolCall(ctx, {
      toolName: "get_audit_logs",
      riskLevel: "read",
      payload: input,
      execute: async () => {
        const telegramUserId = getTelegramUserId(ctx);
        const logs = await getRecentAuditLogs(telegramUserId, input.limit);
        return {
          entries: logs.map((l) => ({
            id: l.id,
            timestamp: l.timestamp.toISOString(),
            toolName: l.toolName,
            riskLevel: l.riskLevel,
            inputRedacted: l.inputRedactedJson,
            outputSummary: l.outputSummary,
            approvalId: l.approvalId,
            success: l.success,
            error: l.error,
          })),
          count: logs.length,
        };
      },
    });
  },
});
