import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCart } from '../../contexts/CartContext';
import { getCachedProducts } from '../../services/db';
import { fetchBannersFromSupabase } from '../../services/supabaseService';

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

export const PromoBanner: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToCart, setIsCartOpen } = useCart();

  useEffect(() => {
    const fetchBanners = async () => {
      setIsLoading(true);
      try {
        const data = await fetchBannersFromSupabase();
        if (data.length > 0) {
          setBanners(data);
        }
      } catch (err) {
        console.warn('PromoBanner: Failed to fetch banners', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, []);

  // Auto-rotate every 5s unless paused
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % banners.length);
  }, [banners.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
    setTimeout(() => setIsPaused(false), 3000);
  };

  if (isLoading) {
    return (
      <div style={{ marginBottom: 24, width: '100%' }}>
        <div 
          className="animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800"
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            minHeight: 185,
            maxHeight: 280,
            borderRadius: 24,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        />
      </div>
    );
  }

  if (banners.length === 0) return null;

  const banner = banners[currentIndex];

  const handleClick = async () => {
    if (banner?.link_url) {
      if (banner.link_url.startsWith('cart:')) {
        const barcode = banner.link_url.replace('cart:', '').trim();
        try {
          const products = await getCachedProducts();
          const prod = products.find(p => p.barcode === barcode);
          if (prod) {
            addToCart(prod.name, prod.source || 'store', prod.barcode, prod.price?.toString());
            setIsCartOpen(true);
          } else {
            alert('المنتج غير متوفر حالياً');
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        window.open(banner.link_url, '_blank', 'noopener');
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{ 
        marginBottom: 16, 
        position: 'relative',
        width: '100%',
      }}
      className="group animate-fade-in"
    >
      {/* Banner Container */}
      <div
        onClick={handleClick}
        role={banner?.link_url ? 'link' : undefined}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          minHeight: 185,
          maxHeight: 280,
          borderRadius: 24,
          overflow: 'hidden',
          cursor: banner?.link_url ? 'pointer' : 'default',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: '#1e293b', // Dark fallback background
        }}
      >
        {/* Images with cinematic zoom & fade transition */}
        {banners.map((b, i) => {
          const isActive = i === currentIndex;
          return (
            <img
              key={b.id}
              src={b.image_url}
              alt={b.title || 'إعلان'}
              decoding="async"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1)' : 'scale(1.08)',
                transition: 'opacity 1s ease-in-out, transform 6s cubic-bezier(0.25, 1, 0.5, 1)',
                pointerEvents: 'none',
                zIndex: isActive ? 2 : 1,
              }}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          );
        })}

        {/* Title overlay — rich dark gradient at bottom */}
        {banner?.title && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '40px 20px 20px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            zIndex: 5,
          }}>
            <div style={{ flex: 1 }}>
              <p style={{
                margin: 0,
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: 800,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                lineHeight: 1.4,
              }}>
                {banner.title}
              </p>
              {banner.link_url && (
                <span style={{
                  display: 'inline-block',
                  marginTop: 6,
                  color: '#fb923c',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 10,
                  backdropFilter: 'blur(4px)',
                }}>
                  اضغط للتفاصيل 👈
                </span>
              )}
            </div>
          </div>
        )}

        {/* Glass Capsule Pagination Indicators */}
        {banners.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 20,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}>
            {banners.map((_, i) => {
              const isActive = i === currentIndex;
              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(i);
                  }}
                  aria-label={`الإعلان ${i + 1}`}
                  style={{
                    width: isActive ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    border: 'none',
                    background: isActive ? '#ea580c' : 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

