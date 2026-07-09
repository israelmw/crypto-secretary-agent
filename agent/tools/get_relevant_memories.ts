import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { getRelevantMemories } from "@/lib/repositories/memories";

export default defineTool({
  description: "Retrieve safe saved preferences relevant to the current request.",
  inputSchema: z.object({
    query: z.string().optional(),
    limit: z.number().int().min(1).max(20).default(5),
  }),
  async execute(input, ctx) {
    return auditToolCall(ctx, {
      toolName: "get_relevant_memories",
      riskLevel: "read",
      payload: input,
      execute: async () => {
        const telegramUserId = getTelegramUserId(ctx);
        const memories = await getRelevantMemories(
          telegramUserId,
          input.query,
          input.limit,
        );
        return {
          memories: memories.map((m) => ({
            id: m.id,
            scope: m.scope,
            content: m.content,
            importance: m.importance,
          })),
          count: memories.length,
        };
      },
    });
  },
});
