import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BookOpen, Calendar, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchArticleFromSupabase, fetchArticlePreviewsFromSupabase, Article } from '../services/supabaseService';

const ArticleModal = lazy(() => import('../components/modals/ArticleModal').then((module) => ({
  default: module.ArticleModal,
})));

export const KnowledgeHub: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchArticlePreviewsFromSupabase();
      setArticles(data.slice(0, 5));
      setLoading(false);
    };
    load();
  }, []);

  const openArticle = async (preview: Article) => {
    const article = await fetchArticleFromSupabase(preview.id);
    setSelectedArticle(article || preview);
  };

  useEffect(() => {
    if (articles.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev === articles.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [activeIndex, articles.length]);

  const handlePrev = () => {
    if (articles.length === 0) return;
    setActiveIndex((prev) => (prev === 0 ? articles.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (articles.length === 0) return;
    setActiveIndex((prev) => (prev === articles.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-1.5 mb-5 px-1 text-right">
        <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-brand-600">💡</span>
          <span>تعرّف على الجلوتين</span>
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold leading-relaxed max-w-sm">
          كل اللي تحتاجه لفهم حساسية الجلوتين (السيلياك)، مع نصائح وبدائل غذائية تخلّي حياتك أسهل وبدون تعب.
        </p>
      </div>

      {/* Content Area */}
      <div className="min-h-[350px] overflow-visible">
        {loading ? (
          <div className="flex justify-center items-center h-[280px]">
            <div className="w-12 h-[200px] bg-gray-50 dark:bg-gray-800/40 rounded-2xl animate-pulse mx-2"></div>
            <div className="w-[180px] h-[240px] bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse shadow-sm mx-2"></div>
            <div className="w-12 h-[200px] bg-gray-50 dark:bg-gray-800/40 rounded-2xl animate-pulse mx-2"></div>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">لا توجد مقالات حالياً</div>
        ) : (
          <div className="flex flex-col items-center gap-4 animate-fade-in overflow-visible">
            {/* 3D Stacked Cards Deck Carousel */}
            <div className="relative w-full max-w-sm mx-auto h-[300px] flex items-center justify-center overflow-visible select-none">
              {/* Navigation Left Arrow (Only on non-tiny screens) */}
              <button 
                onClick={handlePrev}
                className="absolute left-1 z-40 bg-white/90 dark:bg-gray-850/90 border border-gray-150 dark:border-gray-700 shadow-md p-2 rounded-full active:scale-90 transition-transform hidden sm:flex items-center justify-center text-gray-700 dark:text-gray-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Cards Deck */}
              <div 
                className="relative w-full h-full flex items-center justify-center overflow-visible"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {articles.map((article, index) => {
                  const diff = index - activeIndex;

                  let positionClass = "";

                  if (diff === 0) {
                    // Center Active Card
                    positionClass = "scale-100 translate-x-0 opacity-100 z-30 pointer-events-auto blur-none";
                  } else if (diff === -1 || (diff === articles.length - 1 && activeIndex === 0)) {
                    // Left Stacked Card
                    positionClass = "scale-[0.83] -translate-x-[26%] opacity-60 z-20 pointer-events-auto blur-[0.5px]";
                  } else if (diff === 1 || (diff === -(articles.length - 1) && activeIndex === articles.length - 1)) {
                    // Right Stacked Card
                    positionClass = "scale-[0.83] translate-x-[26%] opacity-60 z-20 pointer-events-auto blur-[0.5px]";
                  } else {
                    // Offscreen hidden Card
                    positionClass = "scale-75 opacity-0 z-10 pointer-events-none invisible translate-x-0";
                  }

                  return (
                    <div
                      key={article.id}
                      onClick={() => {
                        if (diff === 0) {
                          openArticle(article);
                        } else {
                          setActiveIndex(index);
                        }
                      }}
                      className={`absolute w-[230px] h-[280px] bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100/90 dark:border-gray-800/80 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_25px_-10px_rgba(0,0,0,0.5)] p-4 flex flex-col justify-between cursor-pointer transition-all duration-500 ease-out select-none ${positionClass}`}
                    >
                      {/* Thumbnail Block */}
                      <div className="w-full h-[120px] rounded-[1.5rem] bg-gray-50 dark:bg-gray-850 overflow-hidden relative border border-gray-100/40 dark:border-gray-800/30">
                        {article.image ? (
                          <img src={article.image} alt={article.title} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-brand-50/50 dark:bg-brand-950/10">
                            <BookOpen className="w-10 h-10 text-brand-300 dark:text-brand-700/60" />
                          </div>
                        )}
                        <span className="absolute top-2 right-2 text-[9px] font-black text-brand-600 dark:text-brand-400 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
                          💡 مقالة
                        </span>
                      </div>

                      {/* Content Block */}
                      <div className="flex-1 flex flex-col justify-between pt-3 text-right">
                        <h4 className="font-black text-[12.5px] text-gray-900 dark:text-white line-clamp-3 leading-snug">
                          {article.title}
                        </h4>

                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-2 border-t border-gray-50 dark:border-gray-850 pt-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{article.date}</span>
                          </div>
                          <span className="text-brand-600 dark:text-brand-400 font-extrabold flex items-center gap-0.5">
                            اقرأ الآن <ArrowLeft className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Right Arrow (Only on non-tiny screens) */}
              <button 
                onClick={handleNext}
                className="absolute right-1 z-40 bg-white/90 dark:bg-gray-850/90 border border-gray-150 dark:border-gray-700 shadow-md p-2 rounded-full active:scale-90 transition-transform hidden sm:flex items-center justify-center text-gray-700 dark:text-gray-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center items-center gap-1.5 mt-1">
              {articles.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 rounded-full transition-all duration-350 ${index === activeIndex ? 'w-5 bg-brand-600 dark:bg-brand-500 shadow-sm shadow-brand-500/25' : 'w-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-650'}`}
                />
              ))}
            </div>

            {/* "عرض الكل" Button at the bottom of the list */}
            <button
              onClick={() => navigate('/articles')}
              className="w-full max-w-xs h-11 bg-white dark:bg-gray-900 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-[1.25rem] border border-dashed border-gray-200 dark:border-gray-800 hover:border-brand-500 hover:border-solid transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.99] mt-2"
            >
              <span className="font-bold text-xs text-gray-700 dark:text-gray-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">عرض جميع المقالات</span>
              <ArrowLeft className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:-translate-x-1 transition-all" />
            </button>
          </div>
        )}
      </div>

      {selectedArticle && (
        <Suspense fallback={null}>
          <ArticleModal
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
          />
        </Suspense>
      )}
    </div>
  );
};
