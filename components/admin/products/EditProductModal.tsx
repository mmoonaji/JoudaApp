import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Tag, Star, PackageSearch, SlidersHorizontal, CheckCircle2, Fingerprint, Banknote, LayoutGrid, Infinity } from 'lucide-react';
import { Product, AppCategory } from '../../../services/supabaseService';
import { BADGE_OPTIONS } from './constants';

export interface EditProductModalProps {
  product: Product;
  categories: AppCategory[];
  cashierCategories: string[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (product: Product, updates: any) => Promise<void>;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ product, categories, cashierCategories, isSaving, onClose, onSave }) => {
  const [draftTags, setDraftTags] = useState<string[]>(product.tags || []);
  const [draftDescription, setDraftDescription] = useState<string>(product.description || '');
  const [draftCategory, setDraftCategory] = useState<string>(product.app_category || '');
  const [draftCashierCategory, setDraftCashierCategory] = useState<string>(product.category || '');
  const [isHidden, setIsHidden] = useState<boolean>(product.is_hidden_in_app || false);
  const [isOutOfStock, setIsOutOfStock] = useState<boolean>(product.force_out_of_stock || false);
  const [isAlwaysAvailable, setIsAlwaysAvailable] = useState<boolean>(product.is_stock_tracked === false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const hasChanges = useMemo(() => {
    const tagsChanged = draftTags.length !== (product.tags?.length || 0) || !draftTags.every(t => product.tags?.includes(t));
    const descChanged = draftDescription !== (product.description || '');
    const catChanged = draftCategory !== (product.app_category || '');
    const cashierCatChanged = draftCashierCategory !== (product.category || '');
    const hiddenChanged = isHidden !== (product.is_hidden_in_app || false);
    const outOfStockChanged = isOutOfStock !== (product.force_out_of_stock || false);
    const alwaysAvailableChanged = isAlwaysAvailable !== (product.is_stock_tracked === false);
    
    return tagsChanged || descChanged || catChanged || cashierCatChanged || hiddenChanged || outOfStockChanged || alwaysAvailableChanged;
  }, [draftTags, draftDescription, draftCategory, draftCashierCategory, isHidden, isOutOfStock, isAlwaysAvailable, product]);

  const handleClose = () => {
    if (hasChanges && !isSaving) {
      if (window.confirm('لديك تعديلات غير محفوظة، هل أنت متأكد من الإغلاق؟')) {
        onClose();
      }
    } else if (!isSaving) {
      onClose();
    }
  };

  const toggleTag = (tagId: string) => {
    setDraftTags(prev => 
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSave = () => {
    if (!hasChanges) return;
    onSave(product, {
      tags: draftTags,
      description: draftDescription.trim() || null,
      app_category: draftCategory || null,
      category: draftCashierCategory.trim() || 'عام',
      is_hidden_in_app: isHidden,
      force_out_of_stock: isOutOfStock,
      is_stock_tracked: !isAlwaysAvailable
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative w-full sm:max-w-2xl bg-gray-50 dark:bg-gray-950 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[92vh] sm:h-auto sm:max-h-[90vh] animate-slide-up sm:animate-scale-in overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="font-black text-gray-900 dark:text-white text-base md:text-lg">تعديل المنتج</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-brand-600 font-bold truncate max-w-[250px]">{product.name}</span>
            </div>
          </div>
          <button onClick={handleClose} disabled={isSaving} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Section 1: System Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold mb-0.5">السعر الأساسي</p>
                <p className="text-sm font-black text-gray-900 dark:text-white">{product.price}<span className="saudi-riyal mr-1">{"\u00ea"}</span></p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <Fingerprint className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-gray-500 font-bold mb-0.5">الباركود</p>
                <p className="text-sm font-mono text-gray-900 dark:text-white truncate">{product.barcode}</p>
              </div>
            </div>
          </div>

          {product.is_active === false && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4">
              <p className="text-sm font-black text-red-700 dark:text-red-300 mb-1">غير نشط في Inventory</p>
              <p className="text-xs leading-relaxed text-red-600 dark:text-red-300 font-bold">
                هذا المنتج لن يظهر للعملاء حتى لو كان غير مخفي أو غير مرتبط بالمخزون. فعّله من Inventory ثم انتظر مزامنة المنتجات.
              </p>
            </div>
          )}

          {/* Section 2: Store Status */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
              <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-500" /> ظهور وتوفر المنتج في التطبيق
              </h3>
            </div>
            <div className="p-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setIsHidden(!isHidden)}
                className={`w-full p-3.5 rounded-xl border transition-all flex items-center justify-between active:scale-[0.98] ${
                  isHidden ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : 'bg-white border-transparent hover:border-gray-100 dark:bg-gray-900 dark:border-transparent'
                }`}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className={`font-bold text-sm ${isHidden ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>إخفاء من التطبيق</span>
                  <span className="text-[10px] text-gray-500">يخفيه عن العملاء فقط.</span>
                </div>
                <div className={`w-11 h-6 rounded-full p-1 transition-colors flex shrink-0 ${isHidden ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isHidden ? '-translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
              <button
                onClick={() => {
                  const nextValue = !isOutOfStock;
                  setIsOutOfStock(nextValue);
                  if (nextValue) setIsAlwaysAvailable(false);
                }}
                className={`w-full p-3.5 rounded-xl border transition-all flex items-center justify-between active:scale-[0.98] ${
                  isOutOfStock ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50' : 'bg-white border-transparent hover:border-gray-100 dark:bg-gray-900 dark:border-transparent'
                }`}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className={`font-bold text-sm ${isOutOfStock ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>إظهاره كنافد</span>
                  <span className="text-[10px] text-gray-500">يبقى ظاهرًا بدون طلب.</span>
                </div>
                <div className={`w-11 h-6 rounded-full p-1 transition-colors flex shrink-0 ${isOutOfStock ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isOutOfStock ? '-translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
              <button
                onClick={() => {
                  const nextValue = !isAlwaysAvailable;
                  setIsAlwaysAvailable(nextValue);
                  if (nextValue) setIsOutOfStock(false);
                }}
                className={`w-full p-3.5 rounded-xl border transition-all flex items-center justify-between active:scale-[0.98] ${
                  isAlwaysAvailable ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50' : 'bg-white border-transparent hover:border-gray-100 dark:bg-gray-900 dark:border-transparent'
                }`}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className={`font-bold text-sm flex items-center gap-1 ${isAlwaysAvailable ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                    <Infinity className="w-3.5 h-3.5" />
                    غير مرتبط بالمخزون
                  </span>
                  <span className="text-[10px] text-gray-500">لا يعني أنه ظاهر للعملاء.</span>
                </div>
                <div className={`w-11 h-6 rounded-full p-1 transition-colors flex shrink-0 ${isAlwaysAvailable ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isAlwaysAvailable ? '-translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
              <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <LayoutGrid className="w-4 h-4 text-brand-500" /> تصنيف الكاشير
              </h3>
              <select
                value={draftCashierCategory}
                onChange={(e) => setDraftCashierCategory(e.target.value)}
                className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white appearance-none"
              >
                <option value="">بدون تصنيف</option>
                {!cashierCategories.includes(draftCashierCategory) && draftCashierCategory && (
                  <option value={draftCashierCategory}>{draftCashierCategory}</option>
                )}
                {cashierCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
              <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <PackageSearch className="w-4 h-4 text-brand-500" /> تصنيف التطبيق
              </h3>
              <select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white appearance-none"
              >
                <option value="">-- كاشير: ({product.category}) --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 4: Promo Description */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-brand-500" /> الوصف الترويجي
            </h3>
            <textarea 
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder="اكتب وصفاً مميزاً يظهر لعملاء التطبيق..."
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[90px] resize-none text-gray-900 dark:text-white transition-all"
            />
          </div>

          {/* Section 5: Badges */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-brand-500" /> شارات المنتج
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BADGE_OPTIONS.map(badge => {
                const isActive = draftTags.includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    onClick={() => toggleTag(badge.id)}
                    className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between active:scale-[0.98] ${
                      isActive ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-white dark:bg-gray-800 shadow-sm text-brand-600' : 'bg-transparent text-gray-500 dark:text-gray-400'}`}>
                        {badge.icon}
                      </div>
                      <div>
                        <h4 className={`font-bold text-xs ${isActive ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-white'}`}>{badge.label}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{badge.desc}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${isActive ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 dark:border-gray-600 text-transparent'}`}>
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0 pb-safe">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`w-full h-14 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              hasChanges 
                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/30' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
