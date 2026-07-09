import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

// Production should use Vercel Connect, scoped OAuth tokens, hardware wallets,
// MPC, custody APIs, or a proper secrets manager — not a single master key.
function getMasterKey(): Buffer {
  const key = process.env.DEMO_MASTER_KEY;
  if (!key || key.length < 16) {
    throw new Error(
      "DEMO_MASTER_KEY must be set (min 16 chars) for demo encryption.",
    );
  }
  return createHash("sha256").update(key).digest();
}

export function encryptCredentialReference(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptCredentialReference(ciphertext: string): string {
  const [ivB64, tagB64, dataB64] = ciphertext.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted credential reference format.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export function hashCredentialReference(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}
