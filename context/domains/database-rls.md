# Database and RLS Domain

## Purpose

Capture the expected database access model. Live Supabase state may differ from checked-in migrations, so verify before security-sensitive changes.

## JoudaApp Access Model

| Area | Expected Model |
|---|---|
| Public product/content reads | `anon` and `authenticated` can read active/public data |
| Customer orders | Sensitive writes through Edge Functions with service role |
| Order reads | Service role and customer phone-header policies where present |
| Package snapshots | `order_items.package_items_snapshot` is server-written JSONB; the schema change adds no grants or policies and existing rows keep the empty-array default |
| Admin dashboard | Supabase Auth session, then direct writes/RPCs depending on table |
| Settings | Sensitive settings through RPC/service role; public view exposes safe fields |
| Sync logs | Written by service role, read by admin dashboard |
| Packages/categories/storage | Used by current admin/app code; verify live RLS/storage policies before changes |

## Live Schema Drift Warning

The current code references tables/fields that are not fully described by the checked-in migrations, including `app_categories`, product admin fields such as `app_category`, `is_hidden_in_app`, `force_out_of_stock`, `valid_until`, and the `public-assets` storage bucket.

Treat migrations as useful history, not the complete production truth. Before changing admin writes, RLS policies, storage policies, or SECURITY DEFINER functions, inspect the live Supabase project.

## Legacy Admin PIN

Some migrations still define `verify_admin_pin` and `admin_*` RPCs that accept a PIN. Current UI uses Supabase Auth instead.

Until audited:

- Do not add new PIN-based flows.
- Do not assume old RPC grants are safe in production.
- Verify live policies/functions before editing admin security.

## High-Risk Change Areas

- RLS policy changes on `products`, `customer_orders`, `order_items`, content tables, and `app_settings`.
- RLS/storage policy changes on `package_items`, `app_categories`, and `public-assets`.
- Any use of service role keys.
- Public views exposing settings.
- SECURITY DEFINER functions.

## Related Context

- Security status: `context/security/security-status.md`
- Frontend/admin: `context/domains/frontend-admin.md`
- Decisions: `context/decisions.md`
