import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('buildProductShareUrl constructs canonical deep link URL', async () => {
  const { buildProductShareUrl } = await import('../utils/shareUtils.ts');

  const customOrigin = 'https://joudafood.com';
  const url1 = buildProductShareUrl('prod-12345', customOrigin);
  assert.equal(url1, 'https://joudafood.com/products?id=prod-12345');

  // Spaces and special characters in ID are safely encoded
  const url2 = buildProductShareUrl('PKG 100 & 20', customOrigin);
  assert.equal(url2, 'https://joudafood.com/products?id=PKG%20100%20%26%2020');
});

test('formatProductShareText generates clean copywriting without markdown tables', async () => {
  const { formatProductShareText, cleanShareText } = await import('../utils/shareUtils.ts');

  const shareText = formatProductShareText('بسكويت الشوفان بالبرتقال', 'https://joudafood.com/products?id=123');
  assert.match(shareText, /بسكويت الشوفان بالبرتقال/);
  assert.match(shareText, /https:\/\/joudafood\.com\/products\?id=123/);

  // Markdown tables and markup are cleaned
  const rawWithTable = `
    # عنوان كبير
    | الميزة | الفائدة |
    | --- | --- |
    | تفاصيل تقنية | جدول |
    **منتج خالي من الجلوتين**
  `;
  const cleaned = cleanShareText(rawWithTable);
  assert.doesNotMatch(cleaned, /\|/);
  assert.doesNotMatch(cleaned, /#/);
  assert.doesNotMatch(cleaned, /\*\*/);
  assert.match(cleaned, /منتج خالي من الجلوتين/);
});

test('ProductDetailsModal integrates shareUtils and transient feedback state', () => {
  const code = source('components/modals/ProductDetailsModal.tsx');

  assert.match(code, /buildProductShareUrl/);
  assert.match(code, /formatProductShareIntro/);
  assert.match(code, /executeProductShare/);
  assert.match(code, /copied/);
  assert.match(code, /setCopied/);
  assert.match(code, /تم نسخ الرابط/);
});

test('formatProductShareIntro does not contain URL to prevent double links', async () => {
  const { formatProductShareIntro } = await import('../utils/shareUtils.ts');
  const intro = formatProductShareIntro('كوكيز سادة');
  assert.match(intro, /كوكيز سادة/);
  assert.doesNotMatch(intro, /http/);
});

test('ProductsPage resolves product deep links and synchronizes URL on close', () => {
  const code = source('pages/ProductsPage.tsx');

  assert.match(code, /useSearchParams/);
  assert.match(code, /requestedProductId/);
  assert.match(code, /setSelectedProductDetails/);
  assert.match(code, /handleCloseProductDetails/);
  assert.match(code, /delete\('id'\)/);
  assert.match(code, /delete\('product'\)/);
});
