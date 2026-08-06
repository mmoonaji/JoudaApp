import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, ROOT), 'utf8');
}

test('offline indicator uses a temporary offline notice and compact persistent status', () => {
  const code = source('components/layout/OfflineIndicator.tsx');

  assert.match(code, /OFFLINE_NOTICE_MS/);
  assert.match(code, /setTimeout/);
  assert.match(code, /setShowOfflineNotice\(false\)/);
  assert.match(code, /بدون اتصال/);
  assert.match(code, /طلبات محفوظة/);
  assert.match(code, /تقدر تتصفح المنتجات المحفوظة/);
});

test('offline indicator explains reconnect, syncing, success, and failure states', () => {
  const code = source('components/layout/OfflineIndicator.tsx');

  assert.match(code, /رجع الاتصال/);
  assert.match(code, /جاري إرسال طلباتك المحفوظة/);
  assert.match(code, /تم إرسال الطلب/);
  assert.match(code, /ما قدرنا نرسل الطلب/);
  assert.match(code, /الطلب ما زال محفوظ/);
});

test('pending order count refreshes immediately after an offline order is saved', () => {
  const cartCode = source('contexts/CartContext.tsx');
  const syncCode = source('contexts/SyncContext.tsx');

  assert.match(cartCode, /jouda:pending-orders-changed/);
  assert.match(syncCode, /jouda:pending-orders-changed/);
  assert.match(syncCode, /addEventListener\('jouda:pending-orders-changed'/);
});
