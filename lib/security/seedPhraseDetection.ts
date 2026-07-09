import { looksLikePrivateKey, looksLikeSeedPhrase } from "./redact";

export const SECRET_REJECTION_MESSAGE =
  "I can't receive, process, store, or help manage private keys or seed phrases. Please revoke/rotate anything that may have been exposed.";

export function detectSecrets(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  return looksLikeSeedPhrase(text) || looksLikePrivateKey(text);
}

export function rejectIfSecrets(text: string): void {
  if (detectSecrets(text)) {
    throw new Error(SECRET_REJECTION_MESSAGE);
  }
}

export function rejectSecretsInObject(
  obj: Record<string, unknown>,
  fields: string[] = ["content", "documentation", "body", "reason", "destination"],
): void {
  for (const field of fields) {
    const value = obj[field];
    if (typeof value === "string") {
      rejectIfSecrets(value);
    }
  }
}
