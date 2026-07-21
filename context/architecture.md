# Architecture Map

## System Shape

```text
React/Vite Frontend
  ├─ reads public products/content directly from Supabase
  ├─ admin dashboard uses Supabase Auth directly
  ├─ loads public media directly from Supabase Storage
  ├─ submits orders directly to the submit-order Edge Function through the Supabase client
  └─ Android native shell through Capacitor

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
| Frontend catalog | JoudaApp Supabase direct | Public products/content/settings read through the browser Supabase client |
| Frontend media | JoudaApp Supabase Storage direct | Public assets load through raw Supabase Storage URLs |
| Frontend checkout | `submit-order` through Supabase client direct | Creates app order and Inventory quotation |
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
- JoudaApp stock display is not the reservation authority.
- Telegram callback data must stay under 64 characters.
- Edge Function secrets belong in Supabase Function secrets, not source files.
