import { put, head } from "@vercel/blob";

export const BlobPaths = {
  openApi: (telegramUserId: string, apiProfileId: string) =>
    `docs/${telegramUserId}/${apiProfileId}/openapi.json`,
  summary: (telegramUserId: string, apiProfileId: string) =>
    `docs/${telegramUserId}/${apiProfileId}/summary.md`,
  upload: (telegramUserId: string, fileId: string) =>
    `uploads/${telegramUserId}/${fileId}`,
  auditExport: (telegramUserId: string, date: string) =>
    `exports/${telegramUserId}/audit-${date}.json`,
} as const;

export async function uploadBlob(
  pathname: string,
  body: string | Buffer | Blob,
  contentType?: string,
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for blob uploads.");
  }
  return put(pathname, body, {
    access: "public",
    token,
    contentType,
  });
}

export async function blobExists(url: string): Promise<boolean> {
  try {
    await head(url);
    return true;
  } catch {
    return false;
  }
}
