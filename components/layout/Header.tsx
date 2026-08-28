import React, { useState } from 'react';
import { Shield, LogOut, ShoppingCart, HelpCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { APP_LOGO } from '../../constants';
import { useCart } from '../../contexts/CartContext';
import { HowToOrderModal } from '../modals/HowToOrderModal';

interface HeaderProps {
  onHelpClick?: () => void;
  isAdmin?: boolean;
  onAdminLogout?: () => void;
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isAdmin, onAdminLogout, onLogoClick }) => {
  const { setIsCartOpen, totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isHowToOrderOpen, setIsHowToOrderOpen] = useState(false);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 2000) {
      setClickCount(1);
    } else {
      const nextCount = clickCount + 1;
      setClickCount(nextCount);
      if (nextCount >= 5) {
        if (onLogoClick) onLogoClick();
        setClickCount(0);
        setLastClickTime(0);
        return;
      }
    }
    setLastClickTime(now);

    // Standard e-commerce intuitive navigation: return to home or scroll to top
    if (location.pathname !== '/') {
      navigate('/');
    } else if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="bg-warm-white dark:bg-gray-900 sticky top-0 z-40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] transition-colors duration-300 pt-[env(safe-area-inset-top,0px)]">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        
        {/* Branding: Jouda Logo & Title */}
        <div 
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLogoClick();
            }
          }}
          className="flex items-center gap-3 cursor-pointer select-none active:scale-[0.98] transition-transform"
          aria-label="عالم جوده - الانتقال للرئيسية"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md shadow-red-100 dark:shadow-none relative overflow-hidden bg-white border border-gray-100 dark:border-gray-800">
            <img src={APP_LOGO} alt="شعار عالم جوده" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-xl font-black text-brand-600 leading-none tracking-tight">عالم جوده</span>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wide mt-0.5">أسلوب حياة متكامل</span>
          </div>
        </div>

        {/* Action Controls: Admin Badge + High-Conversion Cart Capsule */}
        <div className="flex items-center gap-2">
          {/* Admin Controls */}
          {isAdmin && (
            <div className="flex items-center gap-1 bg-amber-500/10 dark:bg-amber-400/10 p-1 rounded-full border border-amber-500/20">
              <Link 
                to="/admin" 
                className="flex items-center gap-1 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full text-[11px] font-bold hover:bg-amber-500/20 transition-colors"
                title="لوحة الإدارة"
                aria-label="لوحة الإدارة"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </Link>
              {onAdminLogout && (
                <button
                  onClick={onAdminLogout}
                  className="p-1 text-gray-400 hover:text-red-600 rounded-full transition-colors"
                  title="تسجيل خروج"
                  aria-label="تسجيل خروج"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* How To Order Guide Button */}
          <button 
            onClick={() => setIsHowToOrderOpen(true)}
            className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 shadow-sm transition-all active:scale-95 group select-none"
            title="كيف تطلب من جودة؟"
            aria-label="كيف تطلب من جودة؟ دليل الطلب السريع"
          >
            <HelpCircle className="w-[18px] h-[18px] text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 hidden sm:inline">
              كيف تطلب؟
            </span>
          </button>

          {/* Smart Cart Capsule */}
          <button 
            onClick={() => setIsCartOpen(true)}
            className={`h-10 px-3.5 flex items-center justify-center gap-2 rounded-full transition-all duration-200 active:scale-95 select-none ${
              totalItems > 0
                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/25'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 shadow-sm'
            }`}
            title="سلتك"
            aria-label={totalItems > 0 ? `سلتك تحتوي على ${totalItems} منتجات` : 'سلتك فارغة'}
          >
            <ShoppingCart className={`w-[18px] h-[18px] transition-transform duration-200 ${
              totalItems > 0 ? 'text-white' : 'text-gray-500 dark:text-gray-400'
            }`} />
            
            <span className="text-xs font-black">
              سلتك
            </span>

            {totalItems > 0 && (
              <span className="bg-white text-brand-600 text-[11px] font-black min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full shadow-sm leading-none shrink-0 animate-scale-in">
                {totalItems}
              </span>
            )}
          </button>
        </div>
        
      </div>

      {isHowToOrderOpen && (
        <HowToOrderModal onClose={() => setIsHowToOrderOpen(false)} />
      )}
    </header>
  );
};
