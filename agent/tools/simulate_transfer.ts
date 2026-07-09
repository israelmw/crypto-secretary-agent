import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { getApprovalRequest } from "@/lib/repositories/approvals";
import { withIdempotency } from "@/lib/repositories/idempotency";
import { checkRateLimit } from "@/lib/security/rateLimit";
import {
  assertMoneyMovementAllowed,
  getCryptoApiMode,
} from "@/lib/config/mode";

export default defineTool({
  description:
    "Simulate a transfer after explicit approval. Never executes real money movement. Requires approved approvalId and idempotencyKey.",
  inputSchema: z.object({
    approvalId: z.string().uuid(),
    idempotencyKey: z.string().min(8),
  }),
  approval: always(),
  async execute(input, ctx) {
    const telegramUserId = getTelegramUserId(ctx);
    await checkRateLimit(telegramUserId, "simulated_transfer");
    assertMoneyMovementAllowed();

    return auditToolCall(ctx, {
      toolName: "simulate_transfer",
      riskLevel: "money_movement",
      payload: input,
      approvalId: input.approvalId,
      idempotencyKey: input.idempotencyKey,
      execute: () =>
        withIdempotency(
          {
            telegramUserId,
            idempotencyKey: input.idempotencyKey,
            actionType: "simulate_transfer",
          },
          async () => {
            const approval = await getApprovalRequest(
              input.approvalId,
              telegramUserId,
            );
            if (!approval) {
              throw new Error(`Approval ${input.approvalId} not found.`);
            }
            if (approval.status !== "approved") {
              throw new Error(
                `Approval ${input.approvalId} is ${approval.status}. Only approved requests can be simulated.`,
              );
            }
            if (approval.expiresAt < new Date()) {
              throw new Error(`Approval ${input.approvalId} has expired.`);
            }

            const payload = approval.payloadRedactedJson ?? {};
            const mode = getCryptoApiMode();

            return {
              simulated: true,
              executed: false,
              approvalId: input.approvalId,
              idempotencyKey: input.idempotencyKey,
              transactionId: `sim-${input.idempotencyKey.slice(0, 8)}`,
              asset: payload.asset ?? "unknown",
              amount: payload.amount ?? "unknown",
              destination: payload.destination ?? "[redacted]",
              status: "simulated_success",
              mode,
              message:
                "This is simulated. No real funds moved. Production transfers require a separate hardened integration.",
            };
          },
        ),
    });
  },
});
