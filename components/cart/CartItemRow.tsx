import React from 'react';
import { AlertTriangle, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { canAddQuantity, getCartStockIssue, getLowStockLabel } from '../../utils/stockUtils';
import { AppImage } from '../ui/AppImage';

interface CartItemRowProps {
  item: any;
  cachedProducts: any[];
  bouncingItemId: string | null;
  handleIncrease: (name: string, id: string) => void;
  handleDecrease: (id: string) => void;
  handleSetQuantity: (id: string, quantity: number) => void;
  handleRemove: (id: string) => void;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({
  item,
  cachedProducts,
  bouncingItemId,
  handleIncrease,
  handleDecrease,
  handleSetQuantity,
  handleRemove
}) => {
  const matchedProduct = cachedProducts.find(p => p.barcode === item.barcode || p.name === item.name);
  const isPackage = item.barcode?.startsWith('PKG-') || matchedProduct?.category === 'عروض وبكجات';
  const bundleItems = matchedProduct?.bundle_items || [];
  
  let savings = 0;
  if (isPackage && bundleItems.length > 0) {
    const regularTotal = bundleItems.reduce((sum: number, bItem: any) => {
      const compProd = cachedProducts.find(p => p.barcode === bItem.barcode);
      const compPrice = compProd ? compProd.price : 0;
      return sum + (compPrice * bItem.quantity);
    }, 0);
    const pkgPrice = parseFloat(item.price || '0') || 0;
    if (regularTotal > pkgPrice) {
      savings = (regularTotal - pkgPrice) * item.quantity;
    }
  }

  const isBouncing = bouncingItemId === item.id;
  const stockIssue = getCartStockIssue(item, matchedProduct);
  const lowStockLabel = !stockIssue ? getLowStockLabel(matchedProduct) : null;
  const canIncrease = canAddQuantity(matchedProduct, item.quantity);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate leading-snug">{item.name}</h3>
            {isPackage && (
              <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center shrink-0 border border-rose-100 dark:border-rose-900/50">
                🎁 عرض خاص
              </span>
            )}
          </div>
          
          {isPackage && bundleItems.length > 0 && (
            <div className="pr-2.5 py-1.5 mt-1.5 mb-2 border-r-2 border-amber-200 dark:border-amber-900 space-y-1.5 bg-amber-50/10 dark:bg-amber-950/5 rounded-l-lg">
              {bundleItems.map((bItem: any, idx: number) => {
                const compProd = cachedProducts.find(p => p.barcode === bItem.barcode);
                const compImg = compProd ? compProd.image_url || compProd.image : null;
                return (
                  <div key={idx} className="text-[10px] text-gray-600 dark:text-gray-300 font-bold flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-white dark:bg-gray-700 border border-gray-150 dark:border-gray-650 overflow-hidden flex items-center justify-center shrink-0">
                      <AppImage
                        src={compImg}
                        alt={bItem.product_name}
                        className="w-full h-full object-contain"
                        fallback={<ShoppingBag className="w-3 h-3 text-gray-300 dark:text-gray-500" />}
                      />
                    </div>
                    <span className="truncate">{bItem.product_name}</span>
                    <span className="font-mono text-gray-400 dark:text-gray-500 font-bold mr-auto">×{bItem.quantity * item.quantity}</span>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-black text-gray-900 dark:text-white">
              {item.price ? <>{parseFloat(item.price) * item.quantity}<span className="saudi-riyal mr-1">{"\u00ea"}</span></> : 'السعر لاحقاً'}
            </span>
            {savings > 0 && (
              <span className="text-[9px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-md border border-green-100 dark:border-green-900/30">
                وفرت {savings.toLocaleString('en-US')}<span className="saudi-riyal mr-1">{"\u00ea"}</span>! 🎉
              </span>
            )}
            {lowStockLabel && (
              <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-md border border-orange-100 dark:border-orange-900/30">
                {lowStockLabel}
              </span>
            )}
          </div>

          {stockIssue && (
            <div className="mt-2 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/80 dark:bg-red-950/20 p-2 text-[10px] font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1">
                طلبت {stockIssue.requestedQuantity}، المتاح {stockIssue.availableQuantity} فقط
              </span>
              <button
                type="button"
                onClick={() => handleSetQuantity(item.id, stockIssue.availableQuantity)}
                className="shrink-0 rounded-lg bg-white/80 dark:bg-gray-900/60 px-2 py-1 text-[9px] text-red-700 dark:text-red-200 border border-red-100 dark:border-red-900/30"
              >
                تعديل للمتاح
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mr-2 self-center shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1 rounded-xl border border-gray-100 dark:border-gray-700">
            <button 
              onClick={() => handleDecrease(item.id)}
              className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 shadow-sm active:bg-gray-100 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className={`text-sm font-bold min-w-[20px] text-center text-gray-800 dark:text-white ${isBouncing ? 'cart-qty-bounce' : ''}`}>
              {item.quantity}
            </span>
            <button 
              onClick={() => handleIncrease(item.name, item.id)}
              disabled={!canIncrease}
              className={`w-8 h-8 flex items-center justify-center rounded-lg shadow-sm transition-transform ${
                canIncrease
                  ? 'bg-brand-600 text-white active:scale-95'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              title={canIncrease ? 'زيادة الكمية' : 'وصلت للكمية المتاحة'}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={() => handleRemove(item.id)}
            className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors active:scale-95"
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
