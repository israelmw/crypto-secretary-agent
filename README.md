# Crypto Operations Secretary

A production-quality **demo** agent built with [Vercel Eve](https://eve.dev) — a Telegram-based digital secretary for crypto software operations.

**This is a demo, not a production financial system.** It is sandbox-first, read-only by default, auditable, and explicitly unable to move real money.

## Safety model

| Rule | Behavior |
|------|----------|
| Default mode | `sandbox` / `demo` / `read_only` |
| Money movement | Simulated only, after human approval |
| Private keys / seed phrases | Rejected and never stored |
| API tokens | Environment variables only, never in DB/Redis/Blob |
| Write actions | Require approval |
| Audit | Every tool call logged with redacted inputs |
| Production transfers | Blocked with explicit error |

## Stack

- **Eve** — agent framework (tools, skills, channels, durable sessions)
- **Telegram** — sole interface (`eve/channels/telegram`)
- **Neon Postgres** + **Drizzle ORM** — durable persistence
- **Upstash Redis** — rate limits, session cache, idempotency locks
- **Vercel Blob** — API docs, OpenAPI specs, summaries, exports
- **Vercel env vars** — secrets (production: Vercel Connect)

## Project structure

```
agent/
  agent.ts              # Eve agent config
  instructions.md       # System prompt
  channels/
    telegram.ts         # Telegram webhook channel
  tools/                # 14 typed tools
  skills/               # Safety & behavior skills
db/                     # Drizzle schema + migrations
lib/                    # Storage, security, repositories
tests/                  # Security guard tests
```

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create Neon database

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string

### 3. Run Drizzle migrations

```bash
cp .env.example .env.local
# Set DATABASE_URL in .env.local

pnpm db:push
# Or apply db/migrations/0000_initial.sql manually
```

### 4. Create Upstash Redis

1. Create a database at [upstash.com](https://upstash.com)
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 5. Create Vercel Blob store

1. In Vercel dashboard → Storage → Blob
2. Copy `BLOB_READ_WRITE_TOKEN`

### 6. Create Telegram bot

1. Message [@BotFather](https://t.me/BotFather)
2. `/newbot` → save `TELEGRAM_BOT_TOKEN`
3. Set `TELEGRAM_BOT_USERNAME` (without `@`)
4. Generate a random `TELEGRAM_WEBHOOK_SECRET_TOKEN`

### 7. Fill `.env.local`

```bash
DATABASE_URL=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
BLOB_READ_WRITE_TOKEN=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET_TOKEN=...
TELEGRAM_BOT_USERNAME=...
ALLOWED_TELEGRAM_USERNAMES=admtoni,abetanex,israelmw
DEMO_MASTER_KEY=your-long-random-demo-key
CRYPTO_API_BASE_URL=https://sandbox-api.example.com
CRYPTO_API_TOKEN=sandbox-token
CRYPTO_API_MODE=sandbox
```

### 8. Run locally

```bash
pnpm dev
```

### 9. Deploy to Vercel

```bash
pnpm build
vercel deploy
```

Set all environment variables in the Vercel project settings. The build command is `pnpm build` (`eve build`).

### 10. Configure Telegram webhook

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.vercel.app/eve/v1/telegram",
       "secret_token":"'"$TELEGRAM_WEBHOOK_SECRET_TOKEN"'",
       "allowed_updates":["message","callback_query"]}'
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis token |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob token |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram bot token |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN` | Yes | Webhook verification secret |
| `TELEGRAM_BOT_USERNAME` | Yes | Bot username (no `@`) |
| `ALLOWED_TELEGRAM_USERNAMES` | Yes | Comma-separated allowed usernames |
| `DEMO_MASTER_KEY` | Yes | Demo encryption key (min 16 chars) |
| `CRYPTO_API_BASE_URL` | No | Sandbox API base URL |
| `CRYPTO_API_TOKEN` | No | Sandbox API token (env only) |
| `CRYPTO_API_MODE` | No | `sandbox` (default), `demo`, `read_only` |

## Telegram commands

| Command | Description |
|---------|-------------|
| `/start` | Introduction and safety model |
| `/help` | Capabilities overview |
| `/connect_api` | Start API onboarding |
| `/apis` | List saved API profiles |
| `/audit` | Recent audit log entries |
| `/mode` | Current operating mode |
| `/approve <id>` | Approve pending action (auto-simulates transfers) |
| `/reject <id>` | Reject pending action |
| `/memory` | Saved preferences |

## Demo script

### Demo 1: Portfolio summary

**User:** Give me a portfolio summary.

**Expected:** Mock/sandbox portfolio with assets, 24h change, and risk notes.

### Demo 2: Recent transactions

**User:** Show recent transactions and flag anything suspicious.

**Expected:** Transaction list with one flagged suspicious withdrawal.

### Demo 3: Prepare transfer

**User:** Prepare a transfer of 0.05 BTC to this wallet for vendor payment: bc1qdemoaddress123456789

**Expected:** Transfer preview with redacted destination, approval request ID, no execution.

### Demo 4: Approve and simulate

**User:** `/approve <approvalId>`

**Expected:** Simulated transfer result. "This is simulated. No real funds moved."

### Demo 5: API onboarding

**User:** Learn this API: https://example.com/openapi.json

**Expected:** API profile saved, capabilities classified, dangerous ops marked.

### Demo 6: Audit log

**User:** `/audit`

**Expected:** Recent audit entries with redacted inputs.

## Rate limits (demo)

| Action | Limit | Window |
|--------|-------|--------|
| Telegram messages | 30 | 60s |
| API calls | 20 | 60s |
| API onboarding | 5 | 5min |
| Approval attempts | 10 | 60s |
| Simulated transfers | 5 | 5min |

## Testing

```bash
pnpm test
pnpm typecheck
pnpm build
```

Security tests cover:
- Seed phrase rejection
- Private key rejection
- Production money movement blocking
- Secret redaction in logs
- Mode guards

## Known limitations

- No real blockchain interaction or transaction signing
- Risk scores are simulated, not from licensed analytics
- `DEMO_MASTER_KEY` is demo-grade encryption only
- API tokens must be configured via env vars, not per-user
- Telegram is the only interface; no web UI
- `CRYPTO_API_MODE=production` still blocks all money movement

## Before production

1. Replace `DEMO_MASTER_KEY` with **Vercel Connect** or a proper secrets manager
2. Use scoped OAuth tokens with minimal permissions
3. Integrate hardware wallets / MPC for signing
4. Build a separate hardened transfer service with multi-party approval
5. Use licensed chain analytics for real risk scoring
6. Add compliance logging, retention policies, and access controls
7. Never store private keys, seed phrases, or raw API tokens in any datastore

## License

Demo project — not for production financial use.
