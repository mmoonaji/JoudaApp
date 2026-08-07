export interface SnapshotOrderItem {
  product_barcode: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
}

export interface PackageMapping {
  package_barcode: string;
  product_barcode: string;
  quantity: number;
}

export interface PackageProduct {
  barcode: string;
  name: string;
}

export interface PackageItemSnapshot {
  product_barcode: string;
  product_name: string;
  quantity: number;
}

export interface ResolvedOrderItem extends SnapshotOrderItem {
  package_items_snapshot: PackageItemSnapshot[];
}

export function buildPackageItemsSnapshot(
  orderItem: SnapshotOrderItem,
  mappings: PackageMapping[],
  products: PackageProduct[],
): PackageItemSnapshot[] {
  if (!orderItem.product_barcode.startsWith('PKG-')) return [];
  const packageMappings = mappings.filter((mapping) => mapping.package_barcode === orderItem.product_barcode);
  if (packageMappings.length === 0) throw new Error(`العرض غير مكتمل: ${orderItem.product_name || orderItem.product_barcode}`);

  return packageMappings.map((mapping) => {
    const componentProduct = products.find((product) => product.barcode === mapping.product_barcode);
    if (!componentProduct) throw new Error(`العرض غير مكتمل: المنتج ${mapping.product_barcode} غير موجود`);
    return {
      product_barcode: mapping.product_barcode,
      product_name: componentProduct.name,
      quantity: mapping.quantity * orderItem.quantity,
    };
  });
}

export function resolveOrderItems(
  orderItems: SnapshotOrderItem[],
  packageMappings: PackageMapping[],
  packageProducts: PackageProduct[],
): ResolvedOrderItem[] {
  return orderItems.map((orderItem) => ({
    ...orderItem,
    package_items_snapshot: buildPackageItemsSnapshot(orderItem, packageMappings, packageProducts),
  }));
}

export function buildStoredOrderItems(orderId: string, orderItems: ResolvedOrderItem[]) {
  return orderItems.map((orderItem) => ({
    order_id: orderId,
    product_barcode: orderItem.product_barcode,
    product_name: orderItem.product_name || orderItem.product_barcode,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    total_price: orderItem.quantity * orderItem.unit_price,
    package_items_snapshot: orderItem.package_items_snapshot,
  }));
}

export function buildTelegramOrderItems(orderItems: ResolvedOrderItem[]) {
  return orderItems.map((orderItem) => ({
    product_name: orderItem.product_name,
    quantity: orderItem.quantity,
    is_package: orderItem.package_items_snapshot.length > 0,
    sub_items: orderItem.package_items_snapshot,
  }));
}
