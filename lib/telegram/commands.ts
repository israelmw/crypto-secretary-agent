import type { TelegramContext, TelegramMessage } from "eve/channels/telegram";
import { detectSecrets, SECRET_REJECTION_MESSAGE } from "@/lib/security/seedPhraseDetection";
import { getModeLabel } from "@/lib/config/mode";
import { listApiProfilesByUser } from "@/lib/repositories/apiProfiles";
import { getRecentAuditLogs } from "@/lib/repositories/auditLogs";
import { getMemoriesByUser } from "@/lib/repositories/memories";
import { resolveApprovalRequest } from "@/lib/repositories/approvals";
import { approveAndSimulateIfTransfer } from "@/lib/telegram/simulateTransfer";
import { ensureTelegramUser } from "@/lib/repositories/telegramUsers";
import { checkRateLimit, RateLimitError } from "@/lib/security/rateLimit";

const START_MESSAGE = `Crypto Operations Secretary

I'm your sandbox-first crypto operations assistant.

Safety model:
• Read-only / sandbox by default
• Write actions require approval
• Transfers are simulated only — no real money moves
• I never accept private keys or seed phrases

Commands: /help`;

const HELP_MESSAGE = `Available commands:

/start — Introduction and safety model
/help — This message
/connect_api — Onboard a new API (OpenAPI URL, file, or description)
/apis — List saved API profiles
/audit — Recent audit log entries
/mode — Current operating mode
/approve <id> — Approve a pending action
/reject <id> — Reject a pending action
/memory — Saved preferences

Natural language works too. Examples:
• "Give me a portfolio summary"
• "Show recent transactions"
• "Prepare a transfer of 0.05 BTC to ..."`;

function parseCommand(text: string): { command: string; args: string } {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/(\w+)(?:@\w+)?(?:\s+(.*))?$/);
  if (!match) return { command: "", args: "" };
  return { command: match[1].toLowerCase(), args: (match[2] ?? "").trim() };
}

async function send(ctx: TelegramContext, message: string) {
  await ctx.telegram.sendMessage(message);
}

export async function handleTelegramCommand(
  ctx: TelegramContext,
  message: TelegramMessage,
  text: string,
): Promise<boolean> {
  const { command, args } = parseCommand(text);
  if (!command) return false;

  const userId = String(message.from?.id ?? "unknown");

  try {
    await checkRateLimit(userId, "telegram_message");
  } catch (error) {
    if (error instanceof RateLimitError) {
      await send(ctx, error.message);
      return true;
    }
    throw error;
  }

  await ensureTelegramUser({
    telegramUserId: userId,
    username: message.from?.username,
    firstName: message.from?.firstName,
    lastName: message.from?.lastName,
  });

  switch (command) {
    case "start":
      await send(ctx, START_MESSAGE);
      return true;

    case "help":
      await send(ctx, HELP_MESSAGE);
      return true;

    case "mode":
      await send(
        ctx,
        `Current mode: ${getModeLabel()}\n\nProduction money movement is disabled in this demo.`,
      );
      return true;

    case "apis": {
      const profiles = await listApiProfilesByUser(userId);
      if (profiles.length === 0) {
        await send(ctx, "No API profiles saved. Use /connect_api to onboard one.");
        return true;
      }
      const lines = profiles.map(
        (p) =>
          `• ${p.name} (${p.id.slice(0, 8)}…)\n  ${p.baseUrl} — ${p.riskLevel} risk, ${p.mode} mode`,
      );
      await send(ctx, `Saved API profiles:\n\n${lines.join("\n\n")}`);
      return true;
    }

    case "audit": {
      const logs = await getRecentAuditLogs(userId, 8);
      if (logs.length === 0) {
        await send(ctx, "No audit entries yet.");
        return true;
      }
      const lines = logs.map(
        (l) =>
          `${l.timestamp.toISOString().slice(0, 16)} | ${l.toolName} | ${l.riskLevel} | ${l.success ? "✓" : "✗"}`,
      );
      await send(ctx, `Recent audit entries:\n\n${lines.join("\n")}`);
      return true;
    }

    case "memory": {
      const memories = await getMemoriesByUser(userId);
      if (memories.length === 0) {
        await send(ctx, "No saved preferences yet.");
        return true;
      }
      const lines = memories.map((m) => `• [${m.scope}] ${m.content}`);
      await send(ctx, `Saved preferences:\n\n${lines.join("\n")}`);
      return true;
    }

    case "approve": {
      if (!args) {
        await send(ctx, "Usage: /approve <approval-id>");
        return true;
      }
      try {
        await checkRateLimit(userId, "approval_attempt");
        const { approval, simulation } = await approveAndSimulateIfTransfer(
          args,
          userId,
        );
        if (simulation) {
          await send(
            ctx,
            `Approved: ${approval.summary}\n\n` +
              `SIMULATED TRANSFER\n` +
              `Transaction: ${simulation.transactionId}\n` +
              `Status: ${simulation.status}\n\n` +
              simulation.message,
          );
        } else {
          await send(
            ctx,
            `Approved: ${approval.summary}\n\nAction type: ${approval.actionType}. No simulation required.`,
          );
        }
      } catch (error) {
        await send(
          ctx,
          error instanceof Error ? error.message : "Approval failed.",
        );
      }
      return true;
    }

    case "reject": {
      if (!args) {
        await send(ctx, "Usage: /reject <approval-id>");
        return true;
      }
      try {
        await checkRateLimit(userId, "approval_attempt");
        const approval = await resolveApprovalRequest(args, userId, "rejected");
        await send(ctx, `Rejected: ${approval.summary}`);
      } catch (error) {
        await send(
          ctx,
          error instanceof Error ? error.message : "Rejection failed.",
        );
      }
      return true;
    }

    case "connect_api":
      // Pass through to agent — return false so message is dispatched
      return false;

    default:
      return false;
  }
}

export function checkInboundSecrets(
  text: string,
): { blocked: true; message: string } | { blocked: false } {
  if (detectSecrets(text)) {
    return { blocked: true, message: SECRET_REJECTION_MESSAGE };
  }
  return { blocked: false };
}
