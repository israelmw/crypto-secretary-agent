import { eq } from "drizzle-orm";
import { requireDb } from "@/db/drizzle";
import { telegramUsers } from "@/db/schema";

export async function ensureTelegramUser(input: {
  telegramUserId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const db = requireDb();
  const [existing] = await db
    .select()
    .from(telegramUsers)
    .where(eq(telegramUsers.telegramUserId, input.telegramUserId));

  if (existing) {
    const [updated] = await db
      .update(telegramUsers)
      .set({
        username: input.username ?? existing.username,
        firstName: input.firstName ?? existing.firstName,
        lastName: input.lastName ?? existing.lastName,
        updatedAt: new Date(),
      })
      .where(eq(telegramUsers.telegramUserId, input.telegramUserId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(telegramUsers)
    .values({
      telegramUserId: input.telegramUserId,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
    })
    .returning();
  return created;
}
