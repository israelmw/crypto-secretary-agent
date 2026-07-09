import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required.",
      );
    }
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

export const RedisKeys = {
  rateLimit: (telegramUserId: string) => `rate_limit:${telegramUserId}`,
  session: (telegramUserId: string) => `session:${telegramUserId}`,
  approvalPending: (approvalId: string) => `approval_pending:${approvalId}`,
  memoryCache: (telegramUserId: string) => `memory_cache:${telegramUserId}`,
  idempotencyLock: (idempotencyKey: string) =>
    `idempotency_lock:${idempotencyKey}`,
  riskContext: (telegramUserId: string) => `risk_context:${telegramUserId}`,
  pendingCommand: (telegramUserId: string) =>
    `pending_command:${telegramUserId}`,
} as const;
