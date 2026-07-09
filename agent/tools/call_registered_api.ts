import { defineTool } from "eve/tools";
import { z } from "zod";
import { auditToolCall } from "@/lib/audit/toolCall";
import { getTelegramUserId } from "@/lib/context/telegramUser";
import { getApiProfileById } from "@/lib/repositories/apiProfiles";
import { getApprovalRequest } from "@/lib/repositories/approvals";
import { withIdempotency } from "@/lib/repositories/idempotency";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { redactForLog } from "@/lib/security/redact";
import {
  assertMoneyMovementAllowed,
  getCryptoApiMode,
  isReadOnlyMode,
  isSandboxOrDemo,
} from "@/lib/config/mode";

export default defineTool({
  description:
    "Call a registered API endpoint. Read calls allowed directly. Write calls require approval. Money-movement calls are simulated only.",
  inputSchema: z.object({
    apiProfileId: z.string().uuid(),
    operationName: z.string(),
    method: z.string(),
    path: z.string(),
    query: z.record(z.string(), z.unknown()).optional(),
    body: z.record(z.string(), z.unknown()).optional(),
    riskLevel: z.enum(["read", "write", "money_movement"]),
    approvalId: z.string().uuid().optional(),
    idempotencyKey: z.string().optional(),
  }),
  approval: ({ toolInput }) => {
    if (toolInput?.riskLevel === "write") return "user-approval";
    if (toolInput?.riskLevel === "money_movement") return "user-approval";
    return "not-applicable";
  },
  async execute(input, ctx) {
    const telegramUserId = getTelegramUserId(ctx);
    await checkRateLimit(telegramUserId, "api_call");

    if (isReadOnlyMode() && input.riskLevel !== "read") {
      throw new Error("read_only mode: only read operations are permitted.");
    }

    if (input.riskLevel === "money_movement") {
      assertMoneyMovementAllowed();
    }

    const profile = await getApiProfileById(input.apiProfileId, telegramUserId);
    if (!profile) {
      throw new Error(`API profile ${input.apiProfileId} not found.`);
    }

    if (input.riskLevel === "write" || input.riskLevel === "money_movement") {
      if (!input.approvalId) {
        throw new Error(
          "This operation requires approval. Create an approval request first, then pass approvalId.",
        );
      }
      const approval = await getApprovalRequest(input.approvalId, telegramUserId);
      if (!approval || approval.status !== "approved") {
        throw new Error(
          `Approval ${input.approvalId} is missing, pending, rejected, or expired.`,
        );
      }
    }

    const idempotencyKey =
      input.idempotencyKey ??
      (input.riskLevel !== "read"
        ? `${input.operationName}-${Date.now()}`
        : undefined);

    const executeCall = async () => {
      if (input.riskLevel === "money_movement" || !isSandboxOrDemo()) {
        return {
          simulated: true,
          operationName: input.operationName,
          method: input.method,
          path: input.path,
          result: {
            status: "simulated_success",
            message: "No real money moved. This is a demo simulation.",
          },
          mode: getCryptoApiMode(),
        };
      }

      const baseUrl = profile.baseUrl;
      const token = process.env.CRYPTO_API_TOKEN;
      const url = new URL(input.path, baseUrl);
      if (input.query) {
        for (const [k, v] of Object.entries(input.query)) {
          url.searchParams.set(k, String(v));
        }
      }

      if (input.riskLevel === "read" && token) {
        try {
          const response = await fetch(url.toString(), {
            method: input.method,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body:
              input.method !== "GET" && input.body
                ? JSON.stringify(input.body)
                : undefined,
          });
          const data = await response.json().catch(() => ({}));
          return {
            simulated: false,
            status: response.status,
            data: redactForLog(data),
            source: "sandbox",
          };
        } catch (error) {
          return {
            simulated: true,
            source: "mock",
            error: error instanceof Error ? error.message : "API call failed",
            note: "Falling back to mock response in demo mode.",
          };
        }
      }

      return {
        simulated: true,
        source: "mock",
        operationName: input.operationName,
        note: "Sandbox API not configured. Returning mock response.",
      };
    };

    if (idempotencyKey && input.riskLevel !== "read") {
      return auditToolCall(ctx, {
        toolName: "call_registered_api",
        riskLevel: input.riskLevel,
        payload: input,
        approvalId: input.approvalId,
        idempotencyKey,
        execute: () =>
          withIdempotency(
            {
              telegramUserId,
              idempotencyKey,
              actionType: "call_registered_api",
            },
            executeCall,
          ),
      });
    }

    return auditToolCall(ctx, {
      toolName: "call_registered_api",
      riskLevel: input.riskLevel,
      payload: input,
      approvalId: input.approvalId,
      execute: executeCall,
    });
  },
});
