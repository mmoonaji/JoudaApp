import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

test('app order callbacks actively assign collectors and settle cash deposits', () => {
  const code = stripComments(source('supabase/functions/telegram-bot/wf-callbacks.ts'));

  assert.match(code, /inventory\.rpc\(\s*['"]assign_invoice_to_collector['"]/);
  assert.match(code, /inventory\.rpc\(\s*['"]settle_single_invoice['"]/);
  assert.match(code, /workflow_locked_by/);
  assert.match(code, /workflow_updated_at/);
});

test('POS invoice callbacks actively assign collectors and settle cash deposits', () => {
  const code = stripComments(source('supabase/functions/telegram-bot/inv-callbacks.ts'));

  assert.match(code, /inventory\.rpc\(\s*['"]assign_invoice_to_collector['"]/);
  assert.match(code, /inventory\.rpc\(\s*['"]settle_single_invoice['"]/);
});

test('Inventory reversal webhook is not disabled', () => {
  const code = stripComments(source('supabase/functions/telegram-bot/incoming.ts'));

  assert.doesNotMatch(code, /handleReversedInvoice\s*\([^)]*\)\s*\{\s*return\s*;/);
});

test('money report does not hide unsettled invoices that lack collector assignment', () => {
  const code = stripComments(source('supabase/functions/telegram-bot/commands.ts'));

  assert.doesNotMatch(code, /\.not\(\s*['"]collector_id['"]\s*,\s*['"]is['"]\s*,\s*null\s*\)/);
});

test('admin app-order reports exclude POS mirror orders', () => {
  const code = stripComments(source('supabase/functions/telegram-bot/commands.ts'));

  assert.match(code, /\.not\(\s*['"]order_number['"]\s*,\s*['"]like['"]\s*,\s*['"]INV-%['"]\s*\)/);
});
