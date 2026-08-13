# Startup Performance Repair Design

Date: 2026-08-13

## Goal

Make Jouda's public customer routes render without waiting for Supabase maintenance settings or an admin session check. Reduce avoidable startup requests and defer customer features that are not needed for the first screen.

## Confirmed Policy

Public routes use a fail-open startup policy:

- Render the customer interface immediately.
- Fetch maintenance settings in the background.
- Replace the customer interface with the maintenance screen if the fetched setting enables maintenance mode.
- Keep authentication enforcement strict for `/admin` routes.

This policy accepts a brief customer-interface display before a newly enabled maintenance flag arrives. It avoids trapping customers behind a spinner when Supabase is slow or unreachable.

## Scope

### Phase 1: Critical startup path

1. Remove the public-route dependency on `checkingMaintenance` and `checkingAuth`.
2. Keep admin and password-recovery routes gated by the completed auth session check.
3. Fetch public settings through one shared in-flight request/cache so startup and checkout consumers do not issue duplicate requests.
4. Preserve the existing 60-second maintenance refresh and visibility refresh without creating overlapping requests.
5. Lazy-load the cart drawer so its checkout hook and map dependencies are absent until the cart is opened.
6. Lazy-load the map picker only when the customer requests the map step.

### Phase 2: Homepage payload

1. Replace broad homepage reads with narrowly selected columns.
2. Request only featured packages, recipe previews, and article previews needed by the homepage.
3. Run independent product/package mapping reads in parallel where both are required.
4. Keep full records available on their dedicated pages and detail views.

### Phase 3: Background loading

1. Limit PWA precaching to the application shell and critical startup assets.
2. Use runtime caching for route chunks instead of downloading admin, map, and animation chunks during installation.
3. Keep non-critical monitoring out of the initial customer render; Sentry and Clarity were subsequently removed by the approved 2026-08-13 monitoring-removal decision.

## Architecture

### Public settings access

`services/supabaseService.ts` remains the single public settings data source. It will deduplicate concurrent calls and keep the last successful value in memory. Failed requests retain the current caller contract: callers receive no settings and continue with safe defaults.

The maintenance owner in `App.tsx` continues polling every 60 seconds. Checkout reads the same shared source but should not trigger a second concurrent network request.

### Route gating

Customer routes render independently of remote state. Admin routes wait for `supabase.auth.getSession()` before allowing or redirecting access. Password recovery handling remains higher priority than normal admin routing.

### Deferred cart and map

`Layout` loads the cart drawer with `React.lazy` on the first cart open, then keeps it mounted for the rest of the session. Keeping it mounted preserves checkout and success-modal state after the drawer closes. The map picker is a separate lazy boundary activated by the map action.

## Data Flow

```text
Application mount
├─ customer route → render shell and route immediately
│  └─ background settings request → maintenance enabled? show maintenance screen
└─ admin route → resolve auth session → allow dashboard or redirect to login

Cart opened
└─ load cart drawer → reuse shared settings request/cache
   └─ map requested → load map dependencies
```

## Error Handling

- A failed or slow maintenance request must not block customer routes.
- A failed admin session check must not grant admin access; the existing unauthenticated redirect remains the safe outcome.
- Failed checkout settings use the existing coordinate and price defaults.
- Maintenance refreshes must not stack when a prior refresh is still pending.
- Lazy chunk failures remain handled by the existing application error boundary.

## Testing Strategy

The repository's existing Node source tests will be extended before production changes.

Required regression coverage:

1. Public rendering is not gated by `checkingMaintenance` or `checkingAuth`.
2. Admin routes still gate on `checkingAuth`.
3. Concurrent public-settings consumers share one network request.
4. The cart drawer module is not loaded before the cart is opened for the first time.
5. The map picker is dynamically imported rather than part of the initial cart module.
6. A production browser measurement confirms the customer dashboard appears before a deliberately delayed maintenance response.

Verification commands:

- Targeted Node tests for each red-green cycle.
- `npm run lint`.
- `npm run build`.
- Playwright CLI against the production preview with delayed Supabase settings.

## Success Criteria

- The customer dashboard becomes visible without waiting for the maintenance request.
- Delaying the maintenance response by five seconds does not delay the first customer render by five seconds.
- Initial startup issues no duplicate public-settings requests.
- Leaflet and `react-leaflet` are not preloaded on the homepage before the map is requested.
- Existing admin authentication, maintenance polling, checkout defaults, and Android behavior remain intact.

## Non-Goals

- Changing Supabase RLS, authentication policy, or Inventory workflows.
- Replacing direct Supabase browser access.
- Redesigning customer or admin interfaces.
- Changing checkout pricing or delivery calculations.
- Introducing a new state-management or data-fetching framework.

## Rollout

Implement and verify each phase independently. Phase 1 ships first because it addresses the measured startup blocker. Phase 2 and Phase 3 follow only after the Phase 1 browser measurement and regression suite pass.
