import { eveChannel } from "eve/channels/eve";
import { localDev } from "eve/channels/auth";

// Telegram-only deployment: HTTP session API is available on localhost during dev only.
// Production browser/API clients cannot start sessions via the web channel.
export default eveChannel({
  auth: [localDev()],
});
