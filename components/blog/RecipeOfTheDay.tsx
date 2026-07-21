import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Clock, Flame, ChefHat, Sparkles, Heart, Play, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { fetchRecipesFromSupabase, Recipe } from '../../services/supabaseService';
import { AppImage } from '../ui/AppImage';
import {
  formatRecipeAddSummary,
  getRecipeRawItems,
  loadRecipeCartCandidates,
  planRecipeCartAdditions,
} from '../../utils/recipeCartUtils';

const RECIPE_IDX_KEY = 'jouda_recipe_idx_v2';
const RECIPE_DATE_KEY = 'jouda_recipe_date_v2';
const LEGACY_RECIPE_LIST_KEY = 'jouda_recipe_list_v2';
const FAVORITES_KEY = 'jouda_recipe_favorites_v1';

const DIFFICULTY_COLORS: Record<string, string> = {
  'سهل': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'متوسط': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'صعب': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export const RecipeOfTheDay: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const mouseStartX = useRef(0);
  const swipedRef = useRef(false);
  const { items: cartItems, addToCartWithBarcode } = useCart();

  const recipe = recipes[currentIndex] || null;

  const saveFavorites = (list: string[]) => {
    setFavorites(list);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  };

  const toggleFavorite = useCallback((e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = favorites.includes(recipeId)
      ? favorites.filter(id => id !== recipeId)
      : [...favorites, recipeId];
    saveFavorites(updated);
  }, [favorites]);

  const isFavorite = useCallback((recipeId: string) => favorites.includes(recipeId), [favorites]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) setFavorites(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      const cachedDate = localStorage.getItem(RECIPE_DATE_KEY);
      const today = new Date().toDateString();
      localStorage.removeItem(LEGACY_RECIPE_LIST_KEY);

      try {
        const data = await fetchRecipesFromSupabase();
        if (data.length > 0) {
          let idx = 0;
          if (cachedDate === today) {
            const cachedIdx = Number.parseInt(localStorage.getItem(RECIPE_IDX_KEY) || '', 10);
            idx = Number.isInteger(cachedIdx) && cachedIdx >= 0 && cachedIdx < data.length
              ? cachedIdx
              : 0;
          } else {
            const dayOfYear = Math.floor(
              (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
              (1000 * 60 * 60 * 24)
            );
            idx = dayOfYear % data.length;
          }
          setRecipes(data);
          setCurrentIndex(idx);
          localStorage.setItem(RECIPE_IDX_KEY, String(idx));
          localStorage.setItem(RECIPE_DATE_KEY, today);
        }
      } catch (e) {
        console.error('Failed to load recipes', e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const updateIndex = (newIdx: number) => {
    setCurrentIndex(newIdx);
    localStorage.setItem(RECIPE_IDX_KEY, String(newIdx));
  };

  const goToPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateIndex((currentIndex - 1 + recipes.length) % recipes.length);
  };

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateIndex((currentIndex + 1) % recipes.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    swipedRef.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      swipedRef.current = true;
      if (diff > 0) updateIndex((currentIndex + 1) % recipes.length);
      else updateIndex((currentIndex - 1 + recipes.length) % recipes.length);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    swipedRef.current = false;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const diff = mouseStartX.current - e.clientX;
    if (Math.abs(diff) > 60) {
      swipedRef.current = true;
      if (diff > 0) updateIndex((currentIndex + 1) % recipes.length);
      else updateIndex((currentIndex - 1 + recipes.length) % recipes.length);
    }
  };

  const handleCardClick = () => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    navigate('/recipes');
  };

  const handleBuyIngredients = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!recipe) return;
    const rawItems = getRecipeRawItems(recipe);

    if (rawItems.length === 0) {
      alert("عذراً، لا توجد منتجات محددة لهذه الوصفة في المتجر حالياً.");
      return;
    }

    try {
      const { candidates, notFound } = await loadRecipeCartCandidates(rawItems);
      const plan = planRecipeCartAdditions(candidates, cartItems, notFound);

      for (const product of plan.addable) {
        addToCartWithBarcode(product);
      }

      const summary = formatRecipeAddSummary(plan.addable.length, plan.skipped);
      if (summary) {
        alert(summary);
      }
    } catch {
      alert("عذراً، ما قدرنا نتحقق من توفر مقادير الوصفة حالياً.");
    }
  };

  if (loading) return (
    <div className="w-full h-[320px] bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer" />
    </div>
  );

  if (!recipe) return null;

  const difficultyColor = DIFFICULTY_COLORS[recipe.difficulty] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  const fav = isFavorite(recipe.id);
  const hasVideo = !!recipe.videoUrl;

  return (
    <div className="w-full relative">
      {/* Navigation + Counter */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tabular-nums">
          {currentIndex + 1} / {recipes.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrev}
            className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="الوصفة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToNext}
            className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="الوصفة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card */}
      <div
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
        className="w-full relative h-[320px] rounded-3xl overflow-hidden shadow-lg group cursor-pointer border border-gray-100 dark:border-gray-800 select-none transition-shadow hover:shadow-xl"
      >
        {/* Background Image */}
        <AppImage
          src={recipe.image}
          alt={recipe.title}
          decoding="async"
          priority
          draggable={false}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
          fallback={<div className="w-full h-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center"><ChefHat className="w-20 h-20 text-orange-300 dark:text-orange-500/50" /></div>}
        />

        {/* Video Play Overlay */}
        {hasVideo && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center shadow-xl">
              <Play className="w-7 h-7 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Top Badges Row */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={(e) => toggleFavorite(e, recipe.id)}
            className={`p-2.5 rounded-full backdrop-blur-sm shadow-lg transition-all active:scale-90 ${
              fav
                ? 'bg-red-500/90 text-white'
                : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-red-500'
            }`}
            aria-label={fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          >
            <Heart className={`w-5 h-5 ${fav ? 'fill-white' : ''}`} />
          </button>

          <div className="bg-brand-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3 fill-yellow-200 text-yellow-200" />
            <span>وصفة اليوم المقترحة</span>
          </div>
        </div>

        {/* Content */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
          <h3 className="text-2xl font-black mb-1.5 leading-tight text-white drop-shadow-md">
            {recipe.title}
          </h3>

          <p className="text-sm text-gray-200 line-clamp-2 mb-3 opacity-90 font-medium leading-relaxed">
            {recipe.description}
          </p>

          {/* Metadata Badges */}
          <div className="flex items-center gap-2 text-xs text-gray-300 mb-4 font-bold flex-wrap">
            {recipe.time && (
              <span className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5 text-orange-400" /> {recipe.time}
              </span>
            )}
            {recipe.calories && (
              <span className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> {recipe.calories}
              </span>
            )}
            {recipe.difficulty && (
              <span className={`flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm ${difficultyColor}`}>
                <BarChart3 className="w-3.5 h-3.5" /> {recipe.difficulty}
              </span>
            )}
          </div>

          <button
            onClick={handleBuyIngredients}
            className="w-full bg-white text-gray-900 hover:bg-orange-50 active:scale-95 transition-all py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-black/20"
          >
            <ShoppingBag className="w-5 h-5 text-brand-600" />
            <span>شراء المكونات ({recipe.bundleItems ? recipe.bundleItems.length + (recipe.mainProduct ? 1 : 0) : 1})</span>
          </button>
        </div>
      </div>

      {/* Dot Indicators */}
      {recipes.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {recipes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => updateIndex(idx)}
              className={`rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-5 h-2 bg-brand-600'
                  : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              aria-label={`الوصفة ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
