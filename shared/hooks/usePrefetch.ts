/**
 * usePrefetch — Intent-based route prefetching for instant navigation.
 *
 * How it works:
 * When a user's finger/pointer touches a navigation target (onTouchStart,
 * onPointerDown, onMouseEnter on desktop), this hook fires the route's lazy
 * import() ~100-250ms *before* the click/tap event. By the time React Router
 * processes the navigation the JS chunk is already in the browser cache,
 * eliminating the visible loading spinner.
 *
 * This preserves the existing lazy() loading strategy — nothing is loaded at
 * initial page load. We only prefetch when user intent is detected.
 */

// Map of route paths to their lazy import functions (mirrors App.tsx)
const routeImportMap: Record<string, () => Promise<unknown>> = {
  '/':          () => import('../../pages/HomePage'),
  '/products':  () => import('../../pages/ProductsPageRoute'),
  '/recipes':   () => import('../../pages/RecipesPageRoute'),
  '/articles':  () => import('../../pages/ArticlesPageRoute'),
  '/about':     () => import('../../pages/AboutPageRoute'),
  '/health':    () => import('../../pages/HealthPage'),
  '/orders':    () => import('../../pages/OrdersPage'),
  '/scanner':   () => import('../../pages/ScannerPage'),
};

// Track which routes have already been prefetched to avoid duplicate fetches
const prefetchedRoutes = new Set<string>();

/**
 * Trigger a prefetch for a route's JS chunk.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function prefetchRoute(path: string): void {
  if (prefetchedRoutes.has(path)) return;
  const importFn = routeImportMap[path];
  if (!importFn) return;
  prefetchedRoutes.add(path);
  // Fire-and-forget: the browser caches the module
  importFn().catch(() => {
    // If prefetch fails (offline, etc.), remove from set so it can retry
    prefetchedRoutes.delete(path);
  });
}

/**
 * Returns event handlers to attach to a navigation element.
 * Usage:
 *   <button {...prefetchHandlers('/products')} onClick={() => navigate('/products')}>
 */
export function prefetchHandlers(path: string) {
  const handler = () => prefetchRoute(path);
  return {
    onTouchStart: handler,
    onMouseEnter: handler,
  } as const;
}
