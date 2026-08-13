import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChefHat, ArrowLeft } from 'lucide-react';
import { fetchRecipePreviewsFromSupabase, Recipe } from '../../services/supabaseService';
import { AppImage } from '../ui/AppImage';

const RECIPE_IDX_KEY = 'jouda_recipe_idx_v2';
const LEGACY_RECIPE_LIST_KEY = 'jouda_recipe_list_v2';

export const TrendingRecipes: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        localStorage.removeItem(LEGACY_RECIPE_LIST_KEY);
        const list = await fetchRecipePreviewsFromSupabase();

        if (list.length > 0) {
          const todayIdxStr = localStorage.getItem(RECIPE_IDX_KEY);
          const todayIdx = todayIdxStr ? parseInt(todayIdxStr, 10) : 0;
          const filtered = list
            .filter((_, idx) => idx !== todayIdx)
            .slice(0, 6);
          setRecipes(filtered);
        }
      } catch {
        /* silent */
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleCardClick = () => {
    navigate('/recipes');
  };

  const handleViewAll = () => {
    navigate('/recipes');
  };

  if (loading) return (
    <div className="flex gap-3 overflow-hidden px-1">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="min-w-[260px] h-[280px] bg-gray-50 dark:bg-gray-800/40 rounded-3xl animate-pulse shrink-0" />
      ))}
    </div>
  );

  if (recipes.length === 0) return null;

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <span className="text-brand-600">🔥</span>
          <span>وصفات رائجة</span>
        </h3>
      </div>

      {/* Scrollable Cards */}
      <div
        className="flex gap-3 overflow-x-auto pb-6 pt-1 px-1 -mx-1 scrollbar-hide snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {recipes.map((recipe, index) => {
          return (
            <div
              key={recipe.id}
              onClick={handleCardClick}
              className="min-w-[260px] max-w-[260px] bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-md transition-all duration-300 cursor-pointer group snap-center shrink-0 flex flex-col overflow-hidden active:scale-[0.98]"
            >
              {/* Image */}
              <div className="relative h-40 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-t-[1.5rem]">
                <AppImage
                  src={recipe.image}
                  alt={recipe.title}
                  priority={index === 0}
                  draggable={false}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  fallback={<div className="w-full h-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center"><ChefHat className="w-10 h-10 text-orange-300 dark:text-orange-500/50" /></div>}
                />
                {recipe.videoUrl && (
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <span className="text-white text-[8px]">▶</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1 relative text-right">
                <h4 className="font-black text-[14px] text-gray-900 dark:text-white line-clamp-2 leading-snug mb-3">
                  {recipe.title}
                </h4>

                {/* Clean Metadata Line */}
                <div className="flex items-center justify-between text-[12px] font-bold text-gray-400 dark:text-gray-500 mt-auto pt-3 border-t border-gray-100 dark:border-gray-800/50">
                  {recipe.time && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {recipe.time}
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span className="flex items-center gap-1.5">
                       <ChefHat className="w-3.5 h-3.5" /> {recipe.difficulty}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* "عرض الكل" Link at the end */}
        <button
          onClick={handleViewAll}
          className="min-w-[120px] max-w-[120px] h-[280px] bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-3xl transition-all cursor-pointer snap-center shrink-0 flex flex-col items-center justify-center gap-3 group border border-transparent"
        >
          <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-gray-100 dark:border-gray-700">
             <ArrowLeft className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
          </div>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            عرض الكل
          </span>
        </button>
      </div>
    </div>
  );
};
