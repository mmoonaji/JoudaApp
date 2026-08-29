import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, fetchFeaturedPackagesFromSupabase } from '../../services/supabaseService';
import { getCachedProducts, getCacheAge } from '../../services/db';
import { calculatePackageSavings } from '../products/utils';
import { AppImage } from '../ui/AppImage';

export const HomePackagesCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastInteractionTime = useRef<number>(0);

  useEffect(() => {
    const loadPackages = async () => {
      setLoading(true);
      try {
        const cached = await getCachedProducts();
        if (cached && cached.length > 0) {
          setProducts(cached);
          setLoading(false);

          // #10: Skip network fetch if cache is fresher than 5 minutes
          const cacheAge = await getCacheAge('products');
          if (cacheAge < 5 * 60 * 1000) {
            return;
          }
        }
        const fresh = await fetchFeaturedPackagesFromSupabase();
        setProducts(fresh);
      } catch (err) {
        console.error('Failed to load packages:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPackages();
  }, []);

  const featuredPackages = products.filter(
    p => p.barcode.startsWith('PKG-') || p.category === 'عروض وبكجات'
  );

  // Auto-play logic
  useEffect(() => {
    if (featuredPackages.length <= 1) return;

    const interval = setInterval(() => {
      const now = Date.now();
      // If user interacted in the last 8 seconds, skip auto-scrolling
      if (now - lastInteractionTime.current < 8000) {
        return;
      }

      const nextIndex = (activeIndex + 1) % featuredPackages.length;
      setActiveIndex(nextIndex);

      const container = scrollRef.current;
      if (container) {
        const cardWidth = 280;
        const gap = 14;
        const stepWidth = cardWidth + gap;
        const targetLeft = -(stepWidth * nextIndex);

        container.scrollTo({
          left: targetLeft,
          behavior: 'smooth'
        });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeIndex, featuredPackages.length]);

  const registerInteraction = () => {
    lastInteractionTime.current = Date.now();
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    // Get absolute scroll position (to support cross-browser RTL)
    const scrollLeft = Math.abs(container.scrollLeft);
    
    // Width of card is 280px, gap is 14px (gap-3.5)
    const cardWidth = 280;
    const gap = 14;
    const stepWidth = cardWidth + gap;

    const index = Math.round(scrollLeft / stepWidth);
    if (index >= 0 && index < featuredPackages.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  if (loading && featuredPackages.length === 0) {
    return <div className="mx-4 mb-6 h-[130px] bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] animate-pulse" />;
  }
  
  if (featuredPackages.length === 0) {
    // #23: Empty state instead of silent null — user knows what's happening
    return (
      <div className="px-4 mb-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
          <span className="text-brand-600">🎁</span>
          <span>عروض التوفير</span>
        </h3>
        <div className="h-[130px] bg-gray-50 dark:bg-gray-800/50 rounded-[1.5rem] border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2">
          <span className="text-2xl">🛒</span>
          <p className="text-sm font-bold text-gray-400 dark:text-gray-500">لا تتوفر عروض حالياً</p>
          <a href="/products" className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">تصفح جميع المنتجات</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 mb-6 animate-fade-in">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
          <span className="text-brand-600 animate-bounce-subtle inline-block origin-bottom">🎁</span>
          <span>عروض التوفير</span>
        </h3>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchStart={registerInteraction}
          onMouseDown={registerInteraction}
          className="flex gap-3.5 overflow-x-auto pb-4 pt-1 px-1 -mx-1 scrollbar-hide snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {featuredPackages.map((pkg, index) => {
            const savings = calculatePackageSavings(pkg, products);
            
            return (
              <div 
                key={pkg.id}
                onClick={() => navigate(`/products?id=${encodeURIComponent(pkg.barcode || pkg.id)}`)}
                className="min-w-[280px] max-w-[280px] h-[130px] bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] dark:shadow-none p-3.5 cursor-pointer active:scale-[0.98] transition-all duration-300 snap-center shrink-0 flex items-center gap-4 hover:shadow-md"
              >
                {/* Content Side (Right) */}
                <div className="flex-1 flex flex-col justify-between h-full py-0.5 text-right">
                  <div>
                    {savings && (
                      <span className="inline-block bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 text-[11px] font-black px-2 py-0.5 rounded-full mb-1">
                        خصم {savings.discountPercentage}%
                      </span>
                    )}
                    <h4 className="font-black text-gray-900 dark:text-white text-[13px] leading-snug line-clamp-2">
                      {pkg.name}
                    </h4>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mt-auto">
                    <span className="text-brand-600 dark:text-brand-400 font-black text-base font-mono">
                      {pkg.price}<span className="saudi-riyal mr-1 text-[10px]">{"\u00ea"}</span>
                    </span>
                    {savings && (
                      <span className="text-[11px] text-gray-400 line-through font-mono">
                        {savings.originalTotal}
                      </span>
                    )}
                  </div>
                </div>

                {/* Image Side (Left) */}
                <div className="w-[84px] h-[84px] shrink-0 relative flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100/50 dark:border-gray-700 overflow-hidden shadow-inner">
                  <AppImage
                    src={pkg.image}
                    alt={pkg.name}
                    decoding="async"
                    priority={index === 0}
                    className="w-full h-full object-cover animate-fade-in"
                    fallback={<span className="text-2xl">🎁</span>}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Dots Indicator */}
        {featuredPackages.length > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-2">
            {featuredPackages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  registerInteraction();
                  setActiveIndex(idx);
                  const container = scrollRef.current;
                  if (container) {
                    const cardWidth = 280;
                    const gap = 14;
                    const stepWidth = cardWidth + gap;
                    const targetLeft = -(stepWidth * idx);

                    container.scrollTo({
                      left: targetLeft,
                      behavior: 'smooth'
                    });
                  }
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ease-in-out ${
                  idx === activeIndex
                    ? 'w-4 bg-brand-600 dark:bg-brand-500'
                    : 'w-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
                aria-label={`الذهاب إلى الشريحة ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
