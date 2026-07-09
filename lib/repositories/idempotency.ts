import { eq, and } from "drizzle-orm";
import { requireDb } from "@/db/drizzle";
import { idempotencyKeys } from "@/db/schema";
import type { IdempotencyRecord } from "@/db/schema";
import { getRedis, RedisKeys } from "@/lib/storage/redis";

export async function acquireIdempotencyLock(
  idempotencyKey: string,
  ttlSec = 300,
): Promise<boolean> {
  try {
    const redis = getRedis();
    const result = await redis.set(
      RedisKeys.idempotencyLock(idempotencyKey),
      "1",
      { nx: true, ex: ttlSec },
    );
    return result === "OK";
  } catch {
    return true;
  }
}

export async function releaseIdempotencyLock(
  idempotencyKey: string,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(RedisKeys.idempotencyLock(idempotencyKey));
  } catch {
    // Non-fatal
  }
}

export async function getIdempotencyRecord(
  telegramUserId: string,
  idempotencyKey: string,
  actionType: string,
): Promise<IdempotencyRecord | null> {
  const db = requireDb();
  const [record] = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.telegramUserId, telegramUserId),
        eq(idempotencyKeys.idempotencyKey, idempotencyKey),
        eq(idempotencyKeys.actionType, actionType),
      ),
    );
  return record ?? null;
}

export async function saveIdempotencyRecord(input: {
  telegramUserId: string;
  idempotencyKey: string;
  actionType: string;
  status: string;
  result?: Record<string, unknown>;
  expiresInHours?: number;
}): Promise<IdempotencyRecord> {
  const db = requireDb();
  const expiresAt = new Date(
    Date.now() + (input.expiresInHours ?? 24) * 60 * 60 * 1000,
  );
  const [record] = await db
    .insert(idempotencyKeys)
    .values({
      telegramUserId: input.telegramUserId,
      idempotencyKey: input.idempotencyKey,
      actionType: input.actionType,
      status: input.status,
      resultJson: input.result ?? null,
      expiresAt,
    })
    .returning();
  return record;
}

export async function withIdempotency<T extends Record<string, unknown>>(
  input: {
    telegramUserId: string;
    idempotencyKey: string;
    actionType: string;
  },
  fn: () => Promise<T>,
): Promise<T> {
  const existing = await getIdempotencyRecord(
    input.telegramUserId,
    input.idempotencyKey,
    input.actionType,
  );
  if (existing?.resultJson) {
    return existing.resultJson as T;
  }

  const locked = await acquireIdempotencyLock(input.idempotencyKey);
  if (!locked) {
    const retry = await getIdempotencyRecord(
      input.telegramUserId,
      input.idempotencyKey,
      input.actionType,
    );
    if (retry?.resultJson) return retry.resultJson as T;
    throw new Error("Idempotency lock held. Retry shortly.");
  }

  try {
    const result = await fn();
    await saveIdempotencyRecord({
      telegramUserId: input.telegramUserId,
      idempotencyKey: input.idempotencyKey,
      actionType: input.actionType,
      status: "completed",
      result,
    });
    return result;
  } finally {
    await releaseIdempotencyLock(input.idempotencyKey);
  }
}
