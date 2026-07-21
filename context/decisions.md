# Decisions

This file records decisions that affect multiple areas of Jouda. Keep entries brief and link to domain files when details grow.

## Architecture Decisions

### Use Inventory as the stock source of truth

**Date:** 2026-06-26  
**Status:** Active

**Context:** JoudaApp needs fast product display, but stock reservation and invoice accounting belong to the POS/Inventory project.

**Decision:** Inventory owns stock, quotations, invoices, and collector/accounting state. JoudaApp stores a read/display copy of products and stock fields through `sync-products`.

**Consequences:**

- Never use `products.stock_quantity` in JoudaApp as the final reservation authority.
- Order submission must go through Inventory RPCs such as `create_quotation`.
- Product sync failures affect display accuracy but not the final stock authority.

### Use Supabase Auth for admin login

**Date:** 2026-06-26  
**Status:** Active

**Context:** Older migrations include `admin_pin` RPCs. The current UI uses `supabase.auth.signInWithPassword`.

**Decision:** Admin access is based on Supabase Auth. Do not add new PIN-based admin flows.

**Consequences:**

- Treat `admin_pin` migrations/functions as legacy until audited.
- Admin services assume authenticated users and current live RLS policies.
- `update-inventory` performs an additional email check for `joudafood@gmail.com`.

### Proxy browser Supabase traffic through Vercel

**Date:** 2026-07-17  
**Status:** Active

**Context:** Some customer/admin networks can load `www.joudafood.com` but block direct DNS/TCP/WebSocket traffic to `*.supabase.co`, causing product reads, order submission, images, and admin login to fail.

**Decision:** Public catalog/orders/media and the configured Supabase browser client use Vercel API routes on `www.joudafood.com`: `/api/catalog`, `/api/orders`, `/api/media`, and `/api/supabase`.

**Consequences:**

- Vercel deployments must include the source `api/` directory, not only built `dist/` assets.
- `/api/supabase` must restrict proxy targets to the configured JoudaApp Supabase host.
- Admin requests must preserve user JWTs after login; anonymous requests use only anon/publishable keys from Vercel env.
- Supabase Storage URLs returned to the browser should be rewritten to `/api/media`.

### Split Edge Functions by responsibility

**Date:** 2026-06-26  
**Status:** Active

**Context:** The project has a multi-file `telegram-bot` function plus separate operational functions.

**Decision:** Keep `telegram-bot`, `submit-order`, `sync-products`, `update-inventory`, and `analyze-product` as separate function surfaces.

**Consequences:**

- `telegram-bot` can keep internal Clean Architecture files.
- Deployment must target the correct function directory.
- `supabase/config.toml` currently documents JWT settings for `telegram-bot`, `sync-products`, and `submit-order`.

### Use Capacitor for Android native packaging

**Date:** 2026-06-26  
**Status:** Active

**Context:** Jouda needs an Android app while preserving the React/Vite frontend.

**Decision:** Build web assets with `npm run build`, sync them to Android through Capacitor, then produce Android builds in Android Studio.

**Consequences:**

- Android work should follow `npm run build` then `npx cap sync android`.
- Native-only features should use Capacitor plugins with web fallbacks where needed.
- `Scanner.tsx` uses Capacitor Camera on native and file input fallback on web.

## Process Decisions

### Keep AGENTS.md as the top-level agent reference

**Date:** 2026-06-26  
**Status:** Active

**Decision:** `AGENTS.md` remains the concise system reference. The context network stores relationships, current state, decisions, and operational memory.

**Rationale:** Agents need one fast entry point plus focused follow-up nodes, not one large document trying to contain everything.

## Revisit Queue

| Decision | Revisit When | Reason |
|---|---|---|
| Legacy `admin_pin` functions remain documented as legacy | After Inventory/JoudaApp security audit | They may be removed or superseded by stricter migrations |
| CORS fallback to `*` | Before public production hardening | `ALLOWED_ORIGIN` should be enforced consistently |
| Manual Edge Function deployment | When release cadence increases | CLI/CI deployment may reduce drift |
