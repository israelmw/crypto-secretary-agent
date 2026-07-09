import { telegramChannel } from "eve/channels/telegram";
import {
  handleTelegramCommand,
  checkInboundSecrets,
} from "@/lib/telegram/commands";
import { approveAndSimulateIfTransfer } from "@/lib/telegram/simulateTransfer";
import { resolveApprovalRequest } from "@/lib/repositories/approvals";

const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace("@", "");

export default telegramChannel({
  botUsername,
  credentials: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookSecretToken: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
  },
  uploadPolicy: {
    allowedMediaTypes: ["application/json", "application/yaml", "text/*", "application/pdf"],
    maxBytes: 10 * 1024 * 1024,
  },
  onMessage: async (ctx, message) => {
    const text = message.text ?? message.caption ?? "";

    const secretCheck = checkInboundSecrets(text);
    if (secretCheck.blocked) {
      await ctx.telegram.sendMessage(secretCheck.message);
      return null;
    }

    if (text.startsWith("/")) {
      const handled = await handleTelegramCommand(ctx, message, text);
      if (handled) return null;
    }

    const userId = String(message.from?.id ?? "unknown");
    return {
      auth: {
        authenticator: "telegram",
        principalType: "user",
        principalId: userId,
        attributes: {
          telegramUserId: userId,
          ...(message.from?.username ? { username: message.from.username } : {}),
          ...(message.from?.firstName ? { firstName: message.from.firstName } : {}),
          ...(message.from?.lastName ? { lastName: message.from.lastName } : {}),
        },
      },
    };
  },
  onCallbackQuery: async (ctx, query) => {
    const data = query.data ?? "";
    if (data.startsWith("approve:")) {
      const approvalId = data.replace("approve:", "");
      const userId = String(query.from?.id ?? "unknown");
      try {
        const { approval, simulation } = await approveAndSimulateIfTransfer(
          approvalId,
          userId,
        );
        const msg = simulation
          ? `Approved & simulated: ${simulation.message}`
          : `Approved: ${approval.summary}`;
        await ctx.telegram.answerCallbackQuery({
          callbackQueryId: query.id,
          text: msg.slice(0, 200),
        });
      } catch (error) {
        await ctx.telegram.answerCallbackQuery({
          callbackQueryId: query.id,
          text: error instanceof Error ? error.message : "Failed",
          showAlert: true,
        });
      }
      return;
    }
    if (data.startsWith("reject:")) {
      const approvalId = data.replace("reject:", "");
      const userId = String(query.from?.id ?? "unknown");
      try {
        await resolveApprovalRequest(approvalId, userId, "rejected");
        await ctx.telegram.answerCallbackQuery({
          callbackQueryId: query.id,
          text: "Rejected.",
        });
      } catch (error) {
        await ctx.telegram.answerCallbackQuery({
          callbackQueryId: query.id,
          text: error instanceof Error ? error.message : "Failed",
          showAlert: true,
        });
      }
    }
  },
});
