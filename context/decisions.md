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

### Use direct Supabase browser access only

**Date:** 2026-07-17  
**Status:** Active

**Context:** Direct browser access to `*.supabase.co` is available again, so the app no longer needs a relay layer.

**Decision:** The browser Supabase client uses direct Supabase access only. There is no Vercel fallback path in the shipping app.

**Consequences:**

- Vercel deployments only need the static frontend source tree.
- Admin requests go directly to Supabase and must rely on live auth/RLS.
- Browser-visible storage URLs stay direct Supabase URLs.

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

### Default to direct Supabase browser access

**Date:** 2026-07-21  
**Status:** Active

**Context:** The app has been cleaned to direct-only Supabase access.

**Decision:** The browser Supabase client always uses direct mode. There is no environment toggle for a proxy fallback.

**Consequences:**

- Browser auth/REST/RPC/storage calls hit Supabase directly.
- Any future relay would require an explicit code change and redeploy.
- Phase 5 removed the dedicated checkout proxy and phase 6 removed catalog/media proxy routes after direct access proved stable.

### Read public catalog directly from Supabase

**Date:** 2026-07-21  
**Status:** Active

**Context:** Public catalog/settings reads were previously routed through `/api/catalog` as a network workaround.

**Decision:** Public products, recipes, articles, banners, FAQ, app settings, and package mappings load directly through the browser Supabase client.

**Consequences:**

- `/api/catalog` was removed in phase 6 after direct catalog reads proved stable.
- Image/media and order submission still keep their separate phases.

### Read and upload media directly from Supabase Storage

**Date:** 2026-07-21  
**Status:** Active

**Context:** Public storage assets were previously rewritten through `/api/media` and admin uploads returned proxied URLs.

**Decision:** Public media URLs remain raw Supabase Storage URLs, and admin uploads return direct `public-assets` URLs. The `/api/media` route was removed in phase 6 after direct storage URLs proved stable.

**Consequences:**

- New content no longer depends on the media proxy.
- Phase 6 removed the media proxy route after direct storage URLs proved stable.

### Submit checkout orders directly through Supabase

**Date:** 2026-07-21  
**Status:** Active

**Context:** Checkout was still routing through `/api/orders` even after direct browser Supabase access returned.

**Decision:** The frontend now calls `supabase.functions.invoke('submit-order')` directly. The dedicated `/api/orders` route was removed after validation.

**Consequences:**

- Normal order submission no longer depends on the Vercel proxy.
- `submit-order` still needs valid browser JWT handling.
- The old `/api/orders` route should not be redeployed.
