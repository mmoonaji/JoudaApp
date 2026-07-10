import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { CartDrawer } from '../cart/CartDrawer';

import { InstallPrompt } from '../ui/InstallPrompt';
import { useCart } from '../../contexts/CartContext';

interface LayoutProps {
  children: ReactNode;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onHelpClick: () => void;
  isAdmin?: boolean;
  onAdminLogout?: () => void;
  onLogoClick?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, isDarkMode, toggleDarkMode, onHelpClick, isAdmin, onAdminLogout, onLogoClick }) => {
  const { lastAddedItem } = useCart();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-300 flex justify-center font-sans">
      <InstallPrompt />

      <div className="w-full max-w-md min-h-screen bg-warm-50 dark:bg-gray-900 shadow-[0_0_50px_rgba(0,0,0,0.05)] dark:shadow-none flex flex-col relative border-x border-gray-200 dark:border-gray-800">
        <Header 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode} 
          onHelpClick={onHelpClick}
          isAdmin={isAdmin}
          onAdminLogout={onAdminLogout}
          onLogoClick={onLogoClick}
        />

        {/* Main Content Area */}
        <main className={`flex-1 w-full px-4 flex flex-col mb-20 ${
          location.pathname === '/' ? 'pt-0 pb-8' : 'py-8'
        }`}>
          {children}
        </main>
        
        {/* GLOBAL TOAST NOTIFICATION */}
        {lastAddedItem && (
          <div aria-live="polite" className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 dark:bg-white/90 backdrop-blur text-white dark:text-gray-900 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-slide-up-fade w-max max-w-[90%]">
             <div className="bg-green-500 p-1 rounded-full shrink-0">
               <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
             </div>
             <span className="text-sm font-bold truncate">تمت إضافة &quot;{lastAddedItem}&quot;</span>
          </div>
        )}



        <CartDrawer />
        
        {/* MOBILE BOTTOM NAV */}
        <BottomNav />
      </div>
    </div>
  );
};
