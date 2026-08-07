# Edge Functions Domain

## Function Map

| Function | Path | Main Responsibility |
|---|---|---|
| `telegram-bot` | `supabase/functions/telegram-bot/` | Telegram commands/callbacks and Inventory webhooks |
| `submit-order` | `supabase/functions/submit-order/index.ts` | Create Inventory quotation and JoudaApp order, including a historical package-component snapshot per order line |
| `sync-products` | `supabase/functions/sync-products/index.ts` | Sync Inventory products to JoudaApp |
| `update-inventory` | `supabase/functions/update-inventory/index.ts` | Admin-gated updates to Inventory product fields |
| `analyze-product` | `supabase/functions/analyze-product/index.ts` | AI product analysis using Gemini |

## Authentication

- `telegram-bot`: `verify_jwt=false`; Telegram updates pass without JWT. Non-Telegram webhook/cron requests require `x-webhook-secret`.
- Browser Supabase access is direct only; there is no Vercel relay or health endpoint left in the app.
- `submit-order`: `verify_jwt=true` in `supabase/config.toml`; checkout calls it directly through `supabase.functions.invoke('submit-order')`.
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
- Resolve package components once from the server catalog in `submit-order`; save their final order quantities in `order_items.package_items_snapshot` and reuse that same snapshot for Telegram. Do not reconstruct historical package contents from current mappings.
- `wf_*` button labels are order-type aware: delivery orders use delivery wording, while `shipping` orders use shipping-company wording.
- When adding env vars, update `AGENTS.md` and this file.
- Deploy the full source tree so Supabase function and frontend source stay aligned.

## Related Context

- Inventory sync: `context/domains/inventory-sync.md`
- Security: `context/security/security-status.md`
