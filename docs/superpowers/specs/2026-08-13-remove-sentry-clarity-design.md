# Remove Sentry and Clarity

**Date:** 2026-08-13
**Status:** Approved

## Goal

Remove Sentry and Microsoft Clarity completely because the project does not currently use their telemetry. Preserve Vercel Analytics.

## Scope

- Remove `@sentry/react` and `@microsoft/clarity` from runtime dependencies and the npm lockfile.
- Remove the monitoring integration module and all imports or calls that depend on it.
- Keep the React error boundary functional with local console reporting and its existing recovery UI.
- Keep `@vercel/analytics` and the mounted `<Analytics />` component unchanged.
- Update project memory so future work does not reintroduce Sentry or Clarity accidentally.

## Runtime Behavior

Application startup will no longer schedule or download Sentry or Clarity. Authentication will not publish user identity to an external monitoring tool. Uncaught React errors will still be logged locally by `ErrorBoundary`, then shown through the existing fallback screen.

## Verification

- Add a source regression test that rejects Sentry and Clarity dependencies, imports, and initialization code while confirming Vercel Analytics remains mounted.
- Run the complete source-test suite and TypeScript checking.
- Build production and confirm the former monitoring chunk is absent.
- Sync the verified production assets to Android.

## Non-goals

- Removing Vercel Analytics.
- Replacing Sentry or Clarity with another monitoring platform.
- Changing error-boundary UI or application logging beyond removing external reporting.
