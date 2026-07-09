import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { redactWalletAddress } from "@/lib/security/redact";
import { getCryptoApiMode } from "@/lib/config/mode";

export default defineTool({
  description:
    "Return recent transactions with risk flags. Read-only. Counterparties are redacted.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(10),
  }),
  async execute(input, ctx) {
    return auditToolCall(ctx, {
      toolName: "get_recent_transactions",
      riskLevel: "read",
      payload: input,
      execute: async () => {
        const mode = getCryptoApiMode();

        const transactions = [
          {
            date: "2026-07-08",
            asset: "BTC",
            amount: "0.12",
            type: "withdrawal",
            counterparty: redactWalletAddress("bc1qwithdrawaladdress123456789"),
            status: "confirmed",
            suspicious: true,
            riskNotes: ["Unusual withdrawal size for this account."],
          },
          {
            date: "2026-07-07",
            asset: "ETH",
            amount: "2.5",
            type: "deposit",
            counterparty: redactWalletAddress("0xdepositaddressabcdef1234567890"),
            status: "confirmed",
            suspicious: false,
            riskNotes: [],
          },
          {
            date: "2026-07-06",
            asset: "USDC",
            amount: "5000",
            type: "transfer",
            counterparty: redactWalletAddress("0xvendorpayment9876543210abcdef"),
            status: "confirmed",
            suspicious: false,
            riskNotes: ["Routine vendor payment."],
          },
        ];

        return {
          transactions: transactions.slice(0, input.limit),
          suspiciousCount: transactions.filter((t) => t.suspicious).length,
          mode,
          source: "mock",
        };
      },
    });
  },
});
