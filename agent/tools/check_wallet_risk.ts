import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { redactWalletAddress } from "@/lib/security/redact";
import { rejectIfSecrets } from "@/lib/security/seedPhraseDetection";

export default defineTool({
  description:
    "Simulated wallet risk assessment. Does not call real chain analytics unless sandbox is configured.",
  inputSchema: z.object({
    walletAddress: z.string().min(10),
    network: z.string().optional(),
  }),
  async execute(input, ctx) {
    return auditToolCall(ctx, {
      toolName: "check_wallet_risk",
      riskLevel: "read",
      payload: input,
      execute: async () => {
        rejectIfSecrets(input.walletAddress);

        const address = input.walletAddress;
        const redacted = redactWalletAddress(address);
        const suspiciousPatterns = [
          address.toLowerCase().includes("mixer"),
          address.toLowerCase().includes("tornado"),
        ];

        const riskScore = suspiciousPatterns.some(Boolean) ? 85 : 22;
        const labels =
          riskScore > 50
            ? ["high_risk", "needs_review"]
            : ["low_risk", "routine"];

        return {
          walletAddress: redacted,
          network: input.network ?? "unknown",
          riskScore,
          labels,
          warningSigns:
            riskScore > 50
              ? ["Associated with known high-risk patterns (simulated)."]
              : [],
          recommendation:
            riskScore > 50
              ? "Do not send funds without manual compliance review."
              : "No immediate concerns in simulated assessment.",
          simulated: true,
          note: "This is a demo risk assessment. Production should use licensed chain analytics.",
        };
      },
    });
  },
});
