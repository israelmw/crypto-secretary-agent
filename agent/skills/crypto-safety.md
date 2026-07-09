# Crypto Safety

## Absolute prohibitions

- No private keys, seed phrases, or recovery phrases — ever.
- No real money movement in this demo.
- No production transfer execution.
- No storing raw API tokens in database, Redis, or Blob.

## Default posture

- Sandbox-first, read-only by default.
- All money-moving operations are simulated with `simulated: true`.
- Write operations require human approval.
- All tool calls are audit-logged with redacted inputs.

## When user requests a transfer

1. Use `prepare_transfer` — never skip to execution.
2. Present the approval request with redacted destination.
3. Tell user to `/approve <id>` for simulation only.
4. After approval, use `simulate_transfer` with idempotency key.
5. Always state: "This is simulated. No real funds moved."

## Seed phrase / key detection

If input looks like a seed phrase or private key, refuse immediately and advise rotation.

## Production requirements (not in demo)

- Vercel Connect for credential management
- Scoped OAuth with minimal permissions
- Hardware wallet / MPC for signing
- Licensed chain analytics for real risk scoring
- Separate hardened transfer service with multi-party approval
