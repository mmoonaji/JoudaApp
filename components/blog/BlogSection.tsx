
import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ArrowRight } from 'lucide-react';
import { fetchArticlesFromSupabase, Article } from '../../services/supabaseService';
import { ArticleModal } from '../modals/ArticleModal';
import { AppImage } from '../ui/AppImage';

export const BlogSection: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchArticlesFromSupabase();
      setArticles(data.slice(0, 4)); // Show max 4 latest
      setLoading(false);
    };
    load();
  }, []);

  if (!loading && articles.length === 0) return null;

  return (
    <>
      <div className="w-full mt-8 animate-fade-in">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="bg-sky-100 dark:bg-sky-900/30 p-1.5 rounded-lg">
              <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">جديد مدونة جوده 📰</h3>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 hide-scrollbar">
             {[1, 2].map(i => (
                <div key={i} className="min-w-[260px] h-32 bg-warm-100 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
             ))}
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-6 -mx-4 px-4 gap-3 snap-x snap-mandatory hide-scrollbar">
            {articles.map((article, index) => (
              <div 
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="min-w-[260px] w-[260px] snap-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.98] flex flex-col"
              >
                {/* Image */}
                 <div className="h-28 w-full bg-gray-200 dark:bg-gray-700 relative">
                    <AppImage
                      src={article.image}
                      alt={article.title}
                      priority={index === 0}
                      className="w-full h-full object-cover"
                      fallback={<div className="w-full h-full flex items-center justify-center bg-sky-50 dark:bg-sky-900/20"><BookOpen className="w-8 h-8 text-sky-200" /></div>}
                    />
                   <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
                   <span className="absolute bottom-2 right-2 text-[10px] text-white font-medium bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
                     {article.date}
                   </span>
                </div>

                {/* Content */}
                <div className="p-3 flex flex-1 flex-col justify-between">
                   <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 line-clamp-2 mb-2 leading-snug">
                     {article.title}
                   </h4>
                   <div className="flex items-center justify-end text-sky-600 dark:text-sky-400 text-xs font-bold gap-1">
                      <span>اقرأ المزيد</span>
                      <ChevronLeft className="w-3 h-3" />
                   </div>
                </div>
              </div>
            ))}
            <div className="w-2 shrink-0"></div>
          </div>
        )}
      </div>

      {selectedArticle && (
        <ArticleModal 
          article={selectedArticle} 
          onClose={() => setSelectedArticle(null)} 
        />
      )}
    </>
  );
};
