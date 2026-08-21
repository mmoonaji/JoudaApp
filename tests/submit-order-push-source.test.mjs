import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../supabase/functions/submit-order/index.ts', import.meta.url),
  'utf8',
);

test('submit-order dispatches an authenticated background push after saving the order', () => {
  assert.match(source, /Deno\.env\.get\(['"]PUSH_WEBHOOK_SECRET['"]\)/);
  assert.match(source, /functions\/v1\/send-order-push/);
  assert.match(source, /['"]x-push-secret['"]\s*:/);
  assert.match(source, /EdgeRuntime\.waitUntil\([\s\S]*push/i);
});

test('push delivery failure does not roll back or fail the saved order', () => {
  assert.match(source, /push notification failed/i);
  assert.match(source, /return jsonResponse\(\{[\s\S]*success:\s*rpcSuccess/);
});
