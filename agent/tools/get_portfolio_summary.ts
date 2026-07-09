import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getCryptoApiMode, isSandboxOrDemo } from "@/lib/config/mode";

export default defineTool({
  description:
    "Return a portfolio summary from mock or sandbox data. Read-only. Never accesses private keys.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return auditToolCall(ctx, {
      toolName: "get_portfolio_summary",
      riskLevel: "read",
      payload: {},
      execute: async () => {
        const mode = getCryptoApiMode();
        const source = isSandboxOrDemo() ? (mode === "demo" ? "mock" : "sandbox") : "mock";

        if (source === "sandbox" && process.env.CRYPTO_API_BASE_URL && process.env.CRYPTO_API_TOKEN) {
          try {
            const response = await fetch(
              `${process.env.CRYPTO_API_BASE_URL}/portfolio`,
              {
                headers: { Authorization: `Bearer ${process.env.CRYPTO_API_TOKEN}` },
              },
            );
            if (response.ok) {
              const data = await response.json();
              return {
                totalBalance: data.totalBalance ?? data.total ?? "N/A",
                assets: data.assets ?? [],
                change24h: data.change24h ?? "0%",
                riskNotes: ["Data from sandbox API."],
                source: "sandbox",
                mode,
              };
            }
          } catch {
            // Fall through to mock
          }
        }

        return {
          totalBalance: "$124,580.42",
          assets: [
            { symbol: "BTC", balance: "1.24", value: "$82,400", change24h: "+1.2%" },
            { symbol: "ETH", balance: "12.5", value: "$31,200", change24h: "-0.4%" },
            { symbol: "USDC", balance: "11,000", value: "$11,000", change24h: "0%" },
          ],
          change24h: "+0.8%",
          riskNotes: [
            "Demo portfolio — not connected to production wallets.",
            "Large BTC concentration (>60% of portfolio).",
          ],
          source: "mock",
          mode,
        };
      },
    });
  },
});
