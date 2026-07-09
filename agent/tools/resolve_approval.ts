import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { resolveApprovalRequest } from "@/lib/repositories/approvals";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { withIdempotency } from "@/lib/repositories/idempotency";

export default defineTool({
  description: "Resolve a pending approval request (approve or reject).",
  inputSchema: z.object({
    approvalId: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
    idempotencyKey: z.string().optional(),
  }),
  async execute(input, ctx) {
    const telegramUserId = getTelegramUserId(ctx);
    await checkRateLimit(telegramUserId, "approval_attempt");

    const idempotencyKey =
      input.idempotencyKey ?? `resolve-${input.approvalId}-${input.decision}`;

    return auditToolCall(ctx, {
      toolName: "resolve_approval",
      riskLevel: "write",
      payload: input,
      idempotencyKey,
      execute: () =>
        withIdempotency(
          {
            telegramUserId,
            idempotencyKey,
            actionType: "resolve_approval",
          },
          async () => {
            const approval = await resolveApprovalRequest(
              input.approvalId,
              telegramUserId,
              input.decision,
            );
            return {
              approvalId: approval.id,
              status: approval.status,
              actionType: approval.actionType,
              resolvedAt: approval.resolvedAt?.toISOString(),
              message:
                input.decision === "approved"
                  ? "Approval granted. For transfers, run simulate_transfer with this approvalId."
                  : "Approval rejected. Action will not proceed.",
            };
          },
        ),
    });
  },
});
