import assert from 'node:assert/strict';
import { test } from 'node:test';

test('api/og-product returns valid Open Graph HTML for default fallback', async () => {
  const handler = (await import('../api/og-product.ts')).default;

  const req = new Request('https://www.joudafood.com/api/og-product', {
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
  assert.match(html, /<meta name="twitter:card"/);
  assert.match(html, /window\.location\.replace/);
});

test('api/og-product escapes malicious HTML strings safely', async () => {
  const handler = (await import('../api/og-product.ts')).default;

  const req = new Request('https://www.joudafood.com/api/og-product?id=%3Cscript%3Ealert(1)%3C%2Fscript%3E', {
    headers: {
      'host': 'www.joudafood.com',
    },
  });

  const res = await handler(req);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});
