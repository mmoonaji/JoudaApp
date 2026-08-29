import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('buildArticleShareUrl and formatArticleShareIntro construct clean share payloads', async () => {
  const { buildArticleShareUrl, formatArticleShareIntro, formatArticleShareText } = await import('../utils/shareUtils.ts');

  const url = buildArticleShareUrl('art-12345', 'https://joudafood.com');
  assert.equal(url, 'https://joudafood.com/articles/art-12345');

  const intro = formatArticleShareIntro('أهمية الحمية الخالية من الجلوتين');
  assert.match(intro, /أهمية الحمية الخالية من الجلوتين/);
  assert.doesNotMatch(intro, /http/);

  const full = formatArticleShareText('أهمية الحمية الخالية من الجلوتين', url);
  assert.match(full, /https:\/\/joudafood\.com\/articles\/art-12345/);
});

test('api/og-article returns valid Open Graph HTML for default fallback', async () => {
  const handler = (await import('../api/og-article.ts')).default;

  const req = new Request('https://www.joudafood.com/api/og-article', {
    headers: {
      'host': 'www.joudafood.com',
      'user-agent': 'WhatsApp/2.24.1.1',
    },
  });

  const res = await handler(req);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);

  const html = await res.text();
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<meta property="og:image"/);
  assert.match(html, /<meta property="og:url"/);
  assert.match(html, /<meta property="og:type" content="article"/);
  assert.match(html, /<meta name="twitter:card"/);
  assert.match(html, /window\.location\.replace/);
});

test('ArticlePage and ArticleModal integrate shareUtils and copied feedback', () => {
  const pageCode = source('pages/ArticlePage.tsx');
  assert.match(pageCode, /buildArticleShareUrl/);
  assert.match(pageCode, /formatArticleShareIntro/);
  assert.match(pageCode, /executeShare/);
  assert.match(pageCode, /copied/);
  assert.match(pageCode, /تم نسخ الرابط/);

  const modalCode = source('components/modals/ArticleModal.tsx');
  assert.match(modalCode, /buildArticleShareUrl/);
  assert.match(modalCode, /formatArticleShareIntro/);
  assert.match(modalCode, /executeShare/);
  assert.match(modalCode, /copied/);
  assert.match(modalCode, /تم نسخ الرابط/);
});
