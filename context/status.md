# Project Status

## Current State

Jouda is a React/Vite customer app with Supabase Edge Functions and a Capacitor Android wrapper. JoudaApp stores the customer-facing product/content data, while JoudaStockManager Inventory remains the source of truth for stock, quotations, invoices, and collector workflows.

`AGENTS.md` was refreshed on 2026-06-26 to match the current code structure and should be read before code changes.

## Active Work

- [ ] Audit Inventory security and RLS.
- [ ] Review old `admin_pin` migrations and decide whether to remove, supersede, or document as legacy only.
- [ ] Prepare first Android release for Google Play.

## Recent Changes

| Date | Change | Impact |
|---|---|---|
| 2026-06-26 | `AGENTS.md` rewritten as concise system reference | Agents have a cleaner entry point with fewer stale claims |
| 2026-06-26 | `context-network` bootstrapped | Project now has persistent context files for status, decisions, domains, processes, and security |
| 2026-06-26 | Admin/live schema caveats added to docs | Agents are warned that migrations may not fully represent live RLS/schema |
| 2026-06-26 | `products.stock_quantity` and `is_stock_tracked` documented as display/sync fields | Prevents treating JoudaApp stock as source of truth |
| 2026-06-26 | `update-inventory` documented as admin JWT-gated bridge to Inventory | Clarifies how "always available" changes propagate |
| 2026-06-27 | Folder structure guidelines added | New frontend files now have documented placement rules before larger refactors |
| 2026-06-27 | Cart root components moved under `components/cart/` | First small structure refactor completed and verified with `npm run build` |
| 2026-06-27 | `MapLocationPicker` moved under `components/cart/` | `components/` root is now free of standalone cart/checkout components |
| 2026-06-27 | `useCheckout` moved under `components/cart/hooks/` | Checkout state and submission logic now lives with the cart feature and builds successfully |
| 2026-06-27 | Telegram app-order workflow labels made order-type aware | Delivery and province-shipping orders now show different operational wording without enabling Inventory driver assignment |
| 2026-06-27 | Gemini frontend exposure paths removed | Frontend no longer declares `VITE_GEMINI_API_KEY`; Gemini stays behind the `analyze-product` Edge Function |
| 2026-06-27 | Telegram customer location moved into message text | Google Maps location now appears as an inline HTML link under the address instead of a separate workflow button |
| 2026-06-27 | Telegram app orders can be prepared before pickup | `confirmed` orders show both pickup and prepare actions; `preparing` can still record pickup later without changing status |
| 2026-06-27 | Checkout location confirmation hardened | Sana'a delivery now requires an explicit confirmed map/GPS/search selection and rejects locations too close to the store in both frontend and `submit-order` |
| 2026-06-27 | Telegram text commands reset for admin dashboard use | Legacy `/orders`, `/status`, `/cash`, `/mycash`, and `/chatid` were removed in favor of admin-only `/today`, `/queue`, and `/money` |
| 2026-06-28 | Orders page cards simplified | Customer order cards now show a lighter status summary while detailed address/items/actions stay in the details sheet |
| 2026-06-28 | Google review testimonials expanded on Jouda page | `JoudaPage` now hardcodes the written Google reviews from the provided extract until reviews move to Supabase |
| 2026-06-29 | Inventory quotation item verification added | `submit-order` now compares requested `p_items` with Inventory `invoice_items` and voids mismatched quotations to prevent accepted app orders with missing invoice lines |
| 2026-06-30 | Product availability labels clarified | Admin product labels now distinguish Inventory active state, app hiding, and stock tracking to reduce confusion around always-available products |
| 2026-06-30 | Checkout location search moved to TomTom | `MapLocationPicker` now uses TomTom Search API for Sana'a location search with Photon as fallback |
| 2026-06-30 | Checkout submit button explains missing fields | Disabled-looking order submit now remains tappable and tells customers exactly which delivery fields are incomplete |
| 2026-07-13 | Telegram cash custody workflow restored | CASH reserve buttons now assign collectors via `TELEGRAM_DRIVER_MAP`, deposit buttons call `settle_single_invoice`, Inventory reversal webhook sync is active, and `/money` surfaces unassigned/deposit-not-settled cash |
| 2026-07-16 | Checkout order proxy added | Frontend order submission now uses Vercel `/api/orders`, which forwards to `submit-order` server-side to reduce customer-side `supabase.co` blocking impact |
| 2026-07-16 | Catalog/media proxy added | Public products, settings, banners, articles, recipes, FAQ, and storage images now flow through Vercel `/api/catalog` and `/api/media` instead of browser-side Supabase reads |
| 2026-07-17 | Admin Supabase proxy added | `services/supabaseClient.ts` routes browser Supabase requests through Vercel `/api/supabase`; admin login now works on networks where `supabase.co` is blocked |
| 2026-07-17 | Vercel proxy hardening completed | `/api/supabase` preserves authenticated user JWTs for admin RLS/RPC calls, forces the server-side anon key for anonymous requests, and rewrites Supabase Storage URLs in REST JSON to `/api/media` |
| 2026-07-17 | Vercel health endpoint added | `/api/health` reports proxy runtime and required env presence without exposing secrets |
| 2026-07-21 | Admin password recovery flow added | Recovery links now open a dedicated admin password reset screen instead of landing on login with no way to set a new password |
| 2026-07-21 | Supabase client direct mode finalized | Browser Supabase now uses direct access only; the Vercel proxy path and runtime toggle were removed |
| 2026-07-21 | Catalog reads moved direct | Public products, recipes, articles, banners, FAQ, app settings, and package mappings now load through the browser Supabase client instead of `/api/catalog` |
| 2026-07-21 | Media and uploads moved direct | Public storage URLs now stay raw Supabase URLs and admin image uploads return direct `public-assets` URLs instead of `/api/media` |
| 2026-07-21 | Checkout order submission moved direct | Frontend checkout now invokes `submit-order` through the Supabase client instead of `/api/orders`; the Vercel route was removed in phase 5 |
| 2026-07-21 | Catalog/media proxy routes removed | Vercel `/api/catalog`, `/api/media`, and shared rewrite helpers were deleted after direct Supabase access proved stable |
| 2026-07-21 | Vercel Web Analytics mounted | `index.tsx` now includes `<Analytics />` from `@vercel/analytics/react` so Vercel can collect page views after deployment |
| 2026-07-21 | Shared image fallback added | Key customer/admin image surfaces now use `components/ui/AppImage.tsx` for loading state and broken-image fallback |
| 2026-07-22 | Image loading priority improved | `AppImage` now supports high-priority eager loading for first visible customer images while keeping the rest lazy with a clearer skeleton |

## Known Risks

- Migrations contain legacy `admin_pin` RPCs, while current admin UI uses Supabase Auth. Treat PIN-based admin flows as legacy until audited.
- RLS/live database state may differ from checked-in migrations. Verify live Supabase state before sensitive database changes.
- `ALLOWED_ORIGIN` controls CORS strictness; if missing, Edge Functions fall back to `*`.
- Gemini key rotation still requires a manual Google AI Studio key replacement and Supabase `GEMINI_API_KEY` secret update.
- Telegram cash custody now depends on a complete `TELEGRAM_DRIVER_MAP`; unmapped Telegram users cannot reserve CASH orders or invoices.
- Historical Telegram orders before 2026-07-13 may still have `deposited`/`deposit` workflow status without `collector_id` or `is_settled=true`; repair requires identifying the real collector before backfilling.
- Browser Supabase now connects directly to `SUPABASE_URL` plus an anon key (`SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`, or `VITE_SUPABASE_ANON`). Do not expose service role keys in the frontend.
- Direct browser access depends on `supabase.co` being reachable from the user's network; if it is blocked again, the app needs an explicit relay reintroduction.
- Browser logs for `clarity.ms`, Sentry ingest, and PWA install prompt can be blocker/UX noise; treat them separately from Jouda API failures.

## Next Steps

1. Use this context network before starting cross-domain work.
2. Keep `context/status.md` current at the start/end of substantial sessions.
3. After major changes, update both `AGENTS.md` and the affected context node.

---

Last updated: 2026-07-22 by Codex.

