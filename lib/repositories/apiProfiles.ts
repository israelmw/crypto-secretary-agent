import { eq, and, desc, lt } from "drizzle-orm";
import { requireDb } from "@/db/drizzle";
import { apiProfiles, apiCapabilities } from "@/db/schema";
import type { ApiProfile, ApiCapability } from "@/db/schema";

export async function upsertApiProfile(
  data: Omit<ApiProfile, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<ApiProfile> {
  const db = requireDb();
  if (data.id) {
    const [updated] = await db
      .update(apiProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(apiProfiles.id, data.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(apiProfiles).values(data).returning();
  return created;
}

export async function listApiProfilesByUser(
  telegramUserId: string,
): Promise<ApiProfile[]> {
  const db = requireDb();
  return db
    .select()
    .from(apiProfiles)
    .where(eq(apiProfiles.telegramUserId, telegramUserId))
    .orderBy(desc(apiProfiles.createdAt));
}

export async function getApiProfileById(
  id: string,
  telegramUserId: string,
): Promise<ApiProfile | null> {
  const db = requireDb();
  const [profile] = await db
    .select()
    .from(apiProfiles)
    .where(
      and(
        eq(apiProfiles.id, id),
        eq(apiProfiles.telegramUserId, telegramUserId),
      ),
    );
  return profile ?? null;
}

export async function saveApiCapabilities(
  apiProfileId: string,
  capabilities: Omit<ApiCapability, "id" | "apiProfileId" | "createdAt">[],
): Promise<ApiCapability[]> {
  const db = requireDb();
  await db
    .delete(apiCapabilities)
    .where(eq(apiCapabilities.apiProfileId, apiProfileId));
  if (capabilities.length === 0) return [];
  return db
    .insert(apiCapabilities)
    .values(capabilities.map((c) => ({ ...c, apiProfileId })))
    .returning();
}

export async function getApiCapabilities(
  apiProfileId: string,
): Promise<ApiCapability[]> {
  const db = requireDb();
  return db
    .select()
    .from(apiCapabilities)
    .where(eq(apiCapabilities.apiProfileId, apiProfileId));
}
