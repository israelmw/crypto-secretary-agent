import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { upsertApiProfile, saveApiCapabilities } from "@/lib/repositories/apiProfiles";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { rejectSecretsInObject } from "@/lib/security/seedPhraseDetection";
import { getCryptoApiMode } from "@/lib/config/mode";

const capabilitySchema = z.object({
  operationName: z.string(),
  method: z.string(),
  path: z.string(),
  description: z.string().optional(),
  riskLevel: z.enum(["read", "write", "money_movement"]),
  requiresApproval: z.boolean().optional(),
});

export default defineTool({
  description:
    "Save a learned API profile with capabilities. Stores metadata in Postgres and references docs in Blob. Never stores raw API tokens.",
  inputSchema: z.object({
    name: z.string().min(1),
    baseUrl: z.string().url(),
    authType: z.string().min(1),
    docsBlobUrl: z.string().url().optional(),
    openApiUrl: z.string().url().optional(),
    summaryBlobUrl: z.string().url().optional(),
    capabilities: z.array(capabilitySchema).optional(),
    riskLevel: z.enum(["read", "write", "money_movement"]).default("read"),
  }),
  async execute(input, ctx) {
    return auditToolCall(ctx, {
      toolName: "save_api_profile",
      riskLevel: "write",
      payload: input,
      execute: async () => {
        rejectSecretsInObject(input as Record<string, unknown>);
        const telegramUserId = getTelegramUserId(ctx);
        await checkRateLimit(telegramUserId, "api_onboarding");

        const mode = getCryptoApiMode();
        const apiMode =
          mode === "read_only"
            ? "read_only"
            : mode === "demo"
              ? "demo"
              : "sandbox";

        const profile = await upsertApiProfile({
          telegramUserId,
          name: input.name,
          baseUrl: input.baseUrl,
          authType: input.authType,
          openapiUrl: input.openApiUrl ?? null,
          docsBlobUrl: input.docsBlobUrl ?? null,
          summaryBlobUrl: input.summaryBlobUrl ?? null,
          capabilitiesJson: { count: input.capabilities?.length ?? 0 },
          riskLevel: input.riskLevel,
          mode: apiMode,
        });

        if (input.capabilities?.length) {
          await saveApiCapabilities(
            profile.id,
            input.capabilities.map((c) => ({
              operationName: c.operationName,
              method: c.method,
              path: c.path,
              description: c.description ?? null,
              riskLevel: c.riskLevel,
              requiresApproval:
                c.requiresApproval ?? c.riskLevel !== "read",
            })),
          );
        }

        return {
          profileId: profile.id,
          name: profile.name,
          mode: profile.mode,
          riskLevel: profile.riskLevel,
          capabilitiesSaved: input.capabilities?.length ?? 0,
          note: "API tokens are never stored. Use environment variables or Vercel Connect in production.",
        };
      },
    });
  },
});
