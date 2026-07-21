import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('public catalog reads come directly through the Supabase browser client', () => {
  const serviceCode = source('services/supabaseService.ts');
  const appCode = source('App.tsx');
  const checkoutCode = source('components/cart/hooks/useCheckout.ts');

  assert.doesNotMatch(serviceCode, /fetch\(\s*`?['"]?\/api\/catalog/);
  assert.match(serviceCode, /\.from\('products'\)/);
  assert.match(serviceCode, /\.from\('package_items'\)/);
  assert.match(serviceCode, /\.from\('recipes'\)/);
  assert.match(serviceCode, /\.from\('articles'\)/);
  assert.match(serviceCode, /\.from\('faq'\)/);
  assert.match(serviceCode, /\.from\('banners'\)/);
  assert.match(serviceCode, /\.from\('app_settings_public'\)/);

  assert.match(appCode, /fetchPublicSettingsFromSupabase/);
  assert.doesNotMatch(appCode, /\.from\('app_settings_public'\)/);

  assert.match(checkoutCode, /fetchPublicSettingsFromSupabase/);
  assert.doesNotMatch(checkoutCode, /\.from\('app_settings_public'\)/);
});

test('public media URLs stay direct and admin uploads return public Supabase URLs', () => {
  const serviceCode = source('services/supabaseService.ts');
  const adminContentCode = source('services/admin/AdminContentService.ts');
  const bannerCode = source('components/home/PromoBanner.tsx');
  const viteConfig = source('vite.config.ts');

  assert.doesNotMatch(serviceCode, /rewriteSupabaseStorageUrl/);
  assert.doesNotMatch(serviceCode, /\/api\/media\?url=/);
  assert.doesNotMatch(adminContentCode, /rewriteSupabaseStorageUrl/);
  assert.doesNotMatch(adminContentCode, /\/api\/media\?url=/);
  assert.match(adminContentCode, /getPublicUrl/);
  assert.match(bannerCode, /fetchBannersFromSupabase/);
  assert.doesNotMatch(bannerCode, /\.from\('banners'\)/);
  assert.doesNotMatch(viteConfig, /handleCatalogRequest|handleMediaRequest|\/api\/catalog|\/api\/media/);
  assert.equal(existsSync(new URL('api/catalog.ts', ROOT)), false);
  assert.equal(existsSync(new URL('api/media.ts', ROOT)), false);
});
