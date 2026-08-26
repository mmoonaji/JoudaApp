import { Product, Recipe } from '../services/supabaseService';
import { canAddQuantity, getAvailableQuantity } from './stockUtils';

export interface RecipeCartCandidate {
  name: string;
  barcode: string;
  price?: string;
  source: 'store' | 'bakery';
  product: Product;
}

export interface RecipeSkippedItem {
  name: string;
  reason: 'out_of_stock' | 'quantity_limit' | 'not_found';
  availableQuantity?: number | null;
}

export interface RecipeAddPlan {
  addable: RecipeCartCandidate[];
  skipped: RecipeSkippedItem[];
}

type CartSnapshotItem = {
  name: string;
  barcode?: string;
  quantity: number;
};

const isBarcodeFormat = (value: string): boolean => /^[A-Za-z]?\d{3,}$/.test(value);

const findMatchingProduct = (products: Product[], value: string): Product | undefined => {
  const trimmed = value.trim();
  return (
    products.find((product) => product.barcode === trimmed || product.id === trimmed) ||
    products.find((product) => product.name.trim().toLowerCase() === trimmed.toLowerCase())
  );
};

export const getRecipeRawItems = (recipe: Recipe): string[] => {
  const rawItems: string[] = [];
  if (recipe.mainProduct) rawItems.push(recipe.mainProduct);
  if (recipe.bundleItems && recipe.bundleItems.length > 0) {
    rawItems.push(...recipe.bundleItems);
  }
  return rawItems.filter(Boolean);
};

export const loadRecipeCartCandidates = async (
  rawItems: string[],
  cachedProducts: Product[] = []
): Promise<{ candidates: RecipeCartCandidate[]; notFound: string[]; products: Product[] }> => {
  let latestProducts = cachedProducts;

  if (latestProducts.length === 0) {
    try {
      const { getCachedProducts } = await import('../services/db');
      latestProducts = await getCachedProducts();
    } catch (error) {
      console.warn('Failed to fetch recipe products', error);
    }
  }

  const uniqueProducts = new Map<string, RecipeCartCandidate>();
  const notFound: string[] = [];

  for (const item of rawItems) {
    const trimmed = item?.trim();
    if (!trimmed) continue;

    let matched = findMatchingProduct(latestProducts, trimmed);

    if (!matched) {
      try {
        const { getCachedProductByBarcode } = await import('../services/db');
        matched = await getCachedProductByBarcode(trimmed);
      } catch (error) {
        console.warn('Fallback recipe product lookup failed', error);
      }
    }

    if (!matched && !isBarcodeFormat(trimmed)) {
      matched = findMatchingProduct(latestProducts, trimmed);
    }

    if (!matched) {
      notFound.push(trimmed);
      continue;
    }

    const key = matched.barcode || matched.name;
    uniqueProducts.set(key, {
      name: matched.name,
      barcode: matched.barcode,
      price: matched.price?.toString(),
      source: matched.source || 'store',
      product: matched,
    });
  }

  return {
    candidates: Array.from(uniqueProducts.values()),
    notFound,
    products: latestProducts,
  };
};

export const planRecipeCartAdditions = (
  candidates: RecipeCartCandidate[],
  cartItems: CartSnapshotItem[],
  notFound: string[] = []
): RecipeAddPlan => {
  const plannedQuantities = new Map<string, number>();
  const addable: RecipeCartCandidate[] = [];
  const skipped: RecipeSkippedItem[] = notFound.map((name) => ({
    name,
    reason: 'not_found',
  }));

  for (const candidate of candidates) {
    const existingQuantity = cartItems.find((item) => (
      (candidate.barcode && item.barcode === candidate.barcode) ||
      item.name === candidate.name
    ))?.quantity || 0;
    const plannedKey = candidate.barcode || candidate.name;
    const plannedQuantity = plannedQuantities.get(plannedKey) || 0;
    const currentQuantity = existingQuantity + plannedQuantity;
    const availableQuantity = getAvailableQuantity(candidate.product);

    if (!canAddQuantity(candidate.product, currentQuantity)) {
      skipped.push({
        name: candidate.name,
        reason: availableQuantity === 0 ? 'out_of_stock' : 'quantity_limit',
        availableQuantity,
      });
      continue;
    }

    addable.push(candidate);
    plannedQuantities.set(plannedKey, plannedQuantity + 1);
  }

  return { addable, skipped };
};

export const formatRecipeAddSummary = (addedCount: number, skipped: RecipeSkippedItem[]): string | null => {
  if (skipped.length === 0) return null;

  const skippedLines = skipped.map((item) => {
    if (item.reason === 'not_found') return `• ${item.name}: مش متوفر في المتجر حالياً`;
    if (item.reason === 'out_of_stock') return `• ${item.name}: نفدت الكمية`;
    return `• ${item.name}: المتبقي منه (${item.availableQuantity ?? 0}) فقط`;
  });

  return [
    addedCount > 0
      ? `ضفنا لك ${addedCount} من المقادير المتوفرة بالسلة! 🎉`
      : 'للأسف ما قدرنا نضيف المقادير للسلة:',
    '',
    'الأصناف التي لم تُضف:',
    ...skippedLines,
  ].join('\n');
};
