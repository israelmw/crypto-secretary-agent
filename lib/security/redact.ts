const SEED_WORD_COUNT = new Set([12, 24]);

const BIP39_SAMPLE = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
  "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
  "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
  "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance",
];

const PRIVATE_KEY_PATTERNS = [
  /^(0x)?[0-9a-fA-F]{64}$/,
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51,52}$/,
  /^-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export function redactWalletAddress(address: string): string {
  if (!address || address.length < 10) return "[redacted]";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "[redacted-email]";
  return `${local.slice(0, 2)}***@${domain}`;
}

export function redactPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "[redacted-phone]";
  return `***${digits.slice(-4)}`;
}

export function redactSecrets(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[max-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item, depth + 1));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("authorization") ||
        lowerKey.includes("api_key") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("token") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("private_key") ||
        lowerKey.includes("seed") ||
        lowerKey.includes("mnemonic")
      ) {
        result[key] = "[redacted]";
        continue;
      }
      if (lowerKey.includes("wallet") || lowerKey.includes("address")) {
        result[key] =
          typeof val === "string" ? redactWalletAddress(val) : "[redacted]";
        continue;
      }
      if (lowerKey.includes("email") && typeof val === "string") {
        result[key] = redactEmail(val);
        continue;
      }
      if (lowerKey.includes("phone") && typeof val === "string") {
        result[key] = redactPhone(val);
        continue;
      }
      result[key] = redactSecrets(val, depth + 1);
    }
    return result;
  }
  return value;
}

function redactString(input: string): string {
  let result = input;

  result = result.replace(
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    "Bearer [redacted]",
  );
  result = result.replace(
    /(api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi,
    "$1=[redacted]",
  );
  result = result.replace(/0x[0-9a-fA-F]{40}/g, (m) => redactWalletAddress(m));
  result = result.replace(/bc1[a-z0-9]{20,}/gi, (m) => redactWalletAddress(m));

  if (looksLikePrivateKey(result)) {
    return "[redacted-private-key]";
  }
  if (looksLikeSeedPhrase(result)) {
    return "[redacted-seed-phrase]";
  }

  return result;
}

export function looksLikeSeedPhrase(text: string): boolean {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!SEED_WORD_COUNT.has(words.length)) return false;

  const bip39Hits = words.filter((w) => BIP39_SAMPLE.includes(w)).length;
  return bip39Hits >= words.length * 0.6;
}

export function looksLikePrivateKey(text: string): boolean {
  const trimmed = text.trim();
  return PRIVATE_KEY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function redactForLog(input: unknown): Record<string, unknown> {
  const redacted = redactSecrets(input);
  if (redacted && typeof redacted === "object" && !Array.isArray(redacted)) {
    return redacted as Record<string, unknown>;
  }
  return { value: redacted };
}

export function summarizeOutput(output: unknown): string {
  if (output === null || output === undefined) return "null";
  if (typeof output === "string") {
    const redacted = redactString(output);
    return redacted.length > 200 ? `${redacted.slice(0, 200)}...` : redacted;
  }
  try {
    const json = JSON.stringify(redactSecrets(output));
    return json.length > 300 ? `${json.slice(0, 300)}...` : json;
  } catch {
    return "[unserializable-output]";
  }
}
