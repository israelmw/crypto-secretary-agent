import { getRedis, RedisKeys } from "@/lib/storage/redis";

export type RateLimitAction =
  | "telegram_message"
  | "api_call"
  | "api_onboarding"
  | "approval_attempt"
  | "simulated_transfer";

const LIMITS: Record<RateLimitAction, { max: number; windowSec: number }> = {
  telegram_message: { max: 30, windowSec: 60 },
  api_call: { max: 20, windowSec: 60 },
  api_onboarding: { max: 5, windowSec: 300 },
  approval_attempt: { max: 10, windowSec: 60 },
  simulated_transfer: { max: 5, windowSec: 300 },
};

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSec: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function checkRateLimit(
  telegramUserId: string,
  action: RateLimitAction,
): Promise<void> {
  const { max, windowSec } = LIMITS[action];
  const redis = getRedis();
  const key = `${RedisKeys.rateLimit(telegramUserId)}:${action}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSec);
  }
  if (count > max) {
    const ttl = (await redis.ttl(key)) || windowSec;
    throw new RateLimitError(
      `Rate limit exceeded for ${action}. Try again in ${ttl}s.`,
      ttl,
    );
  }
}
