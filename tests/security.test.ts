import { describe, it, expect } from "vitest";
import {
  detectSecrets,
  rejectIfSecrets,
  SECRET_REJECTION_MESSAGE,
} from "@/lib/security/seedPhraseDetection";
import {
  redactForLog,
  redactWalletAddress,
  looksLikeSeedPhrase,
  looksLikePrivateKey,
} from "@/lib/security/redact";
import {
  assertMoneyMovementAllowed,
  getCryptoApiMode,
} from "@/lib/config/mode";

describe("seed phrase detection", () => {
  it("rejects 12-word seed phrases", () => {
    const phrase =
      "abandon ability able about above absent absorb abstract absurd abuse access accident";
    expect(detectSecrets(phrase)).toBe(true);
    expect(looksLikeSeedPhrase(phrase)).toBe(true);
  });

  it("rejects private keys", () => {
    const key = "0x" + "a".repeat(64);
    expect(detectSecrets(key)).toBe(true);
    expect(looksLikePrivateKey(key)).toBe(true);
  });

  it("throws with rejection message", () => {
    const phrase =
      "abandon ability able about above absent absorb abstract absurd abuse access accident";
    expect(() => rejectIfSecrets(phrase)).toThrow(SECRET_REJECTION_MESSAGE);
  });

  it("allows normal messages", () => {
    expect(detectSecrets("Give me a portfolio summary")).toBe(false);
  });
});

describe("redaction", () => {
  it("redacts authorization headers", () => {
    const result = redactForLog({
      headers: { Authorization: "Bearer secret-token-12345" },
    });
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(JSON.stringify(result)).toContain("[redacted]");
  });

  it("partially redacts wallet addresses", () => {
    const redacted = redactWalletAddress("bc1qdemoaddress123456789");
    expect(redacted).toContain("...");
    expect(redacted).not.toBe("bc1qdemoaddress123456789");
  });

  it("redacts tokens in strings", () => {
    const result = redactForLog({ token: "abc123secret" });
    expect(JSON.stringify(result)).toContain("[redacted]");
  });
});

describe("mode guards", () => {
  it("defaults to sandbox", () => {
    const original = process.env.CRYPTO_API_MODE;
    delete process.env.CRYPTO_API_MODE;
    expect(getCryptoApiMode()).toBe("sandbox");
    process.env.CRYPTO_API_MODE = original;
  });

  it("blocks production money movement", () => {
    const original = process.env.CRYPTO_API_MODE;
    process.env.CRYPTO_API_MODE = "production";
    expect(() => assertMoneyMovementAllowed()).toThrow(
      "Production money movement is disabled",
    );
    process.env.CRYPTO_API_MODE = original;
  });

  it("blocks read_only money movement", () => {
    const original = process.env.CRYPTO_API_MODE;
    process.env.CRYPTO_API_MODE = "read_only";
    expect(() => assertMoneyMovementAllowed()).toThrow("read_only mode");
    process.env.CRYPTO_API_MODE = original;
  });
});
