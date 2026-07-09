import { resolveApprovalRequest } from "@/lib/repositories/approvals";
import { withIdempotency } from "@/lib/repositories/idempotency";
import { createAuditLog } from "@/lib/repositories/auditLogs";
import { assertMoneyMovementAllowed, getCryptoApiMode } from "@/lib/config/mode";
import { randomUUID } from "node:crypto";

export async function runSimulatedTransferAfterApproval(
  approvalId: string,
  telegramUserId: string,
) {
  assertMoneyMovementAllowed();
  const idempotencyKey = `sim-${approvalId}`;

  return withIdempotency(
    {
      telegramUserId,
      idempotencyKey,
      actionType: "simulate_transfer",
    },
    async () => {
      const mode = getCryptoApiMode();
      const result = {
        simulated: true,
        executed: false,
        approvalId,
        idempotencyKey,
        transactionId: `sim-${approvalId.slice(0, 8)}`,
        status: "simulated_success",
        mode,
        message:
          "This is simulated. No real funds moved. Production transfers require a separate hardened integration.",
      };

      await createAuditLog({
        telegramUserId,
        toolName: "simulate_transfer",
        riskLevel: "money_movement",
        input: { approvalId, idempotencyKey },
        output: result,
        approvalId,
        success: true,
      });

      return result;
    },
  );
}

export async function approveAndSimulateIfTransfer(
  approvalId: string,
  telegramUserId: string,
) {
  const approval = await resolveApprovalRequest(
    approvalId,
    telegramUserId,
    "approved",
  );

  if (approval.actionType === "simulate_transfer") {
    const simulation = await runSimulatedTransferAfterApproval(
      approvalId,
      telegramUserId,
    );
    return { approval, simulation };
  }

  return { approval, simulation: null };
}

export function generateIdempotencyKey(): string {
  return randomUUID();
}
