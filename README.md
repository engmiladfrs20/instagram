# InstaFlow

InstaFlow is a Persian RTL dashboard for Instagram Business automation, webhook processing, CRM conversations, forms, products, operational monitoring and workspace-isolated Gemini assistance.

## Production architecture

- Cloudflare Worker serves the dashboard and API.
- Cloudflare D1 stores the migrated workspace snapshot, users, sessions, AI settings, business knowledge and encrypted Instagram OAuth connections.
- The old KV namespace remains only as a one-time migration fallback for the original `ws_shikposhan` workspace.
- Each registered customer receives an isolated workspace, login session and automation/AI configuration. A customer connects their own Instagram account through the official OAuth button in the Accounts page.
- Meta secrets, Instagram tokens and `GEMINI_API_KEY` are Cloudflare secrets; no live credential is required in Git.

## Local development

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and fill the runtime credentials locally.
3. Run `npm install` and then `npm run dev`.
4. Open `http://localhost:3000`.

The local server persists runtime state under `.data/state.json`. This directory is ignored by Git. Set `DISABLE_PERSISTENCE=true` when a clean ephemeral run is required.

## Runtime modes

- `META_LIVE_MODE=false` (default) records outbound actions as queued, which is safe for local testing.
- `META_LIVE_MODE=true` sends text replies through the Instagram Graph API. Use this only with a valid recipient, token and Meta permissions.
- `POST /api/v1/instagram/verify` verifies the configured token and synchronizes the connected account metadata.
- `GET /api/v1/instagram/oauth/start` creates a short-lived, workspace-bound Meta OAuth state and returns the official Instagram authorization URL.
- `GET /api/v1/instagram/oauth/callback` exchanges the authorization code, encrypts the resulting long-lived token with a key derived from `META_APP_SECRET`, and stores it in D1.

## Gemini assistant

Set the Cloudflare secret `GEMINI_API_KEY`, then open the `دستیار هوشمند Gemini` tab after signing in.

1. Add business knowledge such as services, prices, delivery rules, working hours and escalation rules.
2. Write the system instruction in the same panel.
3. Save the settings and run the built-in test.
4. Enable the assistant only after the test answer is correct.

An active keyword automation always wins. Gemini is the fallback only when no automation matches and the conversation is still in automation mode. The daily request limit is enforced per workspace in D1. If there is no trusted business knowledge, the default instruction tells Gemini not to invent facts.

## Removing demo data

The owner can preview and clear the operational/demo records for the current workspace:

```text
GET  /api/v1/admin/cleanup-test-data
POST /api/v1/admin/cleanup-test-data
     {"confirm":"RESET_TEST_DATA","removeAutomations":true}
```

This clears contacts, conversations, messages, forms, submissions, products, webhook history, DLQ items and audit logs. The connected Instagram account and workspace remain intact.

## Tests and checks

- `npm run lint` checks TypeScript.
- `npm run build` builds the dashboard and local server bundle.
- `npx wrangler deploy --dry-run` validates the Cloudflare Worker bundle without deploying it.
- `npx wrangler d1 migrations apply instaflow-db --remote` applies the checked-in D1 migrations.

## Webhooks

Configure Meta to call `GET /webhooks/meta` for verification and `POST /webhooks/meta` for events. The POST endpoint validates `X-Hub-Signature-256`, deduplicates events, applies the seven-day comment policy and records processing failures.

## Cloudflare deployment

Set the Cloudflare account and API token in the environment used by Wrangler, then run `npm run build` followed by `npm run deploy`. A Cloudflare account must be active and the token must have permission to deploy Workers and assets.

For GitHub Actions, configure repository secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The workflow at `.github/workflows/deploy.yml` deploys every push to `main`/`master`; D1 migrations should be applied once from a trusted operator before or alongside the first production deployment.

For Meta Business Login, add this exact redirect URI to the Instagram app settings:

```text
https://instaflow-worker.m-farokhi2729.workers.dev/api/v1/instagram/oauth/callback
```

Do not put an Instagram or Gemini token in `.env.example`, the frontend, GitHub source, screenshots or browser URLs. If a token was ever exposed, rotate it in the provider dashboard.
