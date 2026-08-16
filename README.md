# InstaFlow

InstaFlow is a Persian RTL dashboard for Instagram Business automation, webhook processing, CRM conversations, forms, products and operational monitoring.

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

## Tests and checks

- `npm run lint` checks TypeScript.
- `npm run build` builds the dashboard and local server bundle.
- `npx wrangler deploy --dry-run` validates the Cloudflare Worker bundle without deploying it.

## Webhooks

Configure Meta to call `GET /webhooks/meta` for verification and `POST /webhooks/meta` for events. The POST endpoint validates `X-Hub-Signature-256`, deduplicates events, applies the seven-day comment policy and records processing failures.

## Cloudflare deployment

Set the Cloudflare account and API token in the environment used by Wrangler, then run `npm run build` followed by `npm run deploy`. A Cloudflare account must be active and the token must have permission to deploy Workers and assets.
