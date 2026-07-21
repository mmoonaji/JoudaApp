# Frontend and Admin Domain

## Purpose

The frontend is the customer app and admin dashboard. It reads public data from JoudaApp and uses Supabase Auth for admin access.

## Key Files

| File | Role |
|---|---|
| `services/supabaseClient.ts` | Supabase browser client and phone-header client helper |
| `services/supabaseService.ts` | Public app data access and order submission |
| `api/supabase.ts` | Vercel proxy for Supabase Auth/REST/RPC/Storage calls from the browser |
| `api/media.ts` | Vercel proxy for public Supabase Storage assets |
| `pages/AdminLogin.tsx` | Supabase Auth email/password login |
| `services/admin/` | Admin writes for products, content, settings |
| `components/admin/` | Admin UI components |

## Current Facts

- Admin login uses `supabase.auth.signInWithPassword`; in production the configured client fetch routes this through `/api/supabase`.
- Password recovery links are handled in-app: `PASSWORD_RECOVERY` or `type=recovery` opens a dedicated reset-password screen that calls `supabase.auth.updateUser({ password })`.
- `/api/supabase` must preserve authenticated `Authorization` bearer tokens after login so admin RLS/RPC calls keep the user identity.
- Anonymous browser Supabase calls should use the server-side anon key inside `/api/supabase`; never rely on a service role key from browser headers.
- Frontend env vars are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Admin product changes can update JoudaApp directly, and Inventory-owned fields through `update-inventory`.
- Content managers write recipes, articles, banners, FAQ, and uploaded images.
- Image uploads use the `public-assets` storage bucket. Uploaded/public image URLs should be rewritten to `/api/media?url=...` before display so blocked clients do not load `supabase.co/storage` directly.
- Package and category features use `package_items` and `app_categories`.

## Product/Admin Fields

These fields are used by the current app/admin code and should not be treated as dead schema without checking usage:

| Field/Table | Used For |
|---|---|
| `products.app_category` | App-facing category override |
| `products.is_hidden_in_app` | Hide product from customer app |
| `products.force_out_of_stock` | Force unavailable state in app |
| `products.valid_until` | Package/offer expiry display |
| `products.tags` | UI badges |
| `package_items` | Package component mapping |
| `app_categories` | Editable app category list |
| `public-assets` | Admin image uploads |

## Risks

- Current admin services assume live RLS allows authenticated admin writes where needed.
- Checked-in migrations do not fully explain every admin field/table currently used by the code.
- Do not reintroduce `admin_pin` as the main admin model.
- Never place service role keys in frontend code.
- If admin pages show `admin_get_app_settings` 400 after login, check that `/api/supabase` did not replace the user JWT with anon.
- If admin/product images show `ERR_NAME_NOT_RESOLVED` for `supabase.co/storage`, check storage URL rewriting through `/api/media` and stale browser/PWA cache.

## Related Context

- Database/RLS: `context/domains/database-rls.md`
- Edge Functions: `context/domains/edge-functions.md`
- Decisions: `context/decisions.md`
