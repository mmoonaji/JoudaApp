import React, { useRef, useEffect } from 'react';
import { Plus, Minus, ShoppingBag, Cake, Check, Heart, Sparkles, Gift, BadgeCheck } from 'lucide-react';
import { Product } from '../../services/supabaseService';
import { canAddQuantity, getLowStockLabel } from '../../utils/stockUtils';
import { AppImage } from '../ui/AppImage';

interface ProductCardProps {
  product: Product;
  viewMode: 'store' | 'bakery';
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  getItemQuantity: (name: string) => number;
  handleAddToCart: (product: Product, mode: 'store' | 'bakery') => void;
  decreaseQuantityByName: (name: string) => void;
  setSelectedProductDetails: (product: Product) => void;
  setRequestProduct: (name: string) => void;
  justAdded: string | null;
  savings: {
    originalTotal: number;
    discountAmount: number;
    discountPercentage: number;
  } | null;
  debouncedSearchQuery: string;
  priority?: boolean;
}

// Highlight matched text in search results
const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-900/40 text-gray-900 dark:text-white px-0.5 rounded">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  viewMode,
  isFavorite,
  toggleFavorite,
  getItemQuantity,
  handleAddToCart,
  decreaseQuantityByName,
  setSelectedProductDetails,
  setRequestProduct,
  justAdded,
  savings,
  debouncedSearchQuery,
  priority = false,
}) => {
  const quantity = getItemQuantity(product.name);
  const isAdded = justAdded === product.name;
  const liked = isFavorite(product.id);
  const isPackage = product.barcode.startsWith('PKG-') || product.category === 'عروض وبكجات';
  const canIncrease = canAddQuantity(product, quantity);
  const lowStockLabel = getLowStockLabel(product);

  // تحديد الشارة النشطة حسب الأولويات المطلوبة لمنع الازدحام
  const renderBadge = () => {
    if (!product.inStock) {
      return null;
    }
    if (lowStockLabel) {
      return (
        <span className="bg-orange-500/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm border border-orange-400/30">
          {lowStockLabel}
        </span>
      );
    }
    if (isPackage) {
      return (
        <span className="bg-amber-500/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-amber-400/30">
          <Gift className="w-2.5 h-2.5" /> بكج توفيري
        </span>
      );
    }
    if (product.tags?.includes('discount')) {
      return (
        <span className="bg-red-500/90 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-red-400/30">
          <Sparkles className="w-2.5 h-2.5" /> خصم
        </span>
      );
    }
    if (product.tags?.includes('best_seller')) {
      return (
        <span className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-amber-600 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-amber-200 dark:border-amber-900/50">
          <BadgeCheck className="w-2.5 h-2.5" /> الأكثر طلباً 🔥
        </span>
      );
    }
    if (product.tags?.includes('gift')) {
      return (
        <span className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-green-600 dark:text-green-400 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-green-200 dark:border-green-900/50">
          <Gift className="w-2.5 h-2.5" /> هدية
        </span>
      );
    }
    return null;
  };

  const isFirstRender = useRef(true);
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  return (
    <div 
      onClick={() => setSelectedProductDetails(product)}
      className={`bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border transition-all relative flex flex-col h-full cursor-pointer hover:shadow-xl hover:-translate-y-1 group
        ${!product.inStock 
          ? 'opacity-85 border-gray-200 dark:border-gray-700' 
          : isPackage 
            ? 'border-amber-200 dark:border-amber-800/80 bg-amber-50/5 dark:bg-amber-950/5 shadow-[0_2px_12px_rgba(245,158,11,0.03)]' 
            : 'border-gray-100 dark:border-gray-700 shadow-sm'
        }
      `}
    >
      <div className="w-full aspect-[4/3] bg-white relative overflow-hidden shrink-0">
        {/* UI Badges */}
        <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 items-end pointer-events-none">
          {renderBadge()}
        </div>
        
        <AppImage
          src={product.image}
          alt={product.name}
          decoding="async"
          priority={priority}
          containerClassName="absolute inset-0"
          className="w-full h-full object-contain relative z-10 group-hover:scale-105 transition-all duration-700"
          fallback={
            <div className="w-full h-full flex items-center justify-center">
            {viewMode === 'bakery' ? (
              <Cake className="text-pink-300 w-12 h-12" />
            ) : (
              <ShoppingBag className="text-gray-300 w-12 h-12" />
            )}
            </div>
          }
        />
        
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 backdrop-blur-[1px]">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg transform -rotate-6 border border-red-400/50">
              خلصت الكمية
            </span>
          </div>
        )}

        <div className="absolute top-2 left-2 z-10">
          <button 
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              toggleFavorite(product.id); 
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm border border-gray-100/50 dark:border-gray-700/50 transition-all active:scale-95 ${
              liked 
                ? 'bg-red-50 dark:bg-red-500/20' 
                : 'bg-white/90 dark:bg-gray-800/90 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            aria-label="إضافة إلى المفضلة"
          >
            <div className="w-[24px] h-[24px] flex items-center justify-center">
              <Heart
                className={`w-5 h-5 transition-colors duration-200 ${
                  liked
                    ? `text-red-500 fill-red-500 ${!isFirstRender.current ? 'animate-heart-pop' : ''}`
                    : 'text-gray-400'
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-xs leading-tight mb-1 line-clamp-2 h-[2.5em] overflow-hidden">
          <HighlightedText text={product.name} highlight={debouncedSearchQuery} />
        </h3>
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400 mb-0.5 truncate">{product.category}</p>
            {savings ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-brand-600 dark:text-brand-400 text-sm font-black truncate leading-tight">
                    {product.price}<span className="saudi-riyal mr-1">{"\u00ea"}</span>
                  </p>
                  <span className="text-[8px] font-black text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1 py-0.5 rounded border border-green-100 dark:border-green-900/30">
                    وفر {savings.discountPercentage}%
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 line-through leading-none mt-0.5">
                  {savings.originalTotal}<span className="saudi-riyal mr-1">{"\u00ea"}</span>
                </span>
              </div>
            ) : (
              <p className="text-brand-600 dark:text-brand-400 text-base font-black truncate">
                {product.price ? <>{product.price}<span className="saudi-riyal mr-1">{"\u00ea"}</span></> : '---'}
              </p>
            )}
          </div>
          
          {quantity > 0 ? (
            <div 
              className="flex items-center bg-gray-100 dark:bg-gray-800/80 rounded-full shrink-0 shadow-inner border border-gray-200/50 dark:border-gray-700/50" 
              role="group" 
              aria-label="التحكم بالكمية"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                onClick={() => canIncrease && handleAddToCart(product, viewMode)} 
                disabled={!canIncrease}
                className={`w-8 h-8 flex items-center justify-center rounded-r-full transition-colors ${
                  canIncrease
                    ? 'text-brand-600 hover:bg-white/50 dark:hover:bg-gray-700/50'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title={canIncrease ? 'زيادة الكمية' : 'وصلت للكمية المتاحة'}
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-xs font-black min-w-[32px] text-center text-gray-800 dark:text-white" aria-live="polite">
                {quantity} حبة
              </span>
              <button 
                type="button"
                onClick={() => decreaseQuantityByName(product.name)} 
                className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-l-full transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            !product.inStock ? (
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setRequestProduct(product.name); 
                }}
                className="h-9 px-3 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 text-[11px] font-bold shrink-0"
              >
                طلب خاص
              </button>
            ) : (
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (canIncrease) handleAddToCart(product, viewMode); 
                }}
                disabled={!canIncrease}
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 shrink-0 border ${
                  isAdded 
                    ? 'bg-green-500 text-white border-green-500 scale-110' 
                    : canIncrease
                      ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 border-gray-200 dark:border-gray-700 hover:scale-105 hover:border-brand-600 dark:hover:border-brand-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                }`}
              >
                {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
