import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('Vercel Analytics is mounted in the React app root', () => {
  const entryCode = source('index.tsx');
  const packageJson = JSON.parse(source('package.json'));

  assert.ok(packageJson.dependencies?.['@vercel/analytics']);
  assert.match(entryCode, /import\s+\{\s*Analytics\s*\}\s+from\s+['"]@vercel\/analytics\/react['"]/);
  assert.match(entryCode, /<Analytics\s*\/>/);
});
