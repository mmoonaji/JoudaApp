import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('public routes render without waiting for maintenance or auth checks', () => {
  const app = source('App.tsx');

  assert.doesNotMatch(app, /if\s*\(\s*checkingMaintenance\s*\|\|\s*checkingAuth\s*\)/);
  assert.match(app, /const isAdminRoute = location\.pathname\.startsWith\('\/admin'\)/);
  assert.match(app, /if\s*\(\s*isAdminRoute\s*&&\s*checkingAuth\s*\)/);
});

test('public settings reuse cached data and one in-flight request', () => {
  const service = source('services/supabaseService.ts');
  const app = source('App.tsx');

  assert.match(service, /let publicSettingsRequest:/);
  assert.match(service, /let cachedPublicSettings:/);
  assert.match(service, /export const refreshPublicSettingsFromSupabase/);
  assert.match(app, /refreshPublicSettingsFromSupabase/);
});

test('cart and map modules load only after their features are requested', () => {
  const layout = source('components/layout/Layout.tsx');
  const cartDrawer = source('components/cart/CartDrawer.tsx');

  assert.doesNotMatch(layout, /import \{ CartDrawer \} from '\.\.\/cart\/CartDrawer'/);
  assert.match(layout, /lazy\(\(\) => import\('\.\.\/cart\/CartDrawer'\)/);
  assert.match(layout, /hasOpenedCart/);
  assert.match(layout, /isCartOpen/);

  assert.doesNotMatch(cartDrawer, /import \{ MapLocationPicker \} from '\.\/MapLocationPicker'/);
  assert.match(cartDrawer, /lazy\(\(\) => import\('\.\/MapLocationPicker'\)/);
});

test('homepage sections use compact preview queries and lazy detail modules', () => {
  const service = source('services/supabaseService.ts');
  const packages = source('components/home/HomePackagesCarousel.tsx');
  const recipes = source('components/blog/TrendingRecipes.tsx');
  const articles = source('pages/KnowledgeHub.tsx');

  assert.match(service, /export const fetchFeaturedPackagesFromSupabase/);
  assert.match(service, /export const fetchRecipePreviewsFromSupabase/);
  assert.match(service, /export const fetchArticlePreviewsFromSupabase/);
  assert.match(service, /export const fetchArticleFromSupabase/);
  assert.match(service, /RECIPE_PREVIEW_COLUMNS/);
  assert.match(service, /ARTICLE_PREVIEW_COLUMNS/);

  assert.match(packages, /fetchFeaturedPackagesFromSupabase/);
  assert.doesNotMatch(packages, /fetchProductsFromSupabase/);
  assert.match(recipes, /fetchRecipePreviewsFromSupabase/);
  assert.match(articles, /fetchArticlePreviewsFromSupabase/);
  assert.match(articles, /lazy\(\(\) => import\('\.\.\/components\/modals\/ArticleModal'\)/);
});

test('featured package previews retain component prices for discount calculation', () => {
  const service = source('services/supabaseService.ts');
  const productUtils = source('components/products/utils.ts');

  assert.match(service, /PRODUCT_COMPONENT_COLUMNS\s*=\s*'[^']*price[^']*'/);
  assert.match(service, /price:\s*component\?\.price/);
  assert.match(service, /\.in\('barcode', componentBarcodes\)\s*\.eq\('is_active', true\)/);
  assert.match(productUtils, /compProduct\?\.price\s*\?\?\s*item\.price/);
});

test('service worker avoids non-critical startup work', () => {
  const vite = source('vite.config.ts');

  assert.doesNotMatch(vite, /globPatterns:\s*\['\*\*\/\*\.\{js,css,html,ico,png,svg,json\}'\]/);
  assert.match(vite, /entryFileNames:\s*'assets\/app-\[hash\]\.js'/);
  assert.match(vite, /assets\/app-\*\.js/);
  assert.doesNotMatch(vite, /'manifest\.webmanifest',/);
  assert.doesNotMatch(vite, /'pwa-\*\.png',/);
  assert.match(vite, /assets\/HomePage-\*\.js/);
});

test('Sentry and Clarity are absent while Vercel Analytics remains mounted', () => {
  const packageManifest = source('package.json');
  const packageLock = source('package-lock.json');
  const entry = source('index.tsx');
  const app = source('App.tsx');
  const errorBoundary = source('components/layout/ErrorBoundary.tsx');

  for (const fileContents of [packageManifest, packageLock, entry, app, errorBoundary]) {
    assert.doesNotMatch(fileContents, /@sentry\/react|@microsoft\/clarity|Sentry|Clarity/);
  }

  assert.doesNotMatch(entry, /scheduleMonitoringInitialization/);
  assert.doesNotMatch(app, /setMonitoringUser/);
  assert.doesNotMatch(errorBoundary, /captureMonitoringException/);
  assert.match(packageManifest, /"@vercel\/analytics"/);
  assert.match(entry, /<Analytics \/>/);
});
