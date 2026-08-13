import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('shared app image component handles broken images centrally', () => {
  assert.equal(existsSync(new URL('components/ui/AppImage.tsx', ROOT)), true);

  const code = source('components/ui/AppImage.tsx');
  assert.match(code, /useState/);
  assert.match(code, /onError/);
  assert.match(code, /onLoad/);
  assert.match(code, /fallback/);
});

test('cached images stay visible when the app image remounts after navigation', () => {
  const code = source('components/ui/AppImage.tsx');

  assert.match(code, /useLayoutEffect/);
  assert.match(code, /imageRef\.current/);
  assert.match(code, /image\?\.complete/);
  assert.match(code, /image\.naturalWidth\s*>\s*0/);
});

test('primary image surfaces use the shared app image component', () => {
  const productCard = source('components/products/ProductCard.tsx');
  const productDetails = source('components/modals/ProductDetailsModal.tsx');
  const promoBanner = source('components/home/PromoBanner.tsx');
  const homePackages = source('components/home/HomePackagesCarousel.tsx');
  const articlePage = source('pages/ArticlesPage.tsx');
  const recipePage = source('pages/RecipesPage.tsx');

  assert.match(productCard, /AppImage/);
  assert.match(productDetails, /AppImage/);
  assert.match(promoBanner, /AppImage/);
  assert.match(homePackages, /AppImage/);
  assert.match(articlePage, /AppImage/);
  assert.match(recipePage, /AppImage/);
});
