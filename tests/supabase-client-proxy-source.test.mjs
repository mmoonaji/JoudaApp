import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('supabase client routes browser requests through the local supabase proxy', () => {
  const clientCode = source('services/supabaseClient.ts');

  assert.match(clientCode, /\/api\/supabase\?url=/);
  assert.match(clientCode, /global:\s*\{\s*fetch:\s*supabaseProxyFetch/);
  assert.doesNotMatch(clientCode, /service_role/);
});
