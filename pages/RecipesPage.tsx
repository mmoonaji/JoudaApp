import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChefHat, Clock, Flame, ChevronDown, ShoppingBag, Plus,
  AlertCircle, RefreshCw, PackageCheck, PlayCircle, ExternalLink,
  Search, X, Heart, Share2, Sparkles, Check, Bookmark
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { fetchRecipesFromSupabase, Recipe, Product, getYouTubeEmbedId } from '../services/supabaseService';
import { AppImage } from '../components/ui/AppImage';
import {
  formatRecipeAddSummary,
  getRecipeRawItems,
  loadRecipeCartCandidates,
  planRecipeCartAdditions,
} from '../utils/recipeCartUtils';

const FAVORITES_KEY = 'jouda_recipe_favorites_v1';

export const RecipesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requestedRecipeId = searchParams.get('id');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { items: cartItems, addToCartWithBarcode } = useCart();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [cachedProducts, setCachedProducts] = useState<Product[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'سهل' | 'متوسط' | 'صعب' | 'favorites' | 'video'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [copiedRecipeId, setCopiedRecipeId] = useState<string | null>(null);

  // Load favorites from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) setFavorites(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to parse recipe favorites', e);
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save favorites', err);
      }
      return updated;
    });
  };

  const isFavorite = (recipeId: string) => favorites.includes(recipeId);

  const loadRecipes = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchRecipesFromSupabase();
      if (data.length > 0) {
        setRecipes(data);
      } else {
        setRecipes([]);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  // Handle URL param ?id=xxx
  useEffect(() => {
    if (requestedRecipeId && recipes.length > 0) {
      const found = recipes.find(r => r.id === requestedRecipeId);
      if (found) {
        setExpandedId(found.id);
        setTimeout(() => {
          const el = document.getElementById(`recipe-${found.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);
      }
    }
  }, [requestedRecipeId, recipes]);

  useEffect(() => {
    const loadProductsAndResolveNames = async () => {
      try {
        const { getCachedProducts } = await import('../services/db');
        const products = await getCachedProducts();
        setCachedProducts(products);

        const newNames: Record<string, string> = {};
        products.forEach(p => {
          if (p.barcode) {
            newNames[p.barcode] = p.name;
          }
        });
        setProductNames(newNames);
      } catch (e) {
        console.warn("Failed to resolve product names", e);
      }
    };

    loadProductsAndResolveNames();
  }, [recipes]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleShareRecipe = async (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/recipes?id=${recipe.id}`;
    const shareText = `شوف وصفة "${recipe.title}" اللذيذة والخالية من الجلوتين من تطبيق جودة:\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedRecipeId(recipe.id);
      setTimeout(() => setCopiedRecipeId(null), 2000);
    } catch (err) {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const handleBuyBundle = async (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    const rawItems = getRecipeRawItems(recipe);
    if (rawItems.length === 0) return;

    const { candidates, notFound } = await loadRecipeCartCandidates(rawItems, cachedProducts);
    const plan = planRecipeCartAdditions(candidates, cartItems, notFound);

    for (const product of plan.addable) {
      addToCartWithBarcode(product);
    }

    const summary = formatRecipeAddSummary(plan.addable.length, plan.skipped);
    if (summary) {
      alert(summary);
    }
  };

  const handleAddSingleItem = async (e: React.MouseEvent, itemOrBarcode: string) => {
    e.stopPropagation();
    if (!itemOrBarcode) return;
    const trimmed = itemOrBarcode.trim();

    const { candidates, notFound } = await loadRecipeCartCandidates([trimmed], cachedProducts);
    const plan = planRecipeCartAdditions(candidates, cartItems, notFound);

    for (const product of plan.addable) {
      addToCartWithBarcode(product);
    }

    const summary = formatRecipeAddSummary(plan.addable.length, plan.skipped);
    if (summary) {
      alert(summary);
    }
  };

  const getBundleDisplayNames = (recipe: Recipe) => {
    const names = new Set<string>();
    if (recipe.mainProduct) {
      const resolved = productNames[recipe.mainProduct] || recipe.mainProduct;
      if (resolved) names.add(resolved);
    }
    if (recipe.bundleItems && recipe.bundleItems.length > 0) {
      recipe.bundleItems.forEach(item => {
        if (!item) return;
        const resolved = productNames[item] || item;
        names.add(resolved);
      });
    }
    return Array.from(names);
  };

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        r.title?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        (r.ingredients && r.ingredients.some(ing => ing.toLowerCase().includes(query))) ||
        (r.mainProduct && (productNames[r.mainProduct] || r.mainProduct).toLowerCase().includes(query));

      let matchTab = true;
      if (activeTab === 'favorites') {
        matchTab = favorites.includes(r.id);
      } else if (activeTab === 'video') {
        matchTab = Boolean(r.videoUrl || r.video_url);
      } else if (activeTab !== 'all') {
        matchTab = r.difficulty === activeTab;
      }

      return matchSearch && matchTab;
    });
  }, [recipes, searchQuery, activeTab, favorites, productNames]);

  return (
    <div className="pb-24 md:pb-10 animate-fade-in text-right" dir="rtl">
      {/* Compact Modern Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              مطبخ جوده 👩‍🍳
            </h1>
            <span className="text-xs font-bold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full border border-brand-200/60 dark:border-brand-900/60">
              {recipes.length} وصفات
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            وصفات لذيذة ومجربة، ومقاديرها توصلك لسلتك بضغطة واحدة
          </p>
        </div>

        <button
          type="button"
          onClick={loadRecipes}
          disabled={loading}
          className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/80 shadow-xs flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-brand-600 hover:border-brand-300 transition-all active:scale-95 disabled:opacity-50 shrink-0"
          title="تحديث الوصفات"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Floating Search Bar */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="ابحث عن وصفة، مكوّن، أو منتج..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full h-11 pr-11 pl-10 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700/80 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none dark:text-white font-medium placeholder:text-gray-400 shadow-xs transition-all"
        />
        <Search className="w-4 h-4 text-gray-400 absolute right-4 top-3.5 pointer-events-none" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-2.5 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-300 transition-colors"
            title="مسح البحث"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Chips Horizontal Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-5 pt-0.5">
        {[
          { id: 'all', label: 'الكل', icon: Sparkles },
          { id: 'favorites', label: `المفضلة (${favorites.length})`, icon: Heart },
          { id: 'video', label: 'فيديو', icon: PlayCircle },
          { id: 'سهل', label: 'سهل' },
          { id: 'متوسط', label: 'متوسط' },
          { id: 'صعب', label: 'صعب' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 shadow-2xs ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'bg-white dark:bg-gray-850 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-700/70'
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'fill-white' : ''}`} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="bg-white dark:bg-gray-850 rounded-3xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse space-y-3"
            >
              <div className="w-full aspect-video rounded-2xl bg-gray-100 dark:bg-gray-750" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-750 rounded-md w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white dark:bg-gray-850 rounded-3xl border border-red-100 dark:border-red-900/30 p-6 shadow-xs">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">ما قدرنا نحمّل الوصفات</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">شيك على اتصالك بالنت وجرب مرة ثانية</p>
          <button
            type="button"
            onClick={loadRecipes}
            className="bg-brand-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20"
          >
            جرب مرة ثانية
          </button>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-850 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-xs">
          <ChefHat className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-800 dark:text-gray-200 font-bold text-sm mb-1">
            {activeTab === 'favorites'
              ? 'ما حفظت أي وصفة في المفضلة لسه'
              : searchQuery
              ? 'ما لقينا وصفات تطابق بحثك'
              : 'ما في وصفات متوفرة حالياً'}
          </p>
          {activeTab === 'favorites' && (
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className="mt-3 text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
            >
              تصفح كل الوصفات واضغط ❤️ عشان ترجع لها بسهولة
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecipes.map((recipe, index) => {
            const youtubeId = recipe.videoUrl || recipe.video_url ? getYouTubeEmbedId(recipe.videoUrl || recipe.video_url || '') : null;
            const isExpanded = expandedId === recipe.id;
            const favorited = isFavorite(recipe.id);
            const bundleNames = getBundleDisplayNames(recipe);
            const hasBundleOrMain = recipe.mainProduct || (recipe.bundleItems && recipe.bundleItems.length > 0);

            return (
              <div
                key={recipe.id}
                id={`recipe-${recipe.id}`}
                className={`bg-white dark:bg-gray-850 rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xs ${
                  isExpanded
                    ? 'border-brand-300 dark:border-brand-900/80 ring-2 ring-brand-500/15 shadow-md md:col-span-2'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm'
                }`}
              >
                <div>
                  {/* Visual Appetite Image Card (Hero Aspect) */}
                  <div
                    onClick={() => toggleExpand(recipe.id)}
                    className="relative w-full aspect-16/10 sm:aspect-16/9 bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer group"
                  >
                    <AppImage
                      src={recipe.image || recipe.image_url}
                      alt={recipe.title}
                      priority={index === 0}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      fallback={
                        <div className="w-full h-full flex flex-col items-center justify-center bg-brand-50/50 dark:bg-brand-950/20 text-brand-600">
                          <ChefHat className="w-12 h-12 stroke-1" />
                          <span className="text-xs font-bold mt-1">مطبخ جوده</span>
                        </div>
                      }
                    />

                    {/* Gradient Overlay for Top Controls */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                    {/* Top Overlay: Badges and Floating Action Buttons */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
                      {/* Floating Time & Difficulty Badges */}
                      <div className="flex items-center gap-1.5">
                        {recipe.time && (
                          <span className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-bold border border-white/10 shadow-xs">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{recipe.time}</span>
                          </span>
                        )}
                        {recipe.difficulty && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-xs border ${
                            recipe.difficulty === 'سهل'
                              ? 'bg-emerald-600/80 text-white border-emerald-400/30'
                              : recipe.difficulty === 'صعب'
                              ? 'bg-rose-600/80 text-white border-rose-400/30'
                              : 'bg-amber-600/80 text-white border-amber-400/30'
                          }`}>
                            {recipe.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Action buttons (Share & Favorite) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleShareRecipe(e, recipe)}
                          className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white border border-white/15 transition-all active:scale-90 shadow-xs"
                          title="مشاركة الوصفة"
                        >
                          {copiedRecipeId === recipe.id ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(e, recipe.id)}
                          className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white border border-white/15 transition-all active:scale-90 shadow-xs"
                          title={favorited ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
                        >
                          <Heart className={`w-4 h-4 ${favorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Video Indicator Center / Bottom */}
                    {(recipe.videoUrl || recipe.video_url) && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center text-white border border-white/25 shadow-lg group-hover:scale-110 transition-transform">
                          <PlayCircle className="w-7 h-7 text-white drop-shadow" />
                        </div>
                      </div>
                    )}

                    {/* Bottom overlay info (Calories + Bundle count) */}
                    <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-white text-xs font-bold z-10">
                      {recipe.calories ? (
                        <span className="inline-flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg text-white/90">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>{recipe.calories}</span>
                        </span>
                      ) : <span />}

                      {bundleNames.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-brand-600/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-white">
                          <PackageCheck className="w-3 h-3" />
                          <span>{bundleNames.length} مقادير متوفرة</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 sm:p-5">
                    <h3
                      onClick={() => toggleExpand(recipe.id)}
                      className="font-black text-gray-900 dark:text-white text-base sm:text-lg leading-snug cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      {recipe.title}
                    </h3>

                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1.5 leading-relaxed font-normal">
                      {recipe.description || 'وصفة لذيذة وشهية خالية تماماً من الجلوتين.'}
                    </p>

                    {/* Main Product Tag */}
                    {recipe.mainProduct && productNames[recipe.mainProduct] && (
                      <div className="mt-3 inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                        <span>محضّرة بـ: </span>
                        <strong className="text-gray-900 dark:text-white font-bold">
                          {productNames[recipe.mainProduct]}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Interactive Bar */}
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    {/* Quick Add Bundle Button */}
                    {hasBundleOrMain ? (
                      <button
                        type="button"
                        onClick={(e) => handleBuyBundle(e, recipe)}
                        className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm shadow-brand-500/20 active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>شراء المقادير</span>
                      </button>
                    ) : null}

                    {/* Toggle Recipe Steps Button */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(recipe.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-1 border ${
                        hasBundleOrMain
                          ? 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                          : 'flex-1 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/60 hover:bg-brand-100'
                      }`}
                    >
                      <span>{isExpanded ? 'إخفاء الطريقة' : 'عرض الطريقة'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 animate-fade-in border-t border-gray-100 dark:border-gray-800">
                    {/* Video Section */}
                    {(recipe.videoUrl || recipe.video_url) && (
                      <div className="mt-4 mb-6">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <PlayCircle className="w-4 h-4 text-red-500" />
                          <span>طريقة التحضير بالفيديو</span>
                        </h4>
                        {youtubeId ? (
                          <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-black">
                            <iframe
                              width="100%"
                              height="100%"
                              src={`https://www.youtube.com/embed/${youtubeId}`}
                              title={recipe.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                        ) : (
                          <a
                            href={recipe.videoUrl || recipe.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm text-gray-800 dark:text-white">
                                <PlayCircle className="w-5 h-5 text-red-500" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">مشاهدة الفيديو على يوتيوب</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">اضغط هنا عشان تفتح الفيديو وتشوف الطريقة</p>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Main Product Box */}
                    {recipe.mainProduct && (
                      <div className="bg-brand-50/50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/40 rounded-2xl p-4 mb-5 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-brand-600 dark:text-brand-400 font-bold block mb-0.5">
                            المنتج الأساسي بالوصفة
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
                            {productNames[recipe.mainProduct] || recipe.mainProduct}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleAddSingleItem(e, recipe.mainProduct)}
                          className="bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 px-3.5 py-2 rounded-xl shadow-xs hover:bg-brand-50 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold border border-brand-200 dark:border-brand-800"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>أضف للسلة</span>
                        </button>
                      </div>
                    )}

                    {/* Ingredients & Steps Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      {/* Ingredients */}
                      {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <div className="bg-gray-50/80 dark:bg-gray-800/60 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-500" />
                            <span>المقادير والمكونات:</span>
                          </h4>
                          <ul className="space-y-2 text-xs text-gray-700 dark:text-gray-300 font-medium">
                            {recipe.ingredients.map((ing, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                                <span>{ing}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Preparation Steps */}
                      {recipe.steps && recipe.steps.length > 0 && (
                        <div className="bg-gray-50/80 dark:bg-gray-800/60 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>طريقة التحضير:</span>
                          </h4>
                          <ol className="space-y-3 text-xs text-gray-700 dark:text-gray-300 font-medium">
                            {recipe.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                                <span className="w-5 h-5 bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>

                    {/* Bundle Purchase Box */}
                    {bundleNames.length > 0 && (
                      <div className="mt-4">
                        <div className="bg-gradient-to-br from-brand-50/70 to-amber-50/70 dark:from-brand-950/20 dark:to-amber-950/20 border border-brand-200 dark:border-brand-900/40 rounded-2xl p-4 sm:p-5">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <PackageCheck className="w-4 h-4 text-brand-600" />
                              <span>مقادير الوصفة المتوفرة بالمتجر</span>
                            </h4>
                            <span className="text-xs font-bold text-brand-700 dark:text-brand-400 bg-white dark:bg-gray-800 px-2.5 py-0.5 rounded-full border border-brand-200 dark:border-brand-800">
                              {bundleNames.length} عناصر
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3.5 leading-relaxed">
                            وفّر وقتك وضِف كل مقادير الوصفة المتوفرة لسلتك بضغطة واحدة:
                          </p>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {bundleNames.map((name, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-brand-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold shadow-2xs"
                              >
                                ✓ {name}
                              </span>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleBuyBundle(e, recipe)}
                            className="inline-flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20 active:scale-98"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>أضف مقادير الوصفة كاملة للسلة 🛒</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
