import { eq, desc, and } from "drizzle-orm";
import { requireDb } from "@/db/drizzle";
import { agentMemories } from "@/db/schema";
import type { AgentMemory } from "@/db/schema";
import { getRedis, RedisKeys } from "@/lib/storage/redis";
import { rejectIfSecrets } from "@/lib/security/seedPhraseDetection";

export async function saveMemory(input: {
  telegramUserId: string;
  scope?: string;
  content: string;
  importance?: number;
}): Promise<AgentMemory> {
  rejectIfSecrets(input.content);
  const db = requireDb();
  const [memory] = await db
    .insert(agentMemories)
    .values({
      telegramUserId: input.telegramUserId,
      scope: input.scope ?? "preference",
      content: input.content,
      importance: input.importance ?? 1,
    })
    .returning();

  try {
    const redis = getRedis();
    await redis.del(RedisKeys.memoryCache(input.telegramUserId));
  } catch {
    // Non-fatal
  }

  return memory;
}

export async function getMemoriesByUser(
  telegramUserId: string,
  scope?: string,
): Promise<AgentMemory[]> {
  const db = requireDb();
  const conditions = scope
    ? and(
        eq(agentMemories.telegramUserId, telegramUserId),
        eq(agentMemories.scope, scope),
      )
    : eq(agentMemories.telegramUserId, telegramUserId);
  return db
    .select()
    .from(agentMemories)
    .where(conditions)
    .orderBy(desc(agentMemories.importance), desc(agentMemories.updatedAt));
}

export async function getRelevantMemories(
  telegramUserId: string,
  query?: string,
  limit = 5,
): Promise<AgentMemory[]> {
  try {
    const redis = getRedis();
    const cached = await redis.get<AgentMemory[]>(
      RedisKeys.memoryCache(telegramUserId),
    );
    if (cached && !query) return cached.slice(0, limit);
  } catch {
    // Fall through to DB
  }

  const all = await getMemoriesByUser(telegramUserId);
  let filtered = all;
  if (query) {
    const lower = query.toLowerCase();
    filtered = all.filter((m) => m.content.toLowerCase().includes(lower));
  }

  const result = filtered.slice(0, limit);

  if (!query) {
    try {
      const redis = getRedis();
      await redis.set(RedisKeys.memoryCache(telegramUserId), result, { ex: 300 });
    } catch {
      // Non-fatal
    }
  }

  return result;
}
