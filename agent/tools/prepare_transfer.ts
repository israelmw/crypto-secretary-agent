import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { createApprovalRequest } from "@/lib/repositories/approvals";
import { redactWalletAddress } from "@/lib/security/redact";
import { rejectIfSecrets } from "@/lib/security/seedPhraseDetection";
import { assertMoneyMovementAllowed, getCryptoApiMode } from "@/lib/config/mode";

export default defineTool({
  description:
    "Prepare a proposed transfer without executing it. Creates an approval request. Never moves real money.",
  inputSchema: z.object({
    asset: z.string().min(1),
    amount: z.string().min(1),
    destination: z.string().min(10),
    reason: z.string().min(1),
  }),
  async execute(input, ctx) {
    return auditToolCall(ctx, {
      toolName: "prepare_transfer",
      riskLevel: "money_movement",
      payload: input,
      execute: async () => {
        rejectIfSecrets(input.destination);
        rejectIfSecrets(input.reason);
        assertMoneyMovementAllowed();

        const telegramUserId = getTelegramUserId(ctx);
        const mode = getCryptoApiMode();
        const destinationRedacted = redactWalletAddress(input.destination);

        const approval = await createApprovalRequest({
          telegramUserId,
          actionType: "simulate_transfer",
          riskLevel: "money_movement",
          summary: `Transfer ${input.amount} ${input.asset} to ${destinationRedacted} — ${input.reason}`,
          payloadRedacted: {
            asset: input.asset,
            amount: input.amount,
            destination: destinationRedacted,
            reason: input.reason,
            mode,
          },
        });

        return {
          prepared: true,
          executed: false,
          simulated: false,
          approvalId: approval.id,
          asset: input.asset,
          amount: input.amount,
          destination: destinationRedacted,
          estimatedFee: "0.00005 BTC (mock)",
          riskWarnings: [
            "This is a high-risk money-movement action.",
            "Real transfers are disabled in this demo.",
            "Approve with /approve to run a simulation only.",
          ],
          expiresAt: approval.expiresAt.toISOString(),
          mode,
          message:
            "I can prepare this, but I won't execute it. Use /approve " +
            approval.id +
            " to simulate after review.",
        };
      },
    });
  },
});
