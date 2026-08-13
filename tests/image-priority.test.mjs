import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('shared app image supports priority loading for above-the-fold images', () => {
  const code = source('components/ui/AppImage.tsx');

  assert.match(code, /priority\?\s*:\s*boolean/);
  assert.match(code, /loading\s*=\s*\{\s*priority\s*\?\s*'eager'\s*:\s*(?:imgProps\.)?loading\s*\?\?\s*'lazy'\s*\}/);
  assert.match(code, /fetchpriority:\s*priority\s*\?\s*'high'\s*:\s*fetchPriority\s*\?\?\s*'auto'/);
  assert.doesNotMatch(code, /fetchPriority\s*=/);
  assert.match(code, /bg-gradient-to-r/);
});

test('first visible public image surfaces pass priority to the first item only', () => {
  const productsPage = source('pages/ProductsPage.tsx');
  const productCard = source('components/products/ProductCard.tsx');
  const promoBanner = source('components/home/PromoBanner.tsx');
  const homePackages = source('components/home/HomePackagesCarousel.tsx');
  const blogSection = source('components/blog/BlogSection.tsx');
  const trendingRecipes = source('components/blog/TrendingRecipes.tsx');
  const recipeOfTheDay = source('components/blog/RecipeOfTheDay.tsx');
  const articlesPage = source('pages/ArticlesPage.tsx');
  const recipesPage = source('pages/RecipesPage.tsx');

  assert.match(productCard, /priority\?\s*:\s*boolean/);
  assert.match(productsPage, /priority=\{index === 0\}/);
  assert.match(promoBanner, /priority=\{isActive\}/);
  assert.match(homePackages, /priority=\{index === 0\}/);
  assert.match(blogSection, /priority=\{index === 0\}/);
  assert.match(trendingRecipes, /priority=\{index === 0\}/);
  assert.match(recipeOfTheDay, /priority/);
  assert.match(articlesPage, /priority=\{index === 0\}/);
  assert.match(recipesPage, /priority=\{index === 0\}/);
});
