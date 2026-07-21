import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, Flame, ChevronDown, ChevronUp, ShoppingBag, Plus, AlertCircle, RefreshCw, PackageCheck, PlayCircle, ExternalLink } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { fetchRecipesFromSupabase, Recipe, Product, getYouTubeEmbedId } from '../services/supabaseService';
import { AppImage } from '../components/ui/AppImage';
import {
  formatRecipeAddSummary,
  getRecipeRawItems,
  loadRecipeCartCandidates,
  planRecipeCartAdditions,
} from '../utils/recipeCartUtils';

export const RecipesPage: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { items: cartItems, addToCartWithBarcode } = useCart();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [cachedProducts, setCachedProducts] = useState<Product[]>([]);

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
    const loadData = async () => {
      await loadRecipes();
    };
    loadData();
  }, []);

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
    setExpandedId(expandedId === id ? null : id);
  };

  const handleBuyBundle = async (recipe: Recipe) => {
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

  const handleAddSingleItem = async (itemOrBarcode: string) => {
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

  return (
    <div className="pb-24 md:pb-8 animate-fade-in">
       <div className="bg-gradient-to-br from-orange-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-3xl mb-6 border border-orange-100 dark:border-gray-700 flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">مطبخ جوده 👩‍🍳</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              وصفات لذيذة ومجرّبة بمنتجاتنا الخالية من الجلوتين
            </p>
        </div>
        <button 
          onClick={loadRecipes} 
          disabled={loading}
          className="bg-white dark:bg-gray-700 p-2 rounded-full shadow-sm text-gray-500 hover:text-orange-600 transition-colors disabled:animate-spin"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
         <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
             <div key={i} className="bg-warm-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-24 animate-pulse">
             </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-3xl border border-red-100 dark:border-red-900/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">حصلت مشكلة وما قدرنا نحمّل الوصفات</h3>
          <button 
            onClick={loadRecipes}
            className="bg-orange-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-orange-700 mt-3"
          >
            جرب مرة ثانية
          </button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
           <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
           <p className="text-gray-500 font-bold text-sm">ما في وصفات متوفرة حالياً</p>
        </div>
      ) : (
        <div className="space-y-4">
            {recipes.map((recipe, index) => {
                const youtubeId = recipe.videoUrl ? getYouTubeEmbedId(recipe.videoUrl) : null;
                const isExpanded = expandedId === recipe.id;

                return (
                <div 
                key={recipe.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all ${isExpanded ? 'md:row-span-2' : ''}`}
                >
                {/* Card Header */}
                <button 
                    onClick={() => toggleExpand(recipe.id)}
                    className="w-full p-4 text-right flex items-start gap-4"
                >
                    <div className={`shrink-0 w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative`}>
                      <AppImage
                        src={recipe.image}
                        alt={recipe.title}
                        priority={index === 0}
                        className="w-full h-full object-cover"
                        fallback={<ChefHat className={`w-8 h-8 ${isExpanded ? 'text-brand-600' : 'text-orange-400'}`} />}
                      />
                      {/* Video Indicator Icon on thumbnail */}
                      {recipe.videoUrl && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <PlayCircle className="w-8 h-8 text-white opacity-90" />
                          </div>
                      )}
                    </div>
                    <div className="flex-1">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base mb-1">{recipe.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{recipe.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {recipe.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.time}</span>}
                        {recipe.calories && <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {recipe.calories}</span>}
                    </div>
                    </div>
                    <div className="mt-2 text-gray-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="px-4 pb-5 pt-0 animate-fade-in">
                    <div className="h-px w-full bg-gray-100 dark:bg-gray-700 mb-4"></div>

                     {/* VIDEO SECTION */}
                     {recipe.videoUrl && (
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <PlayCircle className="w-4 h-4 text-red-500" />
                                شرح بالفيديو 📹
                            </h4>
                            {youtubeId ? (
                                <div className="w-full aspect-video rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-black">
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
                                    href={recipe.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm text-gray-800 dark:text-white">
                                            <PlayCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">شغل الفيديو</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">اضغط عشان تفتح الفيديو وتشوف الطريقة</p>
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-brand-600" />
                                </a>
                            )}
                        </div>
                     )}
                    
                    {/* Main Product Badge */}
                    {recipe.mainProduct && (
                        <div className="bg-brand-50/60 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/30 rounded-xl p-3 mb-4 flex items-center justify-between">
                            <div>
                            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold block mb-0.5">المنتج الأساسي</span>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{productNames[recipe.mainProduct] || recipe.mainProduct}</span>
                            </div>
                            <button 
                            onClick={() => handleAddSingleItem(recipe.mainProduct)}
                            className="bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 px-3 py-1.5 rounded-lg shadow-sm hover:scale-105 transition-transform flex items-center gap-1 text-xs font-bold border border-brand-250 dark:border-brand-900"
                            >
                            <Plus className="w-3 h-3" />
                            <span>أضف للسلة</span>
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {recipe.ingredients.length > 0 && (
                            <div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">المقادير:</h4>
                            <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-300 space-y-1 marker:text-brand-400">
                                {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                            </ul>
                            </div>
                        )}
                        {recipe.steps.length > 0 && (
                            <div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">طريقة العمل:</h4>
                            <ol className="list-decimal list-inside text-xs text-gray-600 dark:text-gray-300 space-y-2 marker:text-gray-400 marker:font-bold">
                                {recipe.steps.map((step, i) => <li key={i} className="leading-relaxed">{step}</li>)}
                            </ol>
                            </div>
                        )}
                    </div>
                    
                    {(recipe.mainProduct || (recipe.bundleItems && recipe.bundleItems.length > 0)) && (
                        <div className="mt-6">
                            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4">
                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                    <PackageCheck className="w-4 h-4 text-orange-600" />
                                    مقادير الوصفة كاملة
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                    أضف كل المقادير المتوفرة بضغطة واحدة وسهّل على نفسك
                                </p>
                                
                                {getBundleDisplayNames(recipe).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {getBundleDisplayNames(recipe).map((name, idx) => (
                                            <span key={idx} className="text-[10px] bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <button 
                                    onClick={() => handleBuyBundle(recipe)} 
                                    className="inline-flex items-center justify-center gap-2 w-full bg-gray-900 dark:bg-orange-600 hover:bg-gray-800 dark:hover:bg-orange-700 text-white py-3.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-orange-100 dark:shadow-none"
                                >
                                    <span>أضف المقادير للسلة 🛒</span>
                                    <ShoppingBag className="w-4 h-4" />
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
