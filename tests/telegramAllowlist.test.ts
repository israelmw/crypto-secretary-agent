import { describe, it, expect, afterEach } from "vitest";
import {
  isTelegramUserAllowed,
  isTelegramAccessConfigured,
} from "@/lib/security/telegramAllowlist";

describe("telegram allowlist", () => {
  const originalUsernames = process.env.ALLOWED_TELEGRAM_USERNAMES;
  const originalUserIds = process.env.ALLOWED_TELEGRAM_USER_IDS;

  afterEach(() => {
    process.env.ALLOWED_TELEGRAM_USERNAMES = originalUsernames;
    process.env.ALLOWED_TELEGRAM_USER_IDS = originalUserIds;
  });

  it("denies everyone when allowlist is empty", () => {
    delete process.env.ALLOWED_TELEGRAM_USERNAMES;
    delete process.env.ALLOWED_TELEGRAM_USER_IDS;
    expect(isTelegramAccessConfigured()).toBe(false);
    expect(
      isTelegramUserAllowed({ telegramUserId: "1", username: "alice" }),
    ).toBe(false);
  });

  it("allows configured usernames case-insensitively", () => {
    process.env.ALLOWED_TELEGRAM_USERNAMES = "Alice,Bob";
    expect(
      isTelegramUserAllowed({ telegramUserId: "99", username: "alice" }),
    ).toBe(true);
    expect(
      isTelegramUserAllowed({ telegramUserId: "99", username: "charlie" }),
    ).toBe(false);
  });

  it("allows configured numeric user ids", () => {
    process.env.ALLOWED_TELEGRAM_USER_IDS = "12345";
    expect(
      isTelegramUserAllowed({ telegramUserId: "12345", username: null }),
    ).toBe(true);
  });
});
