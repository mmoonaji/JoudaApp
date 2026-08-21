import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('2026-08-13 regression: homepage previews use dedicated bounded IndexedDB cache entries', () => {
  const db = source('services/db.ts');

  assert.match(db, /RECIPE_PREVIEWS_KEY\s*=\s*'recipePreviews'/);
  assert.match(db, /ARTICLE_PREVIEWS_KEY\s*=\s*'articlePreviews'/);
  assert.match(db, /export async function cacheRecipePreviews/);
  assert.match(db, /export async function getCachedRecipePreviews/);
  assert.match(db, /export async function cacheArticlePreviews/);
  assert.match(db, /export async function getCachedArticlePreviews/);
  assert.match(db, /recipes\.slice\(0,\s*7\)/);
  assert.match(db, /articles\.slice\(0,\s*5\)/);
});

test('2026-08-13 regression: preview requests persist successful responses and fall back to preview cache', () => {
  const service = source('services/supabaseService.ts');

  assert.match(service, /await cacheRecipePreviews\(recipePreviews\)/);
  assert.match(service, /await cacheArticlePreviews\(articlePreviews\)/);
  assert.match(service, /getCachedRecipePreviews\(\)/);
  assert.match(service, /getCachedArticlePreviews\(\)/);
  assert.match(service, /!navigator\.onLine\) return getCachedRecipePreviewFallback\(\)/);
  assert.match(service, /!navigator\.onLine\) return getCachedArticlePreviewFallback\(\)/);
});

test('2026-08-13 regression: homepage sections prefer cached content without overwriting fresher results', () => {
  const recipes = source('components/blog/TrendingRecipes.tsx');
  const articles = source('pages/KnowledgeHub.tsx');

  for (const component of [recipes, articles]) {
    assert.match(component, /let isActive = true/);
    assert.match(component, /let freshApplied = false/);
    assert.match(component, /const cachedRequest\s*=/);
    assert.match(component, /const freshRequest\s*=/);
    assert.match(component, /!isActive\s*\|\|\s*freshApplied/);
    assert.match(component, /freshApplied = true/);
    assert.match(component, /return \(\) => \{\s*isActive = false/);
  }

  assert.match(recipes, /getCachedRecipePreviews/);
  assert.match(articles, /getCachedArticlePreviews/);
});

test('service worker caches only public Supabase Storage images within bounded limits', () => {
  const vite = source('vite.config.ts');

  assert.match(vite, /storage\\\/v1\\\/(?:\(\?:)?object\|render\\\/image\)?\\\/public/);
  assert.match(vite, /handler:\s*'CacheFirst'/);
  assert.match(vite, /cacheName:\s*'supabase-public-images'/);
  assert.match(vite, /maxEntries:\s*80/);
  assert.match(vite, /maxAgeSeconds:\s*60 \* 60 \* 24 \* 30/);
  assert.match(vite, /statuses:\s*\[0,\s*200\]/);
  assert.doesNotMatch(vite, /rest\\\/v1/);
});

test('2026-08-13 regression: homepage dependency chunks are precached for an offline restart', () => {
  const vite = source('vite.config.ts');

  for (const chunk of [
    'HomePackagesCarousel',
    'AppImage',
    'KnowledgeHub',
    'imageCompression',
    'stockUtils',
  ]) {
    assert.ok(vite.includes(`assets/${chunk}-*.js`));
  }

  assert.ok(vite.includes('assets/index-*.js'));
});
