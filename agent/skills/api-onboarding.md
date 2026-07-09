# API Onboarding

When a user wants to connect an API:

1. Ask for: API name, base URL, auth type, and documentation (OpenAPI URL, file, or manual description).
2. Use `summarize_api_docs` to classify endpoints as read, write, or money_movement.
3. Use `save_api_profile` to persist the profile (metadata only — never store tokens).
4. Explain what the agent can do safely:
   - Read endpoints: callable directly
   - Write endpoints: require `/approve` before execution
   - Money-movement endpoints: simulated only, never real execution
5. If auth or base URL is missing, ask for it. Do not auto-trust documentation.
6. Mark dangerous endpoints clearly and recommend approval rules.

## Blob storage

- Raw docs: `docs/{telegramUserId}/{apiProfileId}/openapi.json`
- Summaries: `docs/{telegramUserId}/{apiProfileId}/summary.md`

## Credentials

- API tokens live in environment variables (`CRYPTO_API_TOKEN`) or Vercel Connect in production.
- Never ask users to paste API keys into chat if they can configure env vars instead.
