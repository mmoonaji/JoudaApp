# Architecture Map

## System Shape

```text
React/Vite Frontend
  ├─ reads public products/content through Vercel /api/catalog
  ├─ admin dashboard writes content/settings through Supabase Auth
  ├─ loads public media through Vercel /api/media
  ├─ submits orders through Vercel /api/orders
  └─ Android native shell through Capacitor

Vercel API
  ├─ forwards /api/catalog to public Supabase reads
  ├─ forwards /api/media to Supabase Storage
  └─ forwards /api/orders to submit-order with the server-side anon key

JoudaApp Supabase
  ├─ public app tables/views
  ├─ Edge Functions
  ├─ synced product cache
  └─ customer order mirror/workflow state

Inventory Supabase
  ├─ stock and product source of truth
  ├─ quotations and invoices
  ├─ warehouses and collectors
  └─ POS-originated invoice events

Telegram Bot
  ├─ receives Telegram updates
  ├─ receives Inventory database webhooks
  └─ drives app/POS order workflows through callback buttons
```

## Main Relationships

| Source | Target | Relationship |
|---|---|---|
| Inventory `products` | JoudaApp `products` | `sync-products` copies display fields and stock snapshot |
| Frontend catalog/media | Vercel `/api/catalog`, `/api/media` | Avoids direct browser reads from `supabase.co` |
| Frontend checkout | Vercel `/api/orders` | Avoids direct browser submission to `supabase.co` |
| Vercel `/api/orders` | `submit-order` | Creates app order and Inventory quotation |
| Inventory invoice insert | `telegram-bot` | Database webhook sends invoice event |
| Telegram callbacks | JoudaApp + Inventory | Workflow buttons update order/invoice state |
| Admin dashboard | JoudaApp tables | Authenticated direct writes for app-owned content |
| Admin dashboard | Inventory products | `update-inventory` updates allowed Inventory fields |

## Agent Entry Points

Before a task:

1. Read `AGENTS.md`.
2. Read `context/status.md`.
3. Read the relevant domain file in `context/domains/`.
4. Verify claims against code before editing security, RLS, or Edge Function behavior.

## Boundaries

- Frontend must not use service role keys.
- Vercel `/api/orders` uses only the anon key; service role remains inside Supabase Edge Functions.
- JoudaApp stock display is not the reservation authority.
- Telegram callback data must stay under 64 characters.
- Edge Function secrets belong in Supabase Function secrets, not source files.
