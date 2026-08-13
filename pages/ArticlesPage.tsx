import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Calendar, Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchArticlesFromSupabase, Article } from '../services/supabaseService';
import { AppImage } from '../components/ui/AppImage';

export const ArticlesPage: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await fetchArticlesFromSupabase();
      setArticles(data);
      setLoading(false);
    };
    load();
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.content.toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  return (
    <div className="w-full pb-24 animate-fade-in">
      {/* Header */}
      <div className="relative z-30">
        <div className="pt-0 pb-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-brand-600 dark:text-brand-500 hover:bg-brand-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                المقالات والمعرفة
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                نصائح ومعلومات تهمّك لنمط حياة صحي وخالي من الجلوتين
              </p>
            </div>
          </div>
          
          {/* System Search Bar */}
          <div className="relative mt-2">
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="ابحث عن موضوع يهمك..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3 pr-11 pl-4 text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      <div className="py-4 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 h-[280px] rounded-3xl animate-pulse border border-gray-100 dark:border-gray-700"></div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-brand-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-brand-300 dark:text-gray-600" />
            </div>
            <p className="text-lg font-bold text-gray-500 dark:text-gray-400">ما لقينا مقالات تطابق اللي تبحث عنه</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {filteredArticles.map((article, index) => (
              <div 
                key={article.id}
                onClick={() => navigate(`/articles/${article.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group active:scale-[0.98] flex flex-col"
              >
                <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
                  <AppImage
                    src={article.image}
                    alt={article.title}
                    priority={index === 0}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-brand-50 dark:bg-gray-900/50">
                        <BookOpen className="w-8 h-8 md:w-12 md:h-12 text-brand-200 dark:text-gray-700" />
                      </div>
                    }
                  />
                  {/* Subtle overlay only on hover for image protection */}
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                <div className="p-3 md:p-5 flex-1 flex flex-col">
                  <h4 className="font-bold text-[13px] md:text-lg text-gray-900 dark:text-white line-clamp-2 leading-snug mb-3 md:mb-4">
                    {article.title}
                  </h4>
                  
                  <div className="mt-auto flex items-center text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg md:rounded-xl border border-gray-100 dark:border-gray-700 truncate max-w-full">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 shrink-0" /> {article.date}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
