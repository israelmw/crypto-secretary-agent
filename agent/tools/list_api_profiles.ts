import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { listApiProfilesByUser } from "@/lib/repositories/apiProfiles";

export default defineTool({
  description: "List saved API profiles for the current Telegram user.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    return auditToolCall(ctx, {
      toolName: "list_api_profiles",
      riskLevel: "read",
      payload: {},
      execute: async () => {
        const telegramUserId = getTelegramUserId(ctx);
        const profiles = await listApiProfilesByUser(telegramUserId);
        return {
          profiles: profiles.map((p) => ({
            id: p.id,
            name: p.name,
            baseUrl: p.baseUrl,
            authType: p.authType,
            riskLevel: p.riskLevel,
            mode: p.mode,
            openApiUrl: p.openapiUrl,
            summaryBlobUrl: p.summaryBlobUrl,
          })),
          count: profiles.length,
        };
      },
    });
  },
});
