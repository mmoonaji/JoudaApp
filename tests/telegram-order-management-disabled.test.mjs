import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('new order Telegram notifications do not include management buttons', () => {
  const code = source('supabase/functions/submit-order/index.ts');

  assert.doesNotMatch(code, /wf_approve_/);
  assert.doesNotMatch(code, /wf_reject_/);
});

test('legacy app-order callbacks direct staff to the inventory system', () => {
  const code = source('supabase/functions/telegram-bot/index.ts');
  const callbackRoute = code.slice(code.indexOf("cbData.startsWith('wf_')"));

  assert.doesNotMatch(callbackRoute, /handleWfCallback/);
  assert.match(callbackRoute, /تتم إدارة الطلب من نظام المخزون/);
});
