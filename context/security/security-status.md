# Security Status

## Current Security Model

- Frontend uses anon key only.
- Checkout submissions go through Vercel `/api/orders`, which uses the server-side anon key to call `submit-order`.
- Gemini analysis is routed through the `analyze-product` Edge Function; the frontend must not define or read `VITE_GEMINI_API_KEY`.
- Privileged writes happen server-side through Edge Functions or live RLS-authenticated admin paths.
- Admin login uses Supabase Auth.
- `update-inventory` validates a JWT and restricts access to `joudafood@gmail.com`.
- Non-Telegram webhook/cron calls use `WEBHOOK_SECRET`.

## Known Security Work

- Inventory RLS/API/webhook audit remains open.
- Legacy `admin_pin` functions remain in migrations and need a final decision.
- CORS falls back to `*` when `ALLOWED_ORIGIN` is not set.
- The previously exposed Gemini key must be rotated manually in Google AI Studio and replaced in Supabase Edge Function secrets.
- If any Supabase `service_role` key appears in browser logs or Vite env, rotate it immediately and replace the frontend value with anon/publishable only.
- SECURITY DEFINER functions and grants should be reviewed against live database state.

## Existing Security Documentation

Long-form audit files live in `docs/security/`:

- `docs/security/01-executive-summary.md`
- `docs/security/02-recon-static.md`
- `docs/security/03-critical-findings.md`
- `docs/security/04-high-findings.md`
- `docs/security/05-medium-low-findings.md`
- `docs/security/06-supabase-rls-audit.md`
- `docs/security/07-edge-functions-audit.md`
- `docs/security/08-remediation-checklist.md`

Use this context file as the current security index, not as a replacement for the detailed audit.

## Before Security Changes

1. Read `AGENTS.md`.
2. Read this file and `context/domains/database-rls.md`.
3. Inspect live Supabase policies/functions if available.
4. Avoid relying only on checked-in migrations.
