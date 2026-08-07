import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPackageItemsSnapshot } from '../supabase/functions/submit-order/packageSnapshot.ts';

const packageItem = (overrides = {}) => ({
  product_barcode: 'PKG-1',
  product_name: 'عرض التوفير',
  quantity: 1,
  unit_price: 5000,
  ...overrides,
});

const mappings = [
  { package_barcode: 'PKG-1', product_barcode: 'P1', quantity: 2 },
  { package_barcode: 'PKG-1', product_barcode: 'P2', quantity: 1 },
];

const products = [
  { barcode: 'P1', name: 'الصنف الأول' },
  { barcode: 'P2', name: 'الصنف الثاني' },
];

test('regular order item has no package snapshot', () => {
  const snapshot = buildPackageItemsSnapshot(
    packageItem({ product_barcode: 'P1', product_name: 'الصنف الأول' }),
    mappings,
    products,
  );

  assert.deepEqual(snapshot, []);
});

test('package snapshot stores server product names and component quantities', () => {
  const snapshot = buildPackageItemsSnapshot(packageItem(), mappings, products);

  assert.deepEqual(snapshot, [
    { product_barcode: 'P1', product_name: 'الصنف الأول', quantity: 2 },
    { product_barcode: 'P2', product_name: 'الصنف الثاني', quantity: 1 },
  ]);
});

test('ordering several packages multiplies each component once', () => {
  const snapshot = buildPackageItemsSnapshot(packageItem({ quantity: 3 }), mappings, products);

  assert.deepEqual(snapshot.map((component) => component.quantity), [6, 3]);
});

test('package snapshot follows the stored mapping order', () => {
  const reversedMappings = [...mappings].reverse();

  const snapshot = buildPackageItemsSnapshot(packageItem(), reversedMappings, products);

  assert.deepEqual(snapshot.map((component) => component.product_barcode), ['P2', 'P1']);
});

test('package with a missing base product is rejected', () => {
  assert.throws(
    () => buildPackageItemsSnapshot(packageItem(), mappings, products.slice(0, 1)),
    /العرض غير مكتمل/,
  );
});

test('building a snapshot does not mutate order or catalog inputs', () => {
  const orderItem = packageItem({ quantity: 2 });
  const originalOrderItem = structuredClone(orderItem);
  const originalMappings = structuredClone(mappings);
  const originalProducts = structuredClone(products);

  buildPackageItemsSnapshot(orderItem, mappings, products);

  assert.deepEqual(orderItem, originalOrderItem);
  assert.deepEqual(mappings, originalMappings);
  assert.deepEqual(products, originalProducts);
});
