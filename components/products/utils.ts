import { Product } from '../../services/supabaseService';

// Calculate total individual item prices of package and calculate saving amount/percentage
export const calculatePackageSavings = (product: Product, allProducts: Product[]) => {
  if (!product.bundle_items || product.bundle_items.length === 0) return null;
  
  let originalTotal = 0;
  let hasMissingPrice = false;
  
  for (const item of product.bundle_items) {
    const compProduct = allProducts.find(p => p.barcode === item.barcode);
    const componentPrice = compProduct?.price ?? item.price;
    if (componentPrice) {
      originalTotal += componentPrice * item.quantity;
    } else {
      hasMissingPrice = true;
    }
  }
  
  if (hasMissingPrice || originalTotal <= product.price) return null;
  
  const discountAmount = originalTotal - product.price;
  const discountPercentage = Math.round((discountAmount / originalTotal) * 100);
  
  return {
    originalTotal,
    discountAmount,
    discountPercentage
  };
};
