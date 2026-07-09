import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { createApprovalRequest } from "@/lib/repositories/approvals";
import { getCryptoApiMode } from "@/lib/config/mode";

export default defineTool({
  description: "Create a human approval request for a risky action.",
  inputSchema: z.object({
    actionType: z.string().min(1),
    riskLevel: z.enum(["read", "write", "money_movement"]),
    summary: z.string().min(5),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
  async execute(input, ctx) {
    return auditToolCall(ctx, {
      toolName: "create_approval",
      riskLevel: input.riskLevel === "read" ? "write" : input.riskLevel,
      payload: input,
      execute: async () => {
        const telegramUserId = getTelegramUserId(ctx);
        const mode = getCryptoApiMode();

        const approval = await createApprovalRequest({
          telegramUserId,
          actionType: input.actionType,
          riskLevel: input.riskLevel,
          summary: input.summary,
          payloadRedacted: { ...input.payload, mode },
        });

        return {
          approvalId: approval.id,
          status: approval.status,
          summary: approval.summary,
          riskLevel: approval.riskLevel,
          mode,
          expiresAt: approval.expiresAt.toISOString(),
          commands: {
            approve: `/approve ${approval.id}`,
            reject: `/reject ${approval.id}`,
          },
        };
      },
    });
  },
});
