import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('public catalog reads come through the local catalog proxy', () => {
  const serviceCode = source('services/supabaseService.ts');
  const appCode = source('App.tsx');
  const checkoutCode = source('components/cart/hooks/useCheckout.ts');

  assert.match(serviceCode, /fetchCatalogSection<[^>]+>\('products'\)/);
  assert.match(serviceCode, /fetchCatalogSection<[^>]+>\('recipes'\)/);
  assert.match(serviceCode, /fetchCatalogSection<[^>]+>\('articles'\)/);
  assert.match(serviceCode, /fetchCatalogSection<[^>]+>\('faq'\)/);
  assert.doesNotMatch(serviceCode, /\.from\('products'\)/);
  assert.doesNotMatch(serviceCode, /\.from\('recipes'\)/);
  assert.doesNotMatch(serviceCode, /\.from\('articles'\)/);
  assert.doesNotMatch(serviceCode, /\.from\('faq'\)/);

  assert.match(appCode, /fetchPublicSettingsFromSupabase/);
  assert.doesNotMatch(appCode, /\.from\('app_settings_public'\)/);

  assert.match(checkoutCode, /fetchPublicSettingsFromSupabase/);
  assert.doesNotMatch(checkoutCode, /\.from\('app_settings_public'\)/);
});

test('public media URLs are rewritten to the local media proxy', () => {
  const serviceCode = source('services/supabaseService.ts');
  const bannerCode = source('components/home/PromoBanner.tsx');
  const mediaProxyCode = source('utils/mediaProxy.ts');

  assert.match(serviceCode, /rewriteSupabaseStorageUrl/);
  assert.match(mediaProxyCode, /\/api\/media\?url=/);
  assert.match(bannerCode, /fetchBannersFromSupabase/);
  assert.doesNotMatch(bannerCode, /\.from\('banners'\)/);
});
