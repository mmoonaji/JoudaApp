import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('supabase client is direct-only and ships no Vercel Supabase proxy fallback', () => {
  const clientCode = source('services/supabaseClient.ts');
  const viteConfig = source('vite.config.ts');

  assert.equal(existsSync(new URL('api/supabase.ts', ROOT)), false);
  assert.equal(existsSync(new URL('api/health.ts', ROOT)), false);
  assert.equal(existsSync(new URL('utils/supabaseProxy.ts', ROOT)), false);
  assert.doesNotMatch(clientCode, /VITE_SUPABASE_CONNECTION_MODE/);
  assert.doesNotMatch(clientCode, /createSupabaseProxyFetch|supabaseProxyFetch|supabaseConnectionMode/);
  assert.doesNotMatch(clientCode, /proxy/);
  assert.doesNotMatch(viteConfig, /\/api\/supabase|supabaseProxy|localApiProxy|loadEnv/);
  assert.doesNotMatch(clientCode, /service_role/);
});
