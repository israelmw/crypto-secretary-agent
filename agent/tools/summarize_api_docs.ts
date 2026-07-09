import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { uploadBlob, BlobPaths } from "@/lib/storage/blob";
import { rejectIfSecrets } from "@/lib/security/seedPhraseDetection";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { randomUUID } from "node:crypto";

type ParsedCapability = {
  operationName: string;
  method: string;
  path: string;
  description?: string;
  riskLevel: "read" | "write" | "money_movement";
  requiresApproval: boolean;
};

function classifyRisk(path: string, method: string, description = ""): "read" | "write" | "money_movement" {
  const combined = `${path} ${method} ${description}`.toLowerCase();
  const moneyPatterns = [
    "transfer", "withdraw", "send", "payment", "payout", "swap", "execute",
  ];
  if (moneyPatterns.some((p) => combined.includes(p))) {
    return "money_movement";
  }
  if (method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD") {
    return "read";
  }
  return "write";
}

function parseOpenApi(spec: Record<string, unknown>): ParsedCapability[] {
  const paths = (spec.paths as Record<string, Record<string, unknown>>) ?? {};
  const capabilities: ParsedCapability[] = [];

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, details] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
      const op = details as Record<string, unknown>;
      const operationId =
        (op.operationId as string) ??
        `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const description = (op.summary as string) ?? (op.description as string) ?? "";
      const riskLevel = classifyRisk(path, method, description);
      capabilities.push({
        operationName: operationId,
        method: method.toUpperCase(),
        path,
        description,
        riskLevel,
        requiresApproval: riskLevel !== "read",
      });
    }
  }
  return capabilities;
}

function buildSummary(capabilities: ParsedCapability[], authRequired: string) {
  const readOps = capabilities.filter((c) => c.riskLevel === "read");
  const writeOps = capabilities.filter((c) => c.riskLevel === "write");
  const dangerousOps = capabilities.filter((c) => c.riskLevel === "money_movement");

  return {
    availableEndpoints: capabilities.length,
    readOperations: readOps.map((c) => `${c.method} ${c.path}`),
    writeOperations: writeOps.map((c) => `${c.method} ${c.path}`),
    dangerousOperations: dangerousOps.map((c) => `${c.method} ${c.path}`),
    requiredAuth: authRequired,
    suggestedToolNames: capabilities.map((c) => `call_${c.operationName}`),
    safetyNotes: [
      "Write operations require human approval before execution.",
      "Money-movement operations are simulated only in this demo.",
      "Never store API tokens or private keys in the database.",
      "Verify base URL and auth type before calling endpoints.",
    ],
    recommendedApprovalRules: {
      write: "Require /approve before call_registered_api with riskLevel=write",
      money_movement: "Blocked from real execution; simulate only after approval",
    },
  };
}

export default defineTool({
  description:
    "Summarize API documentation (text or OpenAPI JSON/YAML). Classifies endpoints by risk level and suggests safe tool usage.",
  inputSchema: z.object({
    documentation: z.string().optional(),
    openApiJson: z.record(z.string(), z.unknown()).optional(),
    docsBlobUrl: z.string().url().optional(),
    authType: z.string().optional(),
  }),
  async execute(input, ctx) {
    return auditToolCall(ctx, {
      toolName: "summarize_api_docs",
      riskLevel: "read",
      payload: input,
      execute: async () => {
        const telegramUserId = getTelegramUserId(ctx);
        await checkRateLimit(telegramUserId, "api_onboarding");

        if (input.documentation) rejectIfSecrets(input.documentation);

        let capabilities: ParsedCapability[] = [];
        if (input.openApiJson) {
          capabilities = parseOpenApi(input.openApiJson);
        } else if (input.documentation) {
          const lines = input.documentation.split("\n").filter(Boolean);
          for (const line of lines) {
            const match = line.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/i);
            if (match) {
              const method = match[1].toUpperCase();
              const path = match[2];
              const riskLevel = classifyRisk(path, method, line);
              capabilities.push({
                operationName: `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
                method,
                path,
                description: line,
                riskLevel,
                requiresApproval: riskLevel !== "read",
              });
            }
          }
        }

        const authRequired = input.authType ?? "bearer (configure via env, not stored)";
        const summary = buildSummary(capabilities, authRequired);

        let summaryBlobUrl = input.docsBlobUrl;
        if (capabilities.length > 0) {
          const profileId = randomUUID();
          const summaryMd = [
            `# API Summary`,
            ``,
            `Endpoints: ${summary.availableEndpoints}`,
            ``,
            `## Read operations`,
            ...summary.readOperations.map((o) => `- ${o}`),
            ``,
            `## Write operations`,
            ...summary.writeOperations.map((o) => `- ${o}`),
            ``,
            `## Dangerous operations`,
            ...summary.dangerousOperations.map((o) => `- ${o} (SIMULATED ONLY)`),
            ``,
            `## Safety notes`,
            ...summary.safetyNotes.map((n) => `- ${n}`),
          ].join("\n");

          const blob = await uploadBlob(
            BlobPaths.summary(telegramUserId, profileId),
            summaryMd,
            "text/markdown",
          );
          summaryBlobUrl = blob.url;
        }

        return {
          ...summary,
          capabilities,
          summaryBlobUrl,
        };
      },
    });
  },
});
