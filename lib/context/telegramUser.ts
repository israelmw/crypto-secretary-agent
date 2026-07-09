import type { SessionContext } from "eve/tools";

export function getTelegramUserId(ctx: SessionContext): string {
  const auth = ctx.session.auth.current ?? ctx.session.auth.initiator;
  const fromPrincipal = auth?.principalId;
  if (fromPrincipal) return fromPrincipal;

  const attrs = auth?.attributes as Record<string, unknown> | undefined;
  const fromAttrs = attrs?.telegramUserId;
  if (typeof fromAttrs === "string" && fromAttrs.length > 0) {
    return fromAttrs;
  }

  return "anonymous";
}

export function getTelegramUserAttributes(
  ctx: SessionContext,
): Record<string, unknown> {
  const auth = ctx.session.auth.current ?? ctx.session.auth.initiator;
  return (auth?.attributes as Record<string, unknown>) ?? {};
}
