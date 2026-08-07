import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);
const MIGRATIONS = new URL('supabase/migrations/', ROOT);

function migrationSource() {
  const migration = readdirSync(MIGRATIONS)
    .find((name) => name.endsWith('_simplify_online_order_team_workflow.sql'));

  assert.ok(migration, 'simplify_online_order_team_workflow migration is missing');
  return readFileSync(new URL(migration, MIGRATIONS), 'utf8');
}

test('preparation is shared and does not assign an exclusive preparer', () => {
  const sql = migrationSource();

  assert.match(sql, /create or replace function public\.start_preparing_order/i);
  assert.match(sql, /status\s*=\s*'preparing'/i);
  assert.match(sql, /preparer_id\s*=\s*null/i);
  assert.match(sql, /create or replace function public\.mark_order_ready/i);
  assert.doesNotMatch(sql, /preparer_id\s*(?:=|<>|!=)\s*p_actor_id/i);
});

test('delivery claim and dispatch enforce one assigned staff actor', () => {
  const sql = migrationSource();

  assert.match(sql, /create or replace function public\.claim_order_for_delivery/i);
  assert.match(sql, /status\s*(?:<>|!=)\s*'ready'/i);
  assert.match(sql, /delivery_assignee_id\s*=\s*p_actor_id/i);
  assert.match(sql, /create or replace function public\.dispatch_order/i);
  assert.match(sql, /delivery_assignee_id\s+is\s+distinct\s+from\s+p_actor_id/i);
});

test('delivery waits for admin payment review without creating cash custody', () => {
  const sql = migrationSource();

  assert.match(sql, /create or replace function public\.mark_order_delivered/i);
  assert.match(sql, /payment_status\s*=\s*'payment_review_pending'/i);
  assert.match(sql, /cash_collected_by\s*=\s*null/i);
  assert.match(sql, /order_type\s*=\s*'pickup'/i);
});

test('payment classification is conditional, idempotent, and service-only', () => {
  const sql = migrationSource();

  assert.match(sql, /create or replace function public\.record_order_payment_classification/i);
  assert.match(sql, /payment_status\s+is\s+distinct\s+from\s+'payment_review_pending'/i);
  assert.match(sql, /'cash_with_employee'/i);
  assert.match(sql, /'bank_paid'/i);
  assert.match(sql, /payment_reference/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /revoke all on function public\.record_order_payment_classification[\s\S]+from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.record_order_payment_classification[\s\S]+to service_role/i);
});

