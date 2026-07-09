const DENY_MESSAGE =
  "Access denied. This bot is private. Contact the operator to request access.";

function parseList(value: string | undefined): Set<string> {
  if (!value?.trim()) return new Set();
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean),
  );
}

function getAllowedUsernames(): Set<string> {
  return parseList(process.env.ALLOWED_TELEGRAM_USERNAMES);
}

function getAllowedUserIds(): Set<string> {
  if (!process.env.ALLOWED_TELEGRAM_USER_IDS?.trim()) return new Set();
  return new Set(
    process.env.ALLOWED_TELEGRAM_USER_IDS.split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function isTelegramAccessConfigured(): boolean {
  return (
    getAllowedUsernames().size > 0 || getAllowedUserIds().size > 0
  );
}

export function isTelegramUserAllowed(input: {
  telegramUserId: string;
  username?: string | null;
}): boolean {
  const allowedUsernames = getAllowedUsernames();
  const allowedUserIds = getAllowedUserIds();

  if (allowedUsernames.size === 0 && allowedUserIds.size === 0) {
    return false;
  }

  if (allowedUserIds.has(input.telegramUserId)) {
    return true;
  }

  const username = input.username?.toLowerCase().replace(/^@/, "");
  if (username && allowedUsernames.has(username)) {
    return true;
  }

  return false;
}

export function getTelegramDenyMessage(): string {
  return DENY_MESSAGE;
}
