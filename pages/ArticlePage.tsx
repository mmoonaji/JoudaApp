import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ChevronRight, Calendar, User, Share2, BookOpen } from 'lucide-react';
import { fetchArticleFromSupabase, Article } from '../services/supabaseService';
import { AppImage } from '../components/ui/AppImage';

/* ── tiny helper: set or restore a single <meta> tag ── */
const setMeta = (attr: string, key: string, content: string) => {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

export const ArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [theme, setTheme] = useState<'default' | 'sepia'>('default');

  /* ── fetch article ── */
  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }

    let cancelled = false;
    const load = async () => {
      const data = await fetchArticleFromSupabase(id);
      if (cancelled) return;
      if (data) {
        setArticle(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  /* ── dynamic document title & OG meta ── */
  useEffect(() => {
    if (!article) return;
    const prevTitle = document.title;
    document.title = `${article.title} | جوده`;

    setMeta('property', 'og:title', article.title);
    setMeta('property', 'og:description', article.content.slice(0, 160).replace(/[#*_\n]/g, ''));
    if (article.image) setMeta('property', 'og:image', article.image);
    setMeta('property', 'og:url', window.location.href);

    return () => { document.title = prevTitle; };
  }, [article]);

  /* ── scroll progress ── */
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((scrollY / totalScroll) * 100);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── share ── */
  const handleShare = async () => {
    if (!article) return;
    const shareUrl = `${window.location.origin}/articles/${article.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: `شوف هذا المقال المفيد من مدونة جوده: ${article.title}`,
          url: shareUrl,
        });
      } catch (_) { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (_) { /* ignore */ }
    }
  };

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="w-full animate-fade-in pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Top Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          </div>

          <div className="rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            {/* Hero image skeleton */}
            <div className="relative h-56 sm:h-72 bg-gray-200 dark:bg-gray-800 animate-pulse" />

            {/* Reader Controls Glass Pill skeleton */}
            <div className="px-4 sm:px-6 -mt-6 z-20 relative flex justify-center">
              <div className="w-64 h-10 sm:h-11 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse border border-white/50 dark:border-gray-700/50" />
            </div>

            {/* Article body skeleton */}
            <div className="px-5 sm:px-8 pt-8 pb-12">
              {/* Title & meta skeleton */}
              <div className="mb-8 flex flex-col items-center">
                <div className="h-8 w-3/4 max-w-sm bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-4" />
                <div className="flex items-center gap-4">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                  <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                </div>
              </div>

              {/* Text lines skeleton */}
              <div className="space-y-4">
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800/60 rounded-lg animate-pulse mt-8" />
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800/60 rounded-lg animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-100 dark:bg-gray-800/60 rounded-lg animate-pulse" />
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800/60 rounded-lg animate-pulse" />
                <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800/60 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── not found ── */
  if (notFound || !article) {
    return (
      <div className="w-full pb-24 animate-fade-in">
        <div className="pt-0 pb-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/articles')}
              className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-brand-600 dark:text-brand-500 hover:bg-brand-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">المقالات</h1>
          </div>

          <div className="text-center py-20 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-brand-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-10 h-10 text-brand-300 dark:text-gray-600" />
            </div>
            <p className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-2">
              ما لقينا هذي المقالة
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              يمكن تم حذفها أو الرابط غلط
            </p>
            <button
              onClick={() => navigate('/articles')}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-colors active:scale-95"
            >
              تصفح جميع المقالات
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── article content ── */
  return (
    <div className="w-full animate-fade-in pb-24">
      {/* Progress Bar (Fixed to top of screen) */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-black/5 dark:bg-white/5 z-50">
        <div
          className="h-full bg-brand-500 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/articles')}
            className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-brand-600 dark:text-brand-500 hover:bg-brand-50 dark:hover:bg-gray-700 transition-colors active:scale-95 shadow-sm border border-gray-100 dark:border-gray-800"
            aria-label="رجوع"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95 shadow-sm border border-gray-100 dark:border-gray-800"
            aria-label="مشاركة المقال"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`rounded-[2rem] overflow-hidden transition-colors duration-500 shadow-sm border border-gray-100 dark:border-gray-800 ${
            theme === 'sepia' ? 'bg-[#fbf4e6] border-[#e8dcc4]' : 'bg-white dark:bg-gray-900'
          }`}
        >
          {/* Hero image */}
          <div className="relative">
            <div className={`relative h-56 sm:h-72 bg-gray-200 dark:bg-gray-800 overflow-hidden`}>
              <AppImage
                src={article.image}
                alt={article.title}
                priority
                className="w-full h-full object-cover"
                fallback={
                  <div className="w-full h-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <span className="text-brand-300 font-black text-4xl opacity-50">جوده</span>
                  </div>
                }
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </div>
          </div>

          {/* Reader Controls Glass Pill */}
          <div className="px-4 sm:px-6 -mt-6 z-20 relative flex justify-center">
            <div className={`flex items-center gap-4 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full backdrop-blur-md shadow-lg transition-colors duration-300 ${
              theme === 'sepia'
                ? 'bg-[#fbf4e6]/95 border border-[#e8dcc4]'
                : 'bg-white/95 dark:bg-gray-800/95 border border-gray-100 dark:border-gray-700'
            }`}>
              <button
                onClick={() => setTheme(prev => prev === 'sepia' ? 'default' : 'sepia')}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  theme === 'sepia'
                    ? 'bg-[#e4d5b7] text-[#5b4636] shadow-inner'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                }`}
              >
                {theme === 'sepia' ? 'المظهر المعتاد' : 'وضع القراءة 📖'}
              </button>

              <div className={`w-px h-5 ${theme === 'sepia' ? 'bg-[#d8ccb4]' : 'bg-gray-200 dark:bg-gray-700'}`} />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFontSize(prev => prev === 'sm' ? 'sm' : prev === 'base' ? 'sm' : 'base')}
                  className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm sm:text-base transition-colors ${
                    theme === 'sepia'
                      ? 'hover:bg-[#e8dcc4] text-[#5b4636]'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >A-</button>
                <button
                  onClick={() => setFontSize(prev => prev === 'lg' ? 'lg' : prev === 'base' ? 'lg' : 'base')}
                  className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-base sm:text-lg transition-colors ${
                    theme === 'sepia'
                      ? 'hover:bg-[#e8dcc4] text-[#5b4636]'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >A+</button>
              </div>
            </div>
          </div>

          {/* Article body */}
          <div className="px-5 sm:px-8 pt-8 pb-12">
            {/* Title & meta */}
            <div className="mb-8 text-center">
              <h1 className={`text-xl sm:text-2xl font-bold mb-4 leading-snug ${
                theme === 'sepia' ? 'text-[#3a2818]' : 'text-gray-900 dark:text-white'
              }`}>
                {article.title}
              </h1>

              <div className="flex items-center justify-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>{article.author}</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{article.date}</span>
                </div>
              </div>
            </div>


          {/* Markdown content */}
          <div className={`
            prose max-w-none transition-all duration-300
            ${fontSize === 'sm' ? 'prose-sm' : fontSize === 'base' ? 'prose-base' : 'prose-lg'}
            ${theme === 'sepia'
              ? 'prose-headings:text-[#4a3623] text-[#5b4636] prose-p:text-[#5b4636] prose-li:text-[#5b4636] prose-strong:text-[#4a3623]'
              : 'dark:prose-invert prose-headings:font-bold text-gray-800 dark:text-gray-200 prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-li:text-gray-600 dark:prose-li:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white'
            }
            prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm
            prose-strong:font-bold
            [&_p]:leading-relaxed [&_li]:leading-relaxed
            [&_br]:block [&_br]:mb-6 [&_br]:content-['']
          `}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {article.content}
            </ReactMarkdown>
          </div>

          {/* Bottom share CTA */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col items-center gap-4">
            <p className={`text-sm font-bold ${
              theme === 'sepia' ? 'text-[#5b4636]' : 'text-gray-500 dark:text-gray-400'
            }`}>
              عجبك المقال؟ شاركه مع اللي يهمك أمرهم 💚
            </p>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-colors active:scale-95 shadow-lg shadow-brand-600/20"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة المقال</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
