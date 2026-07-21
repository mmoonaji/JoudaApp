# Edge Functions Domain

## Function Map

| Function | Path | Main Responsibility |
|---|---|---|
| Vercel `/api/catalog` | `api/catalog.ts` | Server-side proxy for public data reads |
| Vercel `/api/media` | `api/media.ts` | Server-side proxy for Supabase Storage media |
| Vercel `/api/orders` | `api/orders.ts` | Server-side proxy from checkout to `submit-order` |
| Vercel `/api/supabase` | `api/supabase.ts` | Server-side proxy for browser Supabase Auth/REST/RPC/Storage requests |
| Vercel `/api/health` | `api/health.ts` | Deployment/env diagnostic endpoint without secret values |
| `telegram-bot` | `supabase/functions/telegram-bot/` | Telegram commands/callbacks and Inventory webhooks |
| `submit-order` | `supabase/functions/submit-order/index.ts` | Create Inventory quotation and JoudaApp order |
| `sync-products` | `supabase/functions/sync-products/index.ts` | Sync Inventory products to JoudaApp |
| `update-inventory` | `supabase/functions/update-inventory/index.ts` | Admin-gated updates to Inventory product fields |
| `analyze-product` | `supabase/functions/analyze-product/index.ts` | AI product analysis using Gemini |

## Authentication

- `telegram-bot`: `verify_jwt=false`; Telegram updates pass without JWT. Non-Telegram webhook/cron requests require `x-webhook-secret`.
- Vercel `/api/catalog` and `/api/media`: proxy only public reads; they should use anon access and never expose service role.
- Vercel `/api/supabase`: proxies only the configured JoudaApp Supabase host. It uses the server-side anon key for anonymous calls, preserves non-anon user JWTs for admin requests, rewrites Supabase Storage URLs in REST JSON to `/api/media`, and must never accept arbitrary external hosts.
- `submit-order`: `verify_jwt=true` in `supabase/config.toml`.
- Vercel `/api/orders`: uses `SUPABASE_ANON_KEY` server-side to call `submit-order`; do not configure service role in Vercel for this route.
- `sync-products`: `verify_jwt=false`; checks `WEBHOOK_SECRET`.
- `update-inventory`: validates the Authorization JWT in code and allows `joudafood@gmail.com`; it is not listed in the current `supabase/config.toml`, so verify its deployment JWT setting in Supabase Dashboard before changing exposure.
- `analyze-product`: reads `GEMINI_API_KEY`; it is not listed in the current `supabase/config.toml`, so verify its deployment JWT setting in Supabase Dashboard before changing exposure.

## Telegram Bot Internal Files

`telegram-bot` is the only multi-file function:

- `index.ts`: routing and auth checks
- `commands.ts`: admin-only text dashboard commands (`/today`, `/queue`, `/money`)
- `wf-callbacks.ts`: app order callbacks
- `inv-callbacks.ts`: POS invoice callbacks
- `incoming.ts`: incoming Inventory invoice webhook
- `workflow.ts`: status machines and buttons
- `confirmations.ts`: sensitive action confirmations
- `config.ts`, `db.ts`, `telegram.ts`, `format.ts`: shared helpers

## Rules

- Keep callback data under 64 characters.
- Use `fmtDate()` for Telegram dates.
- Use service role only inside server-side functions.
- In app order callbacks, `reserved` means the team/courier accepted the order in Telegram. For CASH orders with an Inventory invoice, reserve now calls `assign_invoice_to_collector` through `TELEGRAM_DRIVER_MAP`; missing driver mapping blocks the button.
- CASH deposit buttons must call `settle_single_invoice` before marking the workflow deposited. Non-CASH deposits only mark workflow status and do not enter collector custody.
- Inventory invoice reversal webhooks must keep JoudaApp `customer_orders` in sync with cancelled status.
- `wf_*` button labels are order-type aware: delivery orders use delivery wording, while `shipping` orders use shipping-company wording.
- When adding env vars, update `AGENTS.md` and this file.
- Vercel functions require the full source deployment, not a `dist`-only upload. Verify `/api/health` after deploy.

## Related Context

- Inventory sync: `context/domains/inventory-sync.md`
- Security: `context/security/security-status.md`
