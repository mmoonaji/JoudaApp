import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomePackagesCarousel } from './HomePackagesCarousel';
import { TrendingRecipes } from '../blog/TrendingRecipes';
import { KnowledgeHub } from '../../pages/KnowledgeHub';
import { ScanLine, ChefHat, Store } from 'lucide-react';

// #21: Updated greeting buckets — more natural Arabic expressions
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6)  return ['ليلتك سعيدة', '🌙'];
  if (hour < 12) return ['صباح الخير', '☀️'];
  if (hour < 14) return ['مرحباً', '🌤️'];
  if (hour < 18) return ['مساء الخير', '🌅'];
  return ['مساء النور', '🌙'];
};

interface DashboardViewProps {
  // #25: prop instead of window.dispatchEvent
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenScanner }) => {
  const navigate = useNavigate();

  const [greeting, icon] = getGreeting();

  // #11: useState initializer so it reads localStorage once (not on every render)
  // and is reactive to changes within the same tab
  const [userName] = useState<string>(() => {
    const stored = localStorage.getItem('jouda_customer_name');
    return stored?.split(' ')[0] ?? '';
  });

  return (
    <div className="animate-fade-in flex flex-col">
      {/* iOS Style Minimal Hero */}
      <div className="mt-4 mb-4 px-4">
        <h1 className="text-[20px] font-black text-gray-900 dark:text-white mb-1 tracking-tight flex items-center gap-2">
          <span>{greeting}{userName && `، ${userName}`}</span>
          <span className="text-xl">{icon}</span>
        </h1>
        <p className="text-[12px] font-bold text-gray-500 dark:text-gray-400 leading-normal max-w-[90%]">
          خياراتك الصحية الموثوقة.. في مكان واحد.
        </p>
      </div>

      {/* Smart Lifesaver Bar (Scanner Trigger) */}
      <div className="px-4 mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <button
          onClick={onOpenScanner}
          className="w-full relative group bg-white dark:bg-gray-900 rounded-[1.25rem] p-3.5 flex items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-800 transition-all active:scale-[0.98] overflow-hidden"
        >
          {/* Animated Background Gradient (Subtle) */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Icon Area */}
          <div className="w-12 h-12 rounded-[1rem] bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
            <ScanLine className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>

          {/* Text Area */}
          <div className="flex-1 text-right">
            <h3 className="font-black text-gray-900 dark:text-white text-[15px] mb-0.5">افحص أي منتج الآن</h3>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 font-bold">بالكاميرا أو البحث النصي.. وتأكد هل هو خالي من الجلوتين!</p>
          </div>
        </button>
      </div>

      {/* Minimal Categories (Bento Style) - Horizontal Layout */}
      <div className="grid grid-cols-2 gap-3 mb-6 px-4">
        {/* متجر جوده */}
        <button
          onClick={() => navigate('/products')}
          className="group relative min-h-[5rem] h-auto rounded-[1.25rem] bg-white dark:bg-gray-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none border border-gray-100 dark:border-gray-800 text-right px-2.5 py-3 sm:p-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-2 sm:gap-3 w-full"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[0.8rem] bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
            <Store className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 dark:text-white text-[14px] leading-tight mb-0.5">تسوق المنتجات</h3>
            <p className="text-[11px] sm:text-[12px] text-gray-500 dark:text-gray-400 font-medium leading-snug">اطلب الان</p>
          </div>
        </button>

        {/* وصفات جوده */}
        <button
          onClick={() => navigate('/recipes')}
          className="group relative min-h-[5rem] h-auto rounded-[1.25rem] bg-white dark:bg-gray-900 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none border border-gray-100 dark:border-gray-800 text-right px-2.5 py-3 sm:p-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-2 sm:gap-3 w-full"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[0.8rem] bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-300">
            <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 dark:text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 dark:text-white text-[14px] leading-tight mb-0.5">قائمة الوصفات</h3>
            <p className="text-[11px] sm:text-[12px] text-gray-500 dark:text-gray-400 font-medium leading-snug">جرّب وصفة اليوم</p>
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
