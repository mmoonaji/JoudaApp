import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomePackagesCarousel } from './HomePackagesCarousel';
import { TrendingRecipes } from '../blog/TrendingRecipes';
import { KnowledgeHub } from '../../pages/KnowledgeHub';
import { ScanLine, ChefHat, Store, Sparkles, ArrowLeft } from 'lucide-react';
import { prefetchHandlers } from '../../shared/hooks/usePrefetch';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6)  return ['ليلتك سعيدة', '🌙'];
  if (hour < 12) return ['صباح الخير', '☀️'];
  if (hour < 14) return ['مرحباً', '🌤️'];
  if (hour < 18) return ['مساء الخير', '🌅'];
  return ['مساء النور', '🌙'];
};

interface DashboardViewProps {
  onOpenScanner?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenScanner }) => {
  const navigate = useNavigate();

  const [greeting, icon] = getGreeting();

  const [userName] = useState<string>(() => {
    const stored = localStorage.getItem('jouda_customer_name');
    return stored?.split(' ')[0] ?? '';
  });

  const handleScannerClick = () => {
    if (onOpenScanner) {
      onOpenScanner();
    } else {
      navigate('/scanner');
    }
  };

  return (
    <div className="animate-fade-in flex flex-col">
      {/* iOS Style Minimal Hero */}
      <div className="mt-4 mb-3.5 px-4">
        <h1 className="text-[20px] font-black text-gray-900 dark:text-white mb-1 tracking-tight flex items-center gap-2">
          <span>{greeting}{userName && `، ${userName}`}</span>
          <span className="text-xl">{icon}</span>
        </h1>
        <p className="text-[12px] font-bold text-gray-500 dark:text-gray-400 leading-normal max-w-[90%]">
          خياراتك الصحية الموثوقة.. في مكان واحد.
        </p>
      </div>

      {/* Smart Lifesaver Bar (AI Scanner Hero Card) */}
      <div className="px-4 mb-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <button
          onClick={handleScannerClick}
          className="w-full relative group bg-gradient-to-r from-brand-600 via-brand-500 to-rose-500 text-white rounded-[1.35rem] p-4 flex items-center justify-between shadow-lg shadow-brand-600/20 active:scale-[0.98] transition-all overflow-hidden text-right"
        >
          {/* Subtle decorative glow overlay */}
          <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 relative z-10 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-inner group-hover:scale-105 transition-transform duration-300">
              <ScanLine className="w-6 h-6 text-white" />
            </div>

            <div className="min-w-0">
              <div className="mb-0.5">
                <h3 className="font-black text-white text-base leading-tight">فاحص الجلوتين الذكي</h3>
              </div>
              <p className="text-[11.5px] text-white/90 font-medium leading-snug truncate">
                صوّر أي منتج وتأكد هل هو آمن وخالي من الجلوتين
              </p>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 mr-1.5 group-hover:-translate-x-1 transition-transform relative z-10">
            <ArrowLeft className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>

      {/* Minimal Categories (Bento Style) - Horizontal Layout */}
      <div className="grid grid-cols-2 gap-3 mb-6 px-4">
        {/* متجر جوده */}
        <button
          onClick={() => navigate('/products')}
          {...prefetchHandlers('/products')}
          className="group relative min-h-[5rem] h-auto rounded-[1.25rem] bg-white dark:bg-gray-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none border border-gray-150/70 dark:border-gray-800 text-right px-3 py-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-2.5 w-full"
        >
          <div className="w-10 h-10 rounded-[0.9rem] bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
            <Store className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 dark:text-white text-[14px] leading-tight mb-0.5">متجرك الصحي</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-snug">مخبوزات وبدائل آمنة</p>
          </div>
        </button>

        {/* وصفات جوده */}
        <button
          onClick={() => navigate('/recipes')}
          {...prefetchHandlers('/recipes')}
          className="group relative min-h-[5rem] h-auto rounded-[1.25rem] bg-white dark:bg-gray-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none border border-gray-150/70 dark:border-gray-800 text-right px-3 py-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-2.5 w-full"
        >
          <div className="w-10 h-10 rounded-[0.9rem] bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-300">
            <ChefHat className="w-5 h-5 text-orange-500 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 dark:text-white text-[14px] leading-tight mb-0.5">مطبخ جودة</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-snug">وصفات خالية من الجلوتين</p>
          </div>
        </button>
      </div>

      <HomePackagesCarousel />

      <div className="mb-6">
        <TrendingRecipes />
      </div>

      <div className="mb-6">
        <KnowledgeHub />
      </div>
    </div>
  );
};
