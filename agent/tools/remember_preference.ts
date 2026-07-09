import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { saveMemory } from "@/lib/repositories/memories";
import { rejectIfSecrets } from "@/lib/security/seedPhraseDetection";

export default defineTool({
  description:
    "Save a safe user preference or operational note. Never stores secrets, keys, or seed phrases.",
  inputSchema: z.object({
    content: z.string().min(5).max(500),
    scope: z.string().default("preference"),
    importance: z.number().int().min(1).max(10).default(1),
  }),
  async execute(input, ctx) {
    return auditToolCall(ctx, {
      toolName: "remember_preference",
      riskLevel: "write",
      payload: input,
      execute: async () => {
        rejectIfSecrets(input.content);
        const telegramUserId = getTelegramUserId(ctx);
        const memory = await saveMemory({
          telegramUserId,
          content: input.content,
          scope: input.scope,
          importance: input.importance,
        });
        return {
          saved: true,
          memoryId: memory.id,
          scope: memory.scope,
          content: memory.content,
        };
      },
    });
  },
});
