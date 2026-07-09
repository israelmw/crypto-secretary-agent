import { eq, and, lt, desc } from "drizzle-orm";
import { requireDb } from "@/db/drizzle";
import { approvalRequests } from "@/db/schema";
import type { ApprovalRequest } from "@/db/schema";
import { getRedis, RedisKeys } from "@/lib/storage/redis";

export async function createApprovalRequest(input: {
  telegramUserId: string;
  actionType: string;
  riskLevel: "read" | "write" | "money_movement";
  summary: string;
  payloadRedacted: Record<string, unknown>;
  expiresInMinutes?: number;
}): Promise<ApprovalRequest> {
  const db = requireDb();
  const expiresAt = new Date(
    Date.now() + (input.expiresInMinutes ?? 30) * 60 * 1000,
  );
  const [approval] = await db
    .insert(approvalRequests)
    .values({
      telegramUserId: input.telegramUserId,
      actionType: input.actionType,
      riskLevel: input.riskLevel,
      summary: input.summary,
      payloadRedactedJson: input.payloadRedacted,
      status: "pending",
      expiresAt,
    })
    .returning();

  try {
    const redis = getRedis();
    await redis.set(
      RedisKeys.approvalPending(approval.id),
      JSON.stringify({ status: "pending", telegramUserId: input.telegramUserId }),
      { ex: (input.expiresInMinutes ?? 30) * 60 },
    );
  } catch {
    // Redis is optional for fast lookup; Neon is source of truth.
  }

  return approval;
}

export async function getApprovalRequest(
  id: string,
  telegramUserId?: string,
): Promise<ApprovalRequest | null> {
  const db = requireDb();
  const conditions = telegramUserId
    ? and(
        eq(approvalRequests.id, id),
        eq(approvalRequests.telegramUserId, telegramUserId),
      )
    : eq(approvalRequests.id, id);
  const [approval] = await db
    .select()
    .from(approvalRequests)
    .where(conditions);
  return approval ?? null;
}

export async function expireStaleApprovals(): Promise<number> {
  const db = requireDb();
  const now = new Date();
  const stale = await db
    .update(approvalRequests)
    .set({ status: "expired" })
    .where(
      and(
        eq(approvalRequests.status, "pending"),
        lt(approvalRequests.expiresAt, now),
      ),
    )
    .returning();
  return stale.length;
}

export async function resolveApprovalRequest(
  id: string,
  telegramUserId: string,
  status: "approved" | "rejected",
): Promise<ApprovalRequest> {
  const db = requireDb();
  await expireStaleApprovals();

  const existing = await getApprovalRequest(id, telegramUserId);
  if (!existing) {
    throw new Error(`Approval request ${id} not found.`);
  }
  if (existing.status !== "pending") {
    throw new Error(
      `Approval ${id} is already ${existing.status}. Approvals cannot be reused.`,
    );
  }
  if (existing.expiresAt < new Date()) {
    await db
      .update(approvalRequests)
      .set({ status: "expired" })
      .where(eq(approvalRequests.id, id));
    throw new Error(`Approval ${id} has expired.`);
  }

  const [updated] = await db
    .update(approvalRequests)
    .set({ status, resolvedAt: new Date() })
    .where(
      and(
        eq(approvalRequests.id, id),
        eq(approvalRequests.telegramUserId, telegramUserId),
        eq(approvalRequests.status, "pending"),
      ),
    )
    .returning();

  if (!updated) {
    throw new Error(`Failed to resolve approval ${id}. It may have been used already.`);
  }

  try {
    const redis = getRedis();
    await redis.del(RedisKeys.approvalPending(id));
  } catch {
    // Non-fatal
  }

  return updated;
}

export async function listPendingApprovals(
  telegramUserId: string,
): Promise<ApprovalRequest[]> {
  const db = requireDb();
  await expireStaleApprovals();
  return db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.telegramUserId, telegramUserId),
        eq(approvalRequests.status, "pending"),
      ),
    )
    .orderBy(desc(approvalRequests.createdAt));
}
