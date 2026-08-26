import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChefHat, Save, Edit, Trash2, Search, Plus, X,
  ShoppingBag, ListPlus, Flame, Clock, ArrowUp, ArrowDown,
  PlayCircle, PackageCheck, Sparkles, Check, AlertCircle, RotateCcw
} from 'lucide-react';
import { Product, Recipe } from '../../services/supabaseService';
import { AdminContentService } from '../../services/admin/AdminContentService';
import { ImageUploadInput } from './ImageUploadInput';
import { AppImage } from '../ui/AppImage';

interface RecipeManagerProps {
  products?: Product[];
  recipes: Recipe[];
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  loadData: () => Promise<void>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const RecipeManager: React.FC<RecipeManagerProps> = ({
  products = [],
  recipes,
  showSuccess,
  showError,
  loadData,
  loading,
  setLoading
}) => {
  // Form States
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeTime, setRecipeTime] = useState('');
  const [recipeDifficulty, setRecipeDifficulty] = useState('سهل');
  const [recipeCalories, setRecipeCalories] = useState('');
  const [recipeMainProduct, setRecipeMainProduct] = useState('');
  const [recipeBundleItems, setRecipeBundleItems] = useState<string[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<string[]>([]);
  const [recipeSteps, setRecipeSteps] = useState<string[]>([]);
  const [recipeImage, setRecipeImage] = useState('');
  const [recipeVideo, setRecipeVideo] = useState('');

  // Builder Input States
  const [newIngredient, setNewIngredient] = useState('');
  const [newStep, setNewStep] = useState('');

  // Bulk paste modal / toggle
  const [showBulkIngredients, setShowBulkIngredients] = useState(false);
  const [bulkIngredientsText, setBulkIngredientsText] = useState('');
  const [showBulkSteps, setShowBulkSteps] = useState(false);
  const [bulkStepsText, setBulkStepsText] = useState('');

  // Product Picker States
  const [mainProductSearch, setMainProductSearch] = useState('');
  const [isMainProductDropdownOpen, setIsMainProductDropdownOpen] = useState(false);
  const [manualMainBarcodeMode, setManualMainBarcodeMode] = useState(false);

  const [bundleSearch, setBundleSearch] = useState('');
  const [isBundleDropdownOpen, setIsBundleDropdownOpen] = useState(false);

  // Filter & Search in Recipes List
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const formRef = useRef<HTMLDivElement>(null);
  const mainProductSearchRef = useRef<HTMLDivElement>(null);
  const bundleSearchRef = useRef<HTMLDivElement>(null);

  // Map products by barcode for fast lookups
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => {
      if (p.barcode) map.set(p.barcode, p);
    });
    return map;
  }, [products]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mainProductSearchRef.current && !mainProductSearchRef.current.contains(e.target as Node)) {
        setIsMainProductDropdownOpen(false);
      }
      if (bundleSearchRef.current && !bundleSearchRef.current.contains(e.target as Node)) {
        setIsBundleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered store products for Main Product Picker
  const matchedMainProducts = useMemo(() => {
    if (!mainProductSearch.trim()) return [];
    const query = mainProductSearch.toLowerCase().trim();
    return products.filter(p =>
      !p.barcode.startsWith('PKG-') &&
      p.category !== 'عروض وبكجات' &&
      (p.name.toLowerCase().includes(query) || p.barcode.includes(query))
    ).slice(0, 6);
  }, [products, mainProductSearch]);

  // Filtered store products for Bundle Items Picker
  const matchedBundleProducts = useMemo(() => {
    if (!bundleSearch.trim()) return [];
    const query = bundleSearch.toLowerCase().trim();
    return products.filter(p =>
      !p.barcode.startsWith('PKG-') &&
      p.category !== 'عروض وبكجات' &&
      !recipeBundleItems.includes(p.barcode) &&
      (p.name.toLowerCase().includes(query) || p.barcode.includes(query))
    ).slice(0, 6);
  }, [products, bundleSearch, recipeBundleItems]);

  // Calculate estimated total price for bundle items
  const bundleEstimatedTotal = useMemo(() => {
    let total = 0;
    recipeBundleItems.forEach(barcode => {
      const prod = productMap.get(barcode);
      if (prod && typeof prod.price === 'number') {
        total += prod.price;
      }
    });
    return total;
  }, [recipeBundleItems, productMap]);

  // ==========================
  // INGREDIENTS HANDLERS
  // ==========================
  const addIngredient = () => {
    if (newIngredient.trim()) {
      setRecipeIngredients(prev => [...prev, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const handleIngredientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  };

  const handleBulkAddIngredients = () => {
    if (!bulkIngredientsText.trim()) return;
    const lines = bulkIngredientsText
      .split('\n')
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);

    if (lines.length > 0) {
      setRecipeIngredients(prev => [...prev, ...lines]);
      setBulkIngredientsText('');
      setShowBulkIngredients(false);
    }
  };

  const moveIngredient = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= recipeIngredients.length) return;
    setRecipeIngredients(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const removeIngredient = (index: number) => {
    setRecipeIngredients(prev => prev.filter((_, idx) => idx !== index));
  };

  // ==========================
  // STEPS HANDLERS
  // ==========================
  const addStep = () => {
    if (newStep.trim()) {
      setRecipeSteps(prev => [...prev, newStep.trim()]);
      setNewStep('');
    }
  };

  const handleStepKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addStep();
    }
  };

  const handleBulkAddSteps = () => {
    if (!bulkStepsText.trim()) return;
    const lines = bulkStepsText
      .split('\n')
      .map(line => line.replace(/^(\d+[\.\-\)]|[•*-])\s*/, '').trim())
      .filter(line => line.length > 0);

    if (lines.length > 0) {
      setRecipeSteps(prev => [...prev, ...lines]);
      setBulkStepsText('');
      setShowBulkSteps(false);
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= recipeSteps.length) return;
    setRecipeSteps(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  const removeStep = (index: number) => {
    setRecipeSteps(prev => prev.filter((_, idx) => idx !== index));
  };

  // ==========================
  // BUNDLE ITEMS HANDLERS
  // ==========================
  const addBundleItem = (barcode: string) => {
    if (!recipeBundleItems.includes(barcode)) {
      setRecipeBundleItems(prev => [...prev, barcode]);
    }
    setBundleSearch('');
    setIsBundleDropdownOpen(false);
  };

  const removeBundleItem = (barcode: string) => {
    setRecipeBundleItems(prev => prev.filter(b => b !== barcode));
  };

  // ==========================
  // RESET FORM
  // ==========================
  const resetForm = () => {
    setRecipeId(null);
    setRecipeTitle('');
    setRecipeDescription('');
    setRecipeTime('');
    setRecipeDifficulty('سهل');
    setRecipeCalories('');
    setRecipeMainProduct('');
    setRecipeBundleItems([]);
    setRecipeIngredients([]);
    setRecipeSteps([]);
    setRecipeImage('');
    setRecipeVideo('');
    setNewIngredient('');
    setNewStep('');
    setMainProductSearch('');
    setIsMainProductDropdownOpen(false);
    setManualMainBarcodeMode(false);
    setBundleSearch('');
    setIsBundleDropdownOpen(false);
  };

  // ==========================
  // SAVE RECIPE
  // ==========================
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeTitle.trim()) {
      showError('عنوان الوصفة مطلوب');
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        title: recipeTitle.trim(),
        description: recipeDescription.trim(),
        time: recipeTime.trim(),
        difficulty: recipeDifficulty,
        calories: recipeCalories.trim(),
        main_product: recipeMainProduct.trim(),
        bundle_items: recipeBundleItems,
        ingredients: recipeIngredients,
        steps: recipeSteps,
        image_url: recipeImage.trim(),
        video_url: recipeVideo.trim()
      };

      if (recipeId) {
        payload.id = recipeId;
      }

      await AdminContentService.upsertRecipe(payload);
      showSuccess(recipeId ? 'تم تحديث الوصفة بنجاح' : 'تمت إضافة الوصفة بنجاح');
      resetForm();
      await loadData();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ الوصفة');
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // EDIT & DELETE
  // ==========================
  const handleEditRecipeClick = (r: Recipe) => {
    setRecipeId(r.id);
    setRecipeTitle(r.title || '');
    setRecipeDescription(r.description || '');
    setRecipeTime(r.time || '');
    setRecipeDifficulty(r.difficulty || 'سهل');
    setRecipeCalories(r.calories || '');
    setRecipeMainProduct(r.main_product || r.mainProduct || '');
    setRecipeBundleItems(r.bundle_items || r.bundleItems || []);
    setRecipeIngredients(r.ingredients || []);
    setRecipeSteps(r.steps || []);
    setRecipeImage(r.image_url || r.image || '');
    setRecipeVideo(r.video_url || r.videoUrl || '');

    const mainProd = productMap.get(r.main_product || r.mainProduct || '');
    if (mainProd) {
      setMainProductSearch('');
      setManualMainBarcodeMode(false);
    } else if (r.main_product || r.mainProduct) {
      setManualMainBarcodeMode(true);
    }

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوصفة نهائياً؟')) return;
    try {
      setLoading(true);
      await AdminContentService.deleteRecipe(id);
      showSuccess('تم حذف الوصفة بنجاح');
      if (recipeId === id) {
        resetForm();
      }
      await loadData();
    } catch (err: any) {
      showError(err.message || 'فشل حذف الوصفة');
    } finally {
      setLoading(false);
    }
  };

  const selectedMainProduct = productMap.get(recipeMainProduct);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchSearch =
        !listSearchQuery.trim() ||
        r.title?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
        (r.ingredients && r.ingredients.some(ing => ing.toLowerCase().includes(listSearchQuery.toLowerCase())));

      const matchDifficulty =
        difficultyFilter === 'all' || r.difficulty === difficultyFilter;

      return matchSearch && matchDifficulty;
    });
  }, [recipes, listSearchQuery, difficultyFilter]);

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-12" dir="rtl">
      {/* Recipe Form Column */}
      <div ref={formRef} className="lg:col-span-6 xl:col-span-5">
        <form
          onSubmit={handleSaveRecipe}
          className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-5 shadow-sm sticky top-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900 dark:text-white">
                  {recipeId ? 'تعديل الوصفة' : 'إضافة وصفة جديدة'}
                </h2>
                <p className="text-[10px] text-gray-400 font-bold">
                  {recipeId ? 'تحديث تفاصيل ومكونات الوصفة الحالية' : 'أنشئ وصفة شهية واربطها بمنتجات متجرك'}
                </p>
              </div>
            </div>

            {recipeId && (
              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg border border-amber-200 dark:border-amber-800">
                وضع التعديل
              </span>
            )}
          </div>

          {/* Basic Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-gray-700 dark:text-gray-300 font-bold mb-1">
                عنوان الوصفة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="مثال: بان كيك خالي من الغلوتين بالعسل"
                required
                value={recipeTitle}
                onChange={e => setRecipeTitle(e.target.value)}
                className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">وقت التحضير</label>
                <input
                  type="text"
                  placeholder="30 دقيقة"
                  value={recipeTime}
                  onChange={e => setRecipeTime(e.target.value)}
                  className="w-full h-10 px-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">مستوى الصعوبة</label>
                <select
                  value={recipeDifficulty}
                  onChange={e => setRecipeDifficulty(e.target.value)}
                  className="w-full h-10 px-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                >
                  <option value="سهل">سهل</option>
                  <option value="متوسط">متوسط</option>
                  <option value="صعب">صعب</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1">السعرات (اختياري)</label>
                <input
                  type="text"
                  placeholder="280 سعرة"
                  value={recipeCalories}
                  onChange={e => setRecipeCalories(e.target.value)}
                  className="w-full h-10 px-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Main Product Selector */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>المنتج الأساسي للوصفة (شراء سريع)</span>
              </label>
              <button
                type="button"
                onClick={() => setManualMainBarcodeMode(!manualMainBarcodeMode)}
                className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline font-bold"
              >
                {manualMainBarcodeMode ? 'بحث من الكتالوج' : 'إدخال باركود يدوياً'}
              </button>
            </div>

            {/* Selected Main Product Card */}
            {recipeMainProduct && !manualMainBarcodeMode && (
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 border border-brand-200 dark:border-brand-800/50 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                    <AppImage
                      src={selectedMainProduct?.image_url}
                      alt={selectedMainProduct?.name || recipeMainProduct}
                      className="w-full h-full object-cover"
                      fallback={<ChefHat className="w-5 h-5 text-gray-400 m-auto" />}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {selectedMainProduct?.name || 'منتج غير معروف بالكتالوج'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {recipeMainProduct} {selectedMainProduct?.price ? `• ${selectedMainProduct.price} ر.ي` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRecipeMainProduct('');
                    setMainProductSearch('');
                  }}
                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Search Input for Main Product */}
            {!recipeMainProduct && !manualMainBarcodeMode && (
              <div ref={mainProductSearchRef} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث باسم المنتج أو الباركود..."
                    value={mainProductSearch}
                    onChange={e => {
                      setMainProductSearch(e.target.value);
                      setIsMainProductDropdownOpen(true);
                    }}
                    onFocus={() => setIsMainProductDropdownOpen(true)}
                    className="w-full h-10 pr-9 pl-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                </div>

                {isMainProductDropdownOpen && matchedMainProducts.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                    {matchedMainProducts.map(prod => (
                      <button
                        key={prod.barcode}
                        type="button"
                        onClick={() => {
                          setRecipeMainProduct(prod.barcode);
                          setMainProductSearch('');
                          setIsMainProductDropdownOpen(false);
                        }}
                        className="w-full p-2.5 text-right flex items-center gap-2.5 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                          <AppImage
                            src={prod.image_url}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{prod.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{prod.barcode} • {prod.price} ر.ي</p>
                        </div>
                        <Plus className="w-4 h-4 text-brand-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual Barcode Mode */}
            {manualMainBarcodeMode && (
              <div>
                <input
                  type="text"
                  placeholder="أدخل باركود المنتج الأساسي"
                  value={recipeMainProduct}
                  onChange={e => setRecipeMainProduct(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white font-mono"
                />
              </div>
            )}
          </div>

          {/* Bundle Items / Store Ingredients Picker */}
          <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span>حزمة مقادير الوصفة المتوفرة بالمتجر 🛒</span>
              </label>
              {recipeBundleItems.length > 0 && (
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-md">
                  {recipeBundleItems.length} منتجات ({bundleEstimatedTotal} ر.ي)
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              اختر المنتجات المتوفرة بمتجرك لتضاف لسلة العميل بنقرة واحدة عند طلب "مقادير الوصفة".
            </p>

            {/* Search and add to bundle */}
            <div ref={bundleSearchRef} className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث لإضافة منتج لحزمة الشراء..."
                  value={bundleSearch}
                  onChange={e => {
                    setBundleSearch(e.target.value);
                    setIsBundleDropdownOpen(true);
                  }}
                  onFocus={() => setIsBundleDropdownOpen(true)}
                  className="w-full h-10 pr-9 pl-3 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800/40 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none dark:text-white"
                />
                <Search className="w-4 h-4 text-orange-400 absolute right-3 top-3" />
              </div>

              {isBundleDropdownOpen && matchedBundleProducts.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-800 rounded-xl shadow-xl max-h-44 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
                  {matchedBundleProducts.map(prod => (
                    <button
                      key={prod.barcode}
                      type="button"
                      onClick={() => addBundleItem(prod.barcode)}
                      className="w-full p-2.5 text-right flex items-center gap-2.5 hover:bg-orange-50/50 dark:hover:bg-orange-950/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                        <AppImage
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{prod.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{prod.barcode} • {prod.price} ر.ي</p>
                      </div>
                      <Plus className="w-4 h-4 text-orange-600 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Bundle Items Chips */}
            {recipeBundleItems.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                {recipeBundleItems.map(barcode => {
                  const prod = productMap.get(barcode);
                  return (
                    <div
                      key={barcode}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                          <AppImage
                            src={prod?.image_url}
                            alt={prod?.name || barcode}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                          {prod?.name || barcode}
                        </span>
                        {prod?.price && (
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">({prod.price} ر.ي)</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBundleItem(barcode)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 text-center py-1">لم يتم تحديد منتجات لحزمة الشراء بعد</p>
            )}
          </div>

          {/* Media: Image and Video */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div>
              <ImageUploadInput
                value={recipeImage}
                onChange={setRecipeImage}
                folder="recipes"
                label="صورة الوصفة *"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1.5 flex items-center gap-1">
                <PlayCircle className="w-3.5 h-3.5 text-red-500" />
                <span>رابط فيديو يوتيوب (اختياري)</span>
              </label>
              <input
                type="text"
                placeholder="https://youtube.com/watch?v=..."
                value={recipeVideo}
                onChange={e => setRecipeVideo(e.target.value)}
                className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-1.5">نبذة عن الوصفة</label>
            <textarea
              rows={2}
              placeholder="وصف مشوق للطعم، النصائح، والمميزات..."
              value={recipeDescription}
              onChange={e => setRecipeDescription(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none dark:text-white font-medium"
            />
          </div>

          {/* Ingredients Builder */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <span>المكونات والمقادير ({recipeIngredients.length})</span>
              </label>
              <button
                type="button"
                onClick={() => setShowBulkIngredients(!showBulkIngredients)}
                className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline font-bold flex items-center gap-1"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>لصق متعدد</span>
              </button>
            </div>

            {/* Bulk Paste Box */}
            {showBulkIngredients && (
              <div className="p-3 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30 rounded-xl space-y-2">
                <textarea
                  rows={4}
                  placeholder="الصق المقادير هنا، كل مقدار في سطر جديد:&#10;2 كوب دقيق شار خالي من الغلوتين&#10;1 ملعقة طعام خميرة فورية&#10;نصف كوب ماء دافئ"
                  value={bulkIngredientsText}
                  onChange={e => setBulkIngredientsText(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none dark:text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkIngredients(false)}
                    className="px-3 py-1 text-[10px] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkAddIngredients}
                    className="px-3 py-1 bg-brand-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    إضافة الكل
                  </button>
                </div>
              </div>
            )}

            {/* Single Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="أدخل المكون ثم اضغط Enter (مثال: 2 كوب دقيق)"
                value={newIngredient}
                onChange={e => setNewIngredient(e.target.value)}
                onKeyDown={handleIngredientKeyDown}
                className="flex-1 h-9 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
              <button
                type="button"
                onClick={addIngredient}
                className="px-3.5 bg-gray-900 dark:bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                أضف
              </button>
            </div>

            {/* Ingredients Items List */}
            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
              {recipeIngredients.map((ing, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800/60 p-2 rounded-xl text-xs border border-gray-100 dark:border-gray-700/60 group"
                >
                  <span className="font-bold text-gray-700 dark:text-gray-300 flex-1">{ing}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveIngredient(i, 'up')}
                      disabled={i === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 p-0.5"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveIngredient(i, 'down')}
                      disabled={i === recipeIngredients.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 p-0.5"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeIngredient(i)}
                      className="text-gray-400 hover:text-red-500 p-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Steps Builder */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <span>خطوات التحضير ({recipeSteps.length})</span>
              </label>
              <button
                type="button"
                onClick={() => setShowBulkSteps(!showBulkSteps)}
                className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline font-bold flex items-center gap-1"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>لصق خطوات متعددة</span>
              </button>
            </div>

            {/* Bulk Steps Box */}
            {showBulkSteps && (
              <div className="p-3 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30 rounded-xl space-y-2">
                <textarea
                  rows={4}
                  placeholder="الصق خطوات التحضير هنا، كل خطوة في سطر:&#10;1. نخلط المكونات الجافة في وعاء كبير&#10;2. نضيف الماء الدافئ والزيت تدريجياً&#10;3. نخبزها في فرن على حرارة 180 لمدة 20 دقيقة"
                  value={bulkStepsText}
                  onChange={e => setBulkStepsText(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none dark:text-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkSteps(false)}
                    className="px-3 py-1 text-[10px] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkAddSteps}
                    className="px-3 py-1 bg-brand-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    إضافة الكل
                  </button>
                </div>
              </div>
            )}

            {/* Single Step Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="أدخل الخطوة ثم اضغط Enter (مثال: نخلط الدقيق مع البيكنج باودر)"
                value={newStep}
                onChange={e => setNewStep(e.target.value)}
                onKeyDown={handleStepKeyDown}
                className="flex-1 h-9 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
              />
              <button
                type="button"
                onClick={addStep}
                className="px-3.5 bg-gray-900 dark:bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                أضف
              </button>
            </div>

            {/* Steps Items List */}
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
              {recipeSteps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50"
                >
                  <span className="w-5 h-5 bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="flex-1 leading-snug font-medium text-gray-700 dark:text-gray-300">{step}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveStep(i, 'up')}
                      disabled={i === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 p-0.5"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(i, 'down')}
                      disabled={i === recipeSteps.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-20 p-0.5"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="text-gray-400 hover:text-red-500 p-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 active:scale-98 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{recipeId ? 'حفظ التعديلات' : 'حفظ ونشر الوصفة'}</span>
            </button>

            {recipeId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إلغاء</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Recipes List Column */}
      <div className="lg:col-span-6 xl:col-span-7 space-y-4">
        {/* Search & Filter Header */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-3xl space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span>الوصفات الحالية</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                  {filteredRecipes.length} / {recipes.length}
                </span>
              </h2>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                إدارة ومراجعة الوصفات المنشورة في تطبيق جودة
              </p>
            </div>

            {/* Difficulty Filter Tabs */}
            <div className="flex gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
              {['all', 'سهل', 'متوسط', 'صعب'].map(d => (
                <button
                  key={d}
                  onClick={() => setDifficultyFilter(d)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    difficultyFilter === d
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {d === 'all' ? 'الكل' : d}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث في الوصفات بالعنوان، المكونات، أو النبذة..."
              value={listSearchQuery}
              onChange={e => setListSearchQuery(e.target.value)}
              className="w-full h-10 pr-9 pl-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
            {listSearchQuery && (
              <button
                onClick={() => setListSearchQuery('')}
                className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Recipes Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {filteredRecipes.map(r => {
            const mainProd = productMap.get(r.main_product || r.mainProduct || '');
            const bundleCount = (r.bundle_items || r.bundleItems || []).length;
            const isCurrentlyEditing = recipeId === r.id;

            return (
              <div
                key={r.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border transition-all flex flex-col justify-between group ${
                  isCurrentlyEditing
                    ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 shadow-2xs'
                }`}
              >
                <div>
                  {/* Thumbnail Image */}
                  <div className="w-full aspect-[16/9] relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <AppImage
                      src={r.image_url || r.image}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      fallback={
                        <div className="w-full h-full flex items-center justify-center bg-orange-50/50 dark:bg-orange-950/20">
                          <ChefHat className="text-orange-400 w-10 h-10 opacity-70" />
                        </div>
                      }
                    />
                    {/* Badges on Thumbnail */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold rounded-lg flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{r.time || 'بدون وقت'}</span>
                      </span>
                    </div>

                    {r.video_url && (
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-red-600/90 text-white text-[8px] font-bold rounded flex items-center gap-1">
                        <PlayCircle className="w-2.5 h-2.5" />
                        <span>فيديو</span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-1 flex-1">
                        {r.title}
                      </h3>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded shrink-0 ${
                        r.difficulty === 'سهل' ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400' :
                        r.difficulty === 'صعب' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' :
                        'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        {r.difficulty || 'سهل'}
                      </span>
                    </div>

                    {r.description && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>
                    )}

                    {/* Linked Products Tags */}
                    <div className="space-y-1 pt-1 border-t border-gray-50 dark:border-gray-800">
                      {(r.main_product || r.mainProduct) && (
                        <div className="flex items-center gap-1 text-[9px] text-brand-600 dark:text-brand-400 font-bold truncate">
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            المنتج: {mainProd ? mainProd.name : (r.main_product || r.mainProduct)}
                          </span>
                        </div>
                      )}

                      {bundleCount > 0 && (
                        <div className="flex items-center gap-1 text-[9px] text-orange-600 dark:text-orange-400 font-bold">
                          <ShoppingBag className="w-3 h-3 shrink-0" />
                          <span>حزمة الشراء: {bundleCount} مقادير متوفرة</span>
                        </div>
                      )}

                      <div className="text-[9px] text-gray-400 flex gap-2 pt-0.5">
                        <span>{(r.ingredients || []).length} مقادير</span>
                        <span>•</span>
                        <span>{(r.steps || []).length} خطوات</span>
                        {r.calories && (
                          <>
                            <span>•</span>
                            <span>{r.calories}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 pt-0 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditRecipeClick(r)}
                    className="flex-1 h-8 flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-brand-50 dark:bg-gray-800 dark:hover:bg-brand-950/40 text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400 rounded-xl text-xs font-bold border border-gray-100 dark:border-gray-700/60 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecipe(r.id)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 rounded-xl border border-gray-100 dark:border-gray-700/60 transition-colors"
                    title="حذف الوصفة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredRecipes.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-2">
              <ChefHat className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {listSearchQuery ? 'لا توجد وصفات تطابق بحثك' : 'لا توجد وصفات مضافة حالياً'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
