import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { X, Calendar, User, Share2, Check } from 'lucide-react';
import { Article } from '../../services/supabaseService';
import { useScrollLock, useBackButton } from '../../hooks/index';
import { buildArticleShareUrl, formatArticleShareIntro, executeShare } from '../../utils/shareUtils';
import { AppImage } from '../ui/AppImage';

interface ArticleModalProps {
  article: Article;
  onClose: () => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({ article, onClose }) => {
  // Handle android back button
  useBackButton(true, onClose);

  // Lock body scroll when modal is open
  useScrollLock(true);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [theme, setTheme] = useState<'default' | 'sepia'>('default');
  const [copied, setCopied] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const currentScrollY = target.scrollTop;
    
    // Progress
    const totalScroll = target.scrollHeight - target.clientHeight;
    if (totalScroll > 0) {
      setScrollProgress((currentScrollY / totalScroll) * 100);
    }
  };

  const handleShare = async () => {
    const shareUrl = buildArticleShareUrl(article.id);
    const shareIntro = formatArticleShareIntro(article.title);

    await executeShare({
      title: article.title,
      text: shareIntro,
      url: shareUrl,
      onCopied: () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
    });
  };

  // Pass the raw content directly so Markdown plugins can parse tables and lists correctly.
  const formattedContent = article.content;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex justify-center bg-black/60 backdrop-blur-sm animate-fade-in" style={{ overscrollBehavior: 'contain' }}>
      <div className={`w-full max-w-md h-[100dvh] overflow-hidden shadow-2xl relative flex flex-col animate-slide-up-mobile border-x transition-colors duration-500 ${theme === 'sepia' ? 'bg-[#fbf4e6] border-[#e8dcc4]' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/5 z-50">
          <div 
            className="h-full bg-brand-500 transition-all duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Floating Share Button (Always Visible) */}
        <div className="absolute top-8 left-8 z-[60]">
          <button 
            onClick={handleShare}
            className={`backdrop-blur-md p-2.5 rounded-full shadow-lg transition-all duration-300 active:scale-90 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-900/40 hover:bg-gray-900/60 text-white'
            }`}
            aria-label={copied ? "تم نسخ الرابط" : "مشاركة المقال"}
            title={copied ? "تم نسخ الرابط بنجاح" : "مشاركة المقال"}
          >
            {copied ? <Check className="w-5 h-5 animate-scale-in" /> : <Share2 className="w-5 h-5" />}
          </button>
          {copied && (
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap animate-fade-in pointer-events-none z-50">
              تم نسخ الرابط!
            </span>
          )}
        </div>

        {/* Floating Close Button (Always Visible) */}
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 z-[60] bg-gray-900/40 hover:bg-gray-900/60 backdrop-blur-md p-2.5 rounded-full text-white shadow-lg transition-all duration-300 active:scale-90"
          aria-label="إغلاق المقال"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Fixed Header: Image + Controls */}
        <div className="shrink-0 flex flex-col z-10 relative">
          <div className={`relative h-44 sm:h-52 mx-4 mt-4 bg-gray-200 dark:bg-gray-800 transition-colors duration-500 rounded-[2rem] overflow-hidden shadow-sm`}>
            <AppImage
              src={article.image}
              alt={article.title}
              loading="lazy"
              className="w-full h-full object-cover"
              fallback={<div className="w-full h-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center"><span className="text-brand-300 font-black text-4xl opacity-50">جوده</span></div>}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          </div>
          
          {/* Reader Controls Glass Pill */}
          <div className="px-6 -mt-5 z-20 relative flex justify-center">
              <div className={`flex items-center gap-5 px-5 py-2.5 rounded-full backdrop-blur-md shadow-2xl transition-colors duration-300 ${theme === 'sepia' ? 'bg-[#fbf4e6]/90 border border-[#e8dcc4]' : 'bg-white/90 dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700'}`}>
                 <button 
                   onClick={() => setTheme(prev => prev === 'sepia' ? 'default' : 'sepia')}
                   className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${theme === 'sepia' ? 'bg-[#e4d5b7] text-[#5b4636] shadow-inner' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'}`}
                 >
                   {theme === 'sepia' ? 'المظهر المعتاد' : 'وضع القراءة 📖'}
                 </button>
                 
                 <div className={`w-px h-5 ${theme === 'sepia' ? 'bg-[#d8ccb4]' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                 
                 <div className="flex items-center gap-1">
                    <button onClick={() => setFontSize(prev => prev === 'sm' ? 'sm' : prev === 'base' ? 'sm' : 'base')} className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm transition-colors ${theme === 'sepia' ? 'hover:bg-[#e8dcc4] text-[#5b4636]' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>A-</button>
                    <button onClick={() => setFontSize(prev => prev === 'lg' ? 'lg' : prev === 'base' ? 'lg' : 'base')} className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-lg transition-colors ${theme === 'sepia' ? 'hover:bg-[#e8dcc4] text-[#5b4636]' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>A+</button>
                 </div>
              </div>
          </div>
        </div>

        {/* Content */}
        <div 
           ref={scrollContainerRef}
           onScroll={handleScroll}
           className={`flex-1 overflow-y-auto px-6 pt-6 pb-6 transition-colors duration-500 ${theme === 'sepia' ? 'bg-[#fbf4e6]' : 'bg-white dark:bg-gray-900'}`}
        >
           <div className="mb-8">
              <h1 className={`text-2xl font-bold mb-4 leading-snug ${theme === 'sepia' ? 'text-[#3a2818]' : 'text-gray-900 dark:text-white'}`}>
                {article.title}
              </h1>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                 <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{article.author}</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{article.date}</span>
                 </div>
              </div>
           </div>

           {/* Dynamic Typography for Reading Experience */}
           <div className={`
              prose max-w-none pb-24 transition-all duration-300
              ${fontSize === 'sm' ? 'prose-sm' : fontSize === 'base' ? 'prose-base' : 'prose-lg'}
              ${theme === 'sepia' 
                ? 'prose-headings:text-[#4a3623] text-[#5b4636] prose-p:text-[#5b4636] prose-li:text-[#5b4636] prose-strong:text-[#4a3623]'
                : 'dark:prose-invert prose-headings:font-bold text-gray-800 dark:text-gray-200 prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-li:text-gray-600 dark:prose-li:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white'
              }
              prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm
              prose-strong:font-bold
              [&_p]:leading-relaxed [&_li]:leading-relaxed
              [&_br]:block [&_br]:mb-6 [&_br]:content-['']
              [&_table]:w-full [&_table]:text-right [&_thead_th]:!text-right [&_th]:!text-right [&_td]:!text-right
           `}>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                 {formattedContent}
              </ReactMarkdown>
           </div>
        </div>

        {/* Bottom Fade-out */}
        <div className={`absolute bottom-0 left-0 right-0 h-24 pointer-events-none transition-colors duration-500 bg-gradient-to-t ${theme === 'sepia' ? 'from-[#fbf4e6] to-transparent' : 'from-white dark:from-gray-900 to-transparent'}`}></div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
