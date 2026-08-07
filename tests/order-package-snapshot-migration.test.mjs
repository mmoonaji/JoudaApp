import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const MIGRATIONS_URL = new URL('../supabase/migrations/', import.meta.url);

function packageSnapshotMigration() {
  const migrationName = readdirSync(MIGRATIONS_URL)
    .find((name) => name.endsWith('_add_order_item_package_snapshot.sql'));

  assert.ok(migrationName, 'package snapshot migration must exist');
  return readFileSync(new URL(migrationName, MIGRATIONS_URL), 'utf8');
}

test('order items store an array-shaped historical package snapshot', () => {
  const sql = packageSnapshotMigration();

  assert.match(sql, /alter table public\.order_items[\s\S]+add column if not exists package_items_snapshot jsonb not null default '\[\]'::jsonb/i);
  assert.match(sql, /jsonb_typeof\(package_items_snapshot\)\s*=\s*'array'/i);
  assert.match(sql, /comment on column public\.order_items\.package_items_snapshot/i);
  assert.match(sql, /historical[^']+final quantity/i);
});

test('migration does not invent package contents for existing orders', () => {
  const sql = packageSnapshotMigration();

  assert.doesNotMatch(sql, /update\s+(?:public\.)?order_items/i);
  assert.doesNotMatch(sql, /insert\s+into\s+(?:public\.)?order_items/i);
});

test('migration does not widen browser access to order items', () => {
  const sql = packageSnapshotMigration();

  assert.doesNotMatch(sql, /create\s+policy/i);
  assert.doesNotMatch(sql, /grant\s+/i);
});
