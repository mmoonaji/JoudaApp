import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Info, User, HeartPulse } from 'lucide-react';
import { prefetchHandlers } from '../../shared/hooks/usePrefetch';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const triggerHaptic = () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore if vibration is unsupported or restricted
    }
  };

  const handleTabClick = (isActive: boolean) => {
    triggerHaptic();
    if (isActive && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const tabs = [
    { id: 'home', path: '/', label: 'الرئيسية', icon: <Home className="w-[22px] h-[22px]" /> },
    { id: 'products', path: '/products', label: 'متجرك', icon: <LayoutGrid className="w-[22px] h-[22px]" /> },
    { id: 'health', path: '/health', label: 'صحتك', icon: <HeartPulse className="w-7 h-7 text-white" /> },
    { id: 'orders', path: '/orders', label: 'طلباتك', icon: <User className="w-[22px] h-[22px]" /> },
    { id: 'about', path: '/about', label: 'نحنى معك', icon: <Info className="w-[22px] h-[22px]" /> },
  ];

  return (
    <nav aria-label="التصفح الرئيسي" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 safe-area-bottom pointer-events-none">
      <div className="bg-white dark:bg-gray-900 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-none border-t border-gray-100 dark:border-gray-800 rounded-t-[1.5rem] pointer-events-auto px-2 pb-2 pt-1 relative">
        <div className="max-w-md mx-auto flex items-end justify-between relative px-2">
          {tabs.map((tab) => {
            if (tab.id === 'health') {
              const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path);
              return (
                <div key={tab.id} className="relative flex flex-col items-center justify-center -translate-y-4 z-50">
                  <NavLink
                    to={tab.path}
                    onClick={() => handleTabClick(isActive)}
                    {...prefetchHandlers(tab.path)}
                    className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-600 dark:to-brand-800 shadow-[0_8px_20px_rgba(211,47,47,0.3)] text-white hover:scale-105 active:scale-90 transition-transform duration-150 relative select-none"
                    aria-label="صحتك"
                  >
                    <div className={`transition-transform duration-300 ease-out ${isActive ? '-translate-y-0.5 scale-105' : 'scale-100'}`}>
                      {tab.icon}
                    </div>
                  </NavLink>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1">
                    {tab.label}
                  </span>
                </div>
              );
            }

            const isActive = location.pathname === tab.path || (tab.path !== '/' && location.pathname.startsWith(tab.path));
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                onClick={() => handleTabClick(isActive)}
                {...prefetchHandlers(tab.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center w-16 min-h-[48px] min-w-[48px] py-1.5 gap-1 select-none active:scale-90 transition-all duration-150 ${
                  isActive 
                    ? 'text-brand-600 dark:text-brand-400 font-extrabold' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <div className={`transition-transform duration-300 ease-out ${isActive ? '-translate-y-0.5 scale-110' : 'scale-100'}`}>
                  {tab.icon}
                </div>
                <span className={`text-[10px] font-bold transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-85'}`}>
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
