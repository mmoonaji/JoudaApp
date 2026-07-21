import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('checkout submits orders directly through Supabase Edge Functions', () => {
  const checkoutService = source('services/supabaseService.ts');

  assert.match(checkoutService, /functions\.invoke\(\s*['"]submit-order['"]/);
  assert.doesNotMatch(checkoutService, /fetch\(\s*['"]\/api\/orders['"]/);
});

test('legacy checkout order proxy route is no longer shipped', () => {
  const viteConfig = source('vite.config.ts');

  assert.equal(existsSync(new URL('api/orders.ts', ROOT)), false);
  assert.equal(existsSync(new URL('api/proxy.ts', ROOT)), false);
  assert.doesNotMatch(viteConfig, /handleOrdersRequest|\/api\/orders/);
});
