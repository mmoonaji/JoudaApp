import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('checkout submits orders through the local Vercel order proxy', () => {
  const checkoutService = source('services/supabaseService.ts');

  assert.match(checkoutService, /fetch\(\s*['"]\/api\/orders['"]/);
  assert.doesNotMatch(checkoutService, /functions\.invoke\(\s*['"]submit-order['"]/);
});

test('order proxy forwards submissions to the existing Supabase Edge Function server-side', () => {
  assert.equal(existsSync(new URL('api/orders.ts', ROOT)), true);

  const orderProxy = source('api/orders.ts');
  const helperCode = source('utils/supabaseProxy.ts');

  assert.match(orderProxy, /functions\/v1\/submit-order/);
  assert.match(orderProxy, /resolveSupabaseAnonKey/);
  assert.match(helperCode, /SUPABASE_ANON_KEY/);
  assert.match(helperCode, /SUPABASE_ANON/);
  assert.doesNotMatch(orderProxy, /SUPABASE_SERVICE_ROLE_KEY/);
});
