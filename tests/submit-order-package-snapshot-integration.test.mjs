import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildStoredOrderItems,
  buildTelegramOrderItems,
  resolveOrderItems,
} from '../supabase/functions/submit-order/packageSnapshot.ts';

const submittedItems = [
  { product_barcode: 'PKG-1', product_name: 'عرض التوفير', quantity: 2, unit_price: 5_000 },
  { product_barcode: 'P3', product_name: 'صنف مستقل', quantity: 1, unit_price: 800 },
];
const packageMappings = [
  { package_barcode: 'PKG-1', product_barcode: 'P1', quantity: 2 },
  { package_barcode: 'PKG-1', product_barcode: 'P2', quantity: 1 },
];
const packageProducts = [
  { barcode: 'P1', name: 'الصنف الأول' },
  { barcode: 'P2', name: 'الصنف الثاني' },
];

test('saved order and Telegram reuse the same final package quantities', () => {
  const resolvedItems = resolveOrderItems(submittedItems, packageMappings, packageProducts);
  const storedItems = buildStoredOrderItems('order-1', resolvedItems);
  const telegramItems = buildTelegramOrderItems(resolvedItems);

  const expectedSnapshot = [
    { product_barcode: 'P1', product_name: 'الصنف الأول', quantity: 4 },
    { product_barcode: 'P2', product_name: 'الصنف الثاني', quantity: 2 },
  ];
  assert.deepEqual(storedItems[0].package_items_snapshot, expectedSnapshot);
  assert.deepEqual(telegramItems[0].sub_items, expectedSnapshot);
  assert.equal(telegramItems[0].quantity, 2);
});

test('regular order lines remain regular in storage and Telegram', () => {
  const resolvedItems = resolveOrderItems(submittedItems, packageMappings, packageProducts);
  const storedItems = buildStoredOrderItems('order-1', resolvedItems);
  const telegramItems = buildTelegramOrderItems(resolvedItems);

  assert.deepEqual(storedItems[1].package_items_snapshot, []);
  assert.equal(telegramItems[1].is_package, false);
  assert.deepEqual(telegramItems[1].sub_items, []);
});
