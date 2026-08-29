import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingBag, Heart, ChefHat, Clock, Share2, Check, Sparkles, BadgeCheck, Gift, Maximize2 } from 'lucide-react';
import { Product, Recipe } from '../../services/supabaseService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useScrollLock, useBackButton } from '../../hooks/index';
import { ProductRequestModal } from './ProductRequestModal';
import { ImageViewerModal } from './ImageViewerModal';
import { getCachedProducts } from '../../services/db';
import { canAddQuantity, getLowStockLabel } from '../../utils/stockUtils';
import { buildProductShareUrl, formatProductShareIntro, formatProductShareText, executeProductShare } from '../../utils/shareUtils';
import { AppImage } from '../ui/AppImage';

interface ProductDetailsModalProps {
  product: Product;
  relatedRecipes?: Recipe[];
  onClose: () => void;
  onOpenRecipe?: (recipeId: string) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ 
  product, 
  relatedRecipes = [], 
  onClose,
  onOpenRecipe
}) => {
  const { addToCart, getItemQuantity, decreaseQuantityByName, setIsCartOpen } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Handle hardware back button
  useBackButton(true, onClose);

  const [resolvedBundleItems, setResolvedBundleItems] = useState<{
    barcode: string;
    product_name: string;
    quantity: number;
    price?: number;
    image?: string;
  }[]>([]);
  const [savingsInfo, setSavingsInfo] = useState<{
    originalTotal: number;
    discountAmount: number;
    discountPercentage: number;
  } | null>(null);

  useEffect(() => {
    const resolveBundleDetails = async () => {
      if (!product.bundle_items || product.bundle_items.length === 0) {
        setResolvedBundleItems([]);
        setSavingsInfo(null);
        return;
      }
      
      try {
        const cached = await getCachedProducts();
        if (cached && cached.length > 0) {
          const resolved = product.bundle_items.map(item => {
            const comp = cached.find(p => p.barcode === item.barcode);
            return {
              barcode: item.barcode,
              product_name: comp ? comp.name : item.product_name,
              quantity: item.quantity,
              price: comp ? comp.price : undefined,
              image: comp ? comp.image_url || comp.image : undefined
            };
          });
          setResolvedBundleItems(resolved);

          // Calculate savings
          let originalTotal = 0;
          let hasMissingPrice = false;
          for (const item of resolved) {
            if (item.price) {
              originalTotal += item.price * item.quantity;
            } else {
              hasMissingPrice = true;
            }
          }
          if (!hasMissingPrice && originalTotal > product.price) {
            const discountAmount = originalTotal - product.price;
            const discountPercentage = Math.round((discountAmount / originalTotal) * 100);
            setSavingsInfo({
              originalTotal,
              discountAmount,
              discountPercentage
            });
          } else {
            setSavingsInfo(null);
          }
        }
      } catch (e) {
        console.warn('Failed to resolve bundle details in modal', e);
      }
    };

    resolveBundleDetails();
  }, [product]);

  // Lock body scroll when modal is open
  useScrollLock(true);
   
  const quantity = getItemQuantity(product.name);
  const liked = isFavorite(product.id);
  const canIncrease = canAddQuantity(product, quantity);
  const lowStockLabel = getLowStockLabel(product);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = buildProductShareUrl(product.id);
    const shareIntro = formatProductShareIntro(product.name);

    await executeProductShare({
      title: product.name,
      text: shareIntro,
      url: shareUrl,
      onCopied: () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
    });
  };

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-gray-900 w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl relative flex flex-col animate-slide-up-mobile sm:animate-scale-in border border-gray-200 dark:border-gray-800 overflow-hidden transition-transform"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Image Section */}
          <div className="relative w-full h-64 sm:h-72 bg-white shrink-0 p-6 flex items-center justify-center">
            {/* Clickable Image Area */}
            <div 
              onClick={() => {
                if (product.image) setIsImageViewerOpen(true);
              }}
              onPointerEnter={() => {
                if (product.image && typeof Image !== 'undefined') {
                  const img = new Image();
                  img.src = product.image;
                  img.decode?.().catch(() => {});
                }
              }}
              role={product.image ? "button" : undefined}
              tabIndex={product.image ? 0 : undefined}
              aria-label={product.image ? "تكبير صورة المنتج" : undefined}
              onKeyDown={(e) => {
                if (product.image && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setIsImageViewerOpen(true);
                }
              }}
              className={`absolute inset-0 p-6 flex items-center justify-center select-none group transition-colors ${
                product.image ? 'cursor-zoom-in' : ''
              }`}
            >
              <AppImage
                src={product.image}
                alt={product.name}
                priority
                containerClassName="w-full h-full"
                className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-105"
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ShoppingBag className="w-20 h-20" />
                  </div>
                }
              />

              {/* Visual Zoom Affordance Badge */}
              {product.image && (
                <div className="absolute bottom-3 left-3 z-10 opacity-80 group-hover:opacity-100 transition-opacity bg-black/45 hover:bg-black/65 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-sm border border-white/20">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>تكبير الصورة</span>
                </div>
              )}
            </div>

            {/* Top Actions Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-6 flex justify-between items-start z-20 pointer-events-none">
               <div className="pointer-events-auto">
                 <button 
                   type="button"
                   onClick={onClose}
                   className="w-10 h-10 bg-gray-100/80 backdrop-blur-md rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors shadow-sm"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>

               <div className="flex gap-2 pointer-events-auto">
                  <div className="relative">
                    <button 
                       type="button"
                       onClick={handleShare}
                       className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                         copied 
                           ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                           : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200 dark:bg-gray-800/80 dark:text-gray-200'
                       }`}
                       aria-label={copied ? "تم نسخ الرابط" : "مشاركة المنتج"}
                       title={copied ? "تم نسخ الرابط بنجاح" : "مشاركة المنتج"}
                    >
                      {copied ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-scale-in" /> : <Share2 className="w-5 h-5" />}
                    </button>
                    {copied && (
                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap animate-fade-in pointer-events-none z-50">
                        تم نسخ الرابط!
                      </span>
                    )}
                  </div>
                 <button 
                    type="button"
                    onClick={() => toggleFavorite(product.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-sm ${
                        liked ? 'bg-red-50 text-red-500' : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200'
                    }`}
                 >
                   <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                 </button>
               </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0">
             <div className="flex-1 overflow-y-auto p-6 relative bg-white dark:bg-gray-900 text-right" dir="rtl">
                <div className="mb-6">
                   {/* Badges */}
                   <div className="flex gap-4 text-xs font-bold text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">
                      <span>{product.category}</span>
                      {product.tags?.includes('discount') && <span className="text-brand-500 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5"/> عرض خاص</span>}
                      {product.tags?.includes('best_seller') && <span className="text-amber-500 flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5"/> الأكثر مبيعاً</span>}
                      {product.tags?.includes('gift') && <span className="text-green-500 flex items-center gap-1"><Gift className="w-3.5 h-3.5"/> هدايا مضمنة</span>}
                   </div>

                   {/* Title */}
                   <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight mb-2">
                      {product.name}
                   </h2>

                   {/* Price Display */}
                   <div className="flex items-baseline gap-3 mb-6">
                      <div className="text-3xl font-black text-brand-600 dark:text-brand-400 tracking-tight">
                          {product.price || '---'}<span className="saudi-riyal mr-1 text-lg text-gray-500 font-bold">{"\u00ea"}</span>
                      </div>
                      {savingsInfo && (
                        <div className="flex items-center gap-2">
                          <span className="text-base text-gray-400 line-through font-mono">
                            {savingsInfo.originalTotal}<span className="saudi-riyal mr-1">{"\u00ea"}</span>
                          </span>
                        </div>
                      )}
                      {product.inStock ? (
                         <span className="mr-auto text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
                            <Check className="w-3.5 h-3.5" /> {lowStockLabel || 'متوفر'}
                         </span>
                      ) : (
                         <span className="mr-auto text-xs font-bold text-red-500 flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full">
                            نفدت الكمية
                         </span>
                      )}
                   </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert text-gray-600 dark:text-gray-400 font-medium leading-relaxed prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-sm prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-relaxed prose-li:text-sm prose-li:text-gray-600 dark:prose-li:text-gray-400 prose-strong:font-bold prose-strong:text-gray-900 dark:prose-strong:text-white prose-a:text-brand-600 dark:prose-a:text-brand-400 hover:prose-a:underline [&_p]:leading-relaxed [&_li]:leading-relaxed [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:pl-0 [&_ol]:list-decimal [&_ol]:pr-5 [&_ol]:pl-0 [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_li]:my-0.5 [&_table]:w-full [&_table]:text-right [&_thead_th]:!text-right [&_th]:!text-right [&_td]:!text-right">
                       <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                             a: ({ node, ...props }) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 font-bold underline hover:text-brand-700" />
                             ),
                             table: ({ node, ...props }) => (
                                <div className="w-full overflow-x-auto my-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs bg-white dark:bg-gray-900/40">
                                   <table {...props} className="w-full text-right border-collapse text-xs sm:text-sm m-0" dir="rtl" />
                                </div>
                             ),
                             thead: ({ node, ...props }) => (
                                <thead {...props} className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700" />
                             ),
                             th: ({ node, style, ...props }: any) => {
                                const isCentered = style?.textAlign === 'center';
                                return (
                                   <th
                                      {...props}
                                      style={{ ...style, textAlign: isCentered ? 'center' : 'right' }}
                                      className="text-right font-bold py-3 px-3.5 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 align-middle text-xs sm:text-sm"
                                   />
                                );
                             },
                             td: ({ node, style, ...props }: any) => {
                                const isCentered = style?.textAlign === 'center';
                                return (
                                   <td
                                      {...props}
                                      style={{ ...style, textAlign: isCentered ? 'center' : 'right' }}
                                      className="text-right py-3 px-3.5 text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800/60 align-top text-xs sm:text-sm leading-relaxed"
                                   />
                                );
                             },
                          }}
                       >
                          {product.description || "لا يوجد وصف إضافي لهذا المنتج، ولكنه مضمون الجوده من متجرنا."}
                       </ReactMarkdown>
                    </div>
                </div>

                {/* Package Bundle Items Section */}
                {product.bundle_items && product.bundle_items.length > 0 && (
                  <div className="mb-6 pt-6 border-t border-gray-100 dark:border-gray-800/80">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4 text-sm">
                      <Gift className="w-4 h-4 text-brand-500" />
                      محتويات الباكج
                    </h3>
                    
                    <ul className="space-y-3 mb-6">
                      {resolvedBundleItems.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between text-sm border-b border-gray-50 dark:border-gray-800/50 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{item.quantity} × {item.product_name}</span>
                          </div>
                          {item.price && (
                              <span className="text-xs text-gray-400 font-mono shrink-0 pr-4">{item.price}<span className="saudi-riyal mr-1">{"\u00ea"}</span></span>
                          )}
                        </li>
                      ))}
                    </ul>
                    
                    {savingsInfo && (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-gray-500 dark:text-gray-400">
                            <span>قيمة المنتجات مفردة</span>
                            <span className="font-mono">
                               {savingsInfo.originalTotal}
                               <span className="saudi-riyal mr-1">{"\u00ea"}</span>
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-500 dark:text-gray-400">
                            <span>سعر الباكج</span>
                            <span className="font-mono">
                               {product.price}
                               <span className="saudi-riyal mr-1">{"\u00ea"}</span>
                            </span>
                          </div>
                          <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold">
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> وفرت في جيبك</span>
                            <span className="text-green-600 dark:text-green-400 font-mono">
                              {savingsInfo.discountAmount}<span className="saudi-riyal mr-1">{"\u00ea"}</span> (وفر {savingsInfo.discountPercentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Related Recipes Section */}
                {relatedRecipes.length > 0 && onOpenRecipe && (
                  <div className="mb-6 animate-fade-in pt-6 border-t border-gray-100 dark:border-gray-800/80">
                     <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ChefHat className="w-5 h-5 text-orange-500" />
                          وصفات يمكنك تحضيرها بهذا المنتج
                        </span>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full">
                          {relatedRecipes.length} وصفات
                        </span>
                     </h3>
                     <div className="flex flex-col gap-2.5 pb-2">
                        {relatedRecipes.map(recipe => (
                           <button 
                             key={recipe.id}
                             type="button"
                             onClick={() => onOpenRecipe(recipe.id)}
                             className="w-full bg-gray-50/80 dark:bg-gray-800/80 hover:bg-orange-50/60 dark:hover:bg-orange-950/30 border border-gray-100 dark:border-gray-700/60 hover:border-orange-200 dark:hover:border-orange-800/40 p-2.5 rounded-2xl flex items-center gap-3 text-right transition-all group active:scale-98"
                           >
                               <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 shrink-0 overflow-hidden border border-gray-100 dark:border-gray-600/50">
                                  <AppImage
                                     src={recipe.image || recipe.image_url}
                                     alt={recipe.title}
                                     loading="lazy"
                                     className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                     fallback={<div className="w-full h-full flex items-center justify-center"><ChefHat className="w-6 h-6 text-orange-300" /></div>}
                                  />
                               </div>
                              <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-xs text-gray-800 dark:text-gray-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                                   {recipe.title}
                                 </h4>
                                 <div className="flex items-center gap-2.5 text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {recipe.time && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-orange-500/70" />
                                        {recipe.time}
                                      </span>
                                    )}
                                    {recipe.difficulty && (
                                      <span className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                                        {recipe.difficulty}
                                      </span>
                                    )}
                                 </div>
                              </div>
                              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 opacity-80 group-hover:opacity-100 shrink-0">
                                عرض الطريقة ←
                              </span>
                           </button>
                        ))}
                     </div>
                  </div>
                )}
             </div>

             {/* Footer Actions */}
             <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-area-bottom mt-auto">
                <div className="flex gap-3">
                   {quantity > 0 ? (
                      <div className="flex flex-col gap-3 w-full">
                         {/* First Row: Quantity controls + View Cart */}
                         <div className="flex gap-3 items-center">
                            <div className="w-[130px] bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5 flex items-center justify-between shrink-0">
                               <button 
                                  type="button"
                                  onClick={() => decreaseQuantityByName(product.name)}
                                  className="w-9 h-9 bg-white dark:bg-gray-700 rounded-xl shadow-sm flex items-center justify-center text-lg font-bold hover:bg-gray-50 transition-colors"
                               >
                                  -
                               </button>
                               <span className="text-base font-black px-1">{quantity}</span>
                               <button 
                                  type="button"
                                  onClick={() => canIncrease && addToCart(product.name, product.source || 'store', product.barcode, product.price?.toString())}
                                  disabled={!canIncrease}
                                  className={`w-9 h-9 rounded-xl shadow-sm flex items-center justify-center text-lg font-bold transition-colors ${
                                    canIncrease
                                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={canIncrease ? 'زيادة الكمية' : 'وصلت للكمية المتاحة'}
                               >
                                  +
                               </button>
                            </div>
                            <button 
                               type="button"
                               onClick={() => {
                                 onClose();
                                 setIsCartOpen(true);
                               }}
                               className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3.5 px-4 rounded-2xl font-bold shadow-lg shadow-brand-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2 animate-fade-in"
                            >
                               <ShoppingBag className="w-5 h-5" />
                               <span>عرض السلة</span>
                            </button>
                         </div>
                         
                         {/* Second Row: Continue Shopping */}
                         <button 
                            type="button"
                            onClick={onClose}
                            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 py-3.5 rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 animate-fade-in"
                         >
                            <span>استكمال الشراء</span>
                         </button>
                      </div>
                   ) : (
                      <button 
                        type="button"
                        onClick={() => {
                          if (!product.inStock) {
                            setRequestModalOpen(true);
                            return;
                          }
                          if (canIncrease) {
                            addToCart(product.name, product.source || 'store', product.barcode, product.price?.toString());
                          }
                        }}
                        disabled={product.inStock && !canIncrease}
                        className={`flex-1 text-white py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                          product.inStock && canIncrease
                            ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-200 dark:shadow-none' 
                            : product.inStock
                              ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed'
                              : 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600'
                        }`}
                      >
                         <ShoppingBag className="w-5 h-5" />
                         <span>{product.inStock ? (canIncrease ? 'إضافة للسلة' : 'وصلت للكمية المتاحة') : 'اطلب توفيره'}</span>
                      </button>
                   )}
                </div>
             </div>

          </div>
        </div>
      </div>
      
      {requestModalOpen && (
        <ProductRequestModal 
          initialProductName={product.name} 
          onClose={() => setRequestModalOpen(false)} 
        />
      )}

      {isImageViewerOpen && (
        <ImageViewerModal
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          src={product.image}
          alt={product.name}
          title={product.name}
          subtitle={product.category || product.app_category}
        />
      )}
    </>,
    document.body
  );
};
