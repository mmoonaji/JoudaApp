import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useScrollLock, useBackButton } from '../../hooks/index';
import { AppImage } from '../ui/AppImage';

export interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  src?: string | null;
  alt?: string;
  title?: string;
  subtitle?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  onClose,
  src,
  alt = 'صورة المنتج',
  title,
  subtitle,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [dismissOffsetY, setDismissOffsetY] = useState(0);

  // References for gesture tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);
  const lastTapTimeRef = useRef<number>(0);
  const isMouseDownRef = useRef<boolean>(false);

  // Hook integrations
  useScrollLock(isOpen);
  useBackButton(isOpen, onClose);

  // Reset transforms whenever modal opens, closes, or image changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setDismissOffsetY(0);
      setIsInteracting(false);
    }
  }, [isOpen, src]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((prev) => Math.min(MAX_SCALE, Number((prev + 0.5).toFixed(1))));
      } else if (e.key === '-') {
        setScale((prev) => {
          const next = Math.max(MIN_SCALE, Number((prev - 0.5).toFixed(1)));
          if (next === 1) setPosition({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Feature (E): Pre-decode image asynchronously into browser GPU texture cache
  useEffect(() => {
    if (!isOpen || !src) return;

    let isMounted = true;
    const img = new Image();
    img.src = src;

    if (typeof img.decode === 'function') {
      img.decode()
        .then(() => {
          if (isMounted) {
            // Bitmap is decoded and primed in GPU texture memory
          }
        })
        .catch(() => {
          // Graceful fallback if decode is unsupported or unmounted early
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, src]);

  // Helper to strictly clamp positions within visible viewport
  const clampPosition = useCallback((newX: number, newY: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    if (!containerRef.current) return { x: newX, y: newY };

    const { clientWidth, clientHeight } = containerRef.current;
    const maxBoundX = (clientWidth * (currentScale - 1)) / 2;
    const maxBoundY = (clientHeight * (currentScale - 1)) / 2;

    return {
      x: Math.max(-maxBoundX, Math.min(maxBoundX, newX)),
      y: Math.max(-maxBoundY, Math.min(maxBoundY, newY)),
    };
  }, []);

  // Feature (D): Elastic rubber-band resistance when dragging beyond boundary limits
  const applyElasticPosition = useCallback((newX: number, newY: number, currentScale: number) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    if (!containerRef.current) return { x: newX, y: newY };

    const { clientWidth, clientHeight } = containerRef.current;
    const maxBoundX = (clientWidth * (currentScale - 1)) / 2;
    const maxBoundY = (clientHeight * (currentScale - 1)) / 2;
    const DAMPING_FACTOR = 0.35; // Standard elastic resistance factor

    let dampedX = newX;
    if (newX > maxBoundX) {
      dampedX = maxBoundX + (newX - maxBoundX) * DAMPING_FACTOR;
    } else if (newX < -maxBoundX) {
      dampedX = -maxBoundX + (newX + maxBoundX) * DAMPING_FACTOR;
    }

    let dampedY = newY;
    if (newY > maxBoundY) {
      dampedY = maxBoundY + (newY - maxBoundY) * DAMPING_FACTOR;
    } else if (newY < -maxBoundY) {
      dampedY = -maxBoundY + (newY + maxBoundY) * DAMPING_FACTOR;
    }

    return { x: dampedX, y: dampedY };
  }, []);

  // Double tap / double click to toggle zoom
  const handleDoubleTap = (clientX: number, clientY: number) => {
    if (scale > 1) {
      // Zoom out to normal
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      // Zoom in centered towards tap position
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tapX = clientX - rect.left;
        const tapY = clientY - rect.top;

        const targetX = (centerX - tapX) * (DOUBLE_TAP_SCALE - 1);
        const targetY = (centerY - tapY) * (DOUBLE_TAP_SCALE - 1);

        const clamped = clampPosition(targetX, targetY, DOUBLE_TAP_SCALE);
        setPosition(clamped);
      }
      setScale(DOUBLE_TAP_SCALE);
    }
  };

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Pinch start
      setIsInteracting(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      // Single touch start
      const touch = e.touches[0];
      const now = Date.now();
      const timeDiff = now - lastTapTimeRef.current;

      if (timeDiff < 300) {
        // Detected double tap
        handleDoubleTap(touch.clientX, touch.clientY);
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      setIsInteracting(true);
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      // Pinching
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const targetScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, initialPinchScaleRef.current * ratio)
      );
      setScale(targetScale);

      if (targetScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && lastTouchRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouchRef.current.x;
      const deltaY = touch.clientY - lastTouchRef.current.y;
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

      if (scale > 1) {
        // Pan zoomed image with elastic rubber-band resistance
        setPosition((prev) => applyElasticPosition(prev.x + deltaX, prev.y + deltaY, scale));
      } else if (touchStartPosRef.current) {
        // Swipe down to dismiss when at 1x
        const totalDeltaY = touch.clientX ? touch.clientY - touchStartPosRef.current.y : 0;
        if (totalDeltaY > 0) {
          setDismissOffsetY(totalDeltaY);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    setIsInteracting(false);
    initialPinchDistRef.current = null;
    lastTouchRef.current = null;

    if (scale <= 1) {
      // If pulled down more than 100px at 1x, close modal
      if (dismissOffsetY > 100) {
        onClose();
      } else {
        setDismissOffsetY(0);
      }
    } else {
      // Snap position inside bounds if slightly over-dragged
      setPosition((prev) => clampPosition(prev.x, prev.y, scale));
    }
  };

  // Mouse wheel zoom (Desktop)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((prev + zoomFactor).toFixed(2))));
      if (nextScale === 1) {
        setPosition({ x: 0, y: 0 });
      } else {
        setPosition((pos) => clampPosition(pos.x, pos.y, nextScale));
      }
      return nextScale;
    });
  };

  // Mouse Pan Handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    isMouseDownRef.current = true;
    setIsInteracting(true);
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !lastTouchRef.current || scale <= 1) return;
    const deltaX = e.clientX - lastTouchRef.current.x;
    const deltaY = e.clientY - lastTouchRef.current.y;
    lastTouchRef.current = { x: e.clientX, y: e.clientY };

    setPosition((prev) => applyElasticPosition(prev.x + deltaX, prev.y + deltaY, scale));
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    setIsInteracting(false);
    lastTouchRef.current = null;
    // Snap position back inside strictly clamped bounds with smooth spring transition
    setPosition((prev) => clampPosition(prev.x, prev.y, scale));
  };

  if (!isOpen) return null;

  // Visual opacity calculation during pull-down dismiss
  const backdropOpacity = Math.max(0.2, 1 - dismissOffsetY / 300);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'عارض الصور'}
      className="fixed inset-0 z-[80] flex flex-col justify-between select-none overflow-hidden touch-none"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${0.94 * backdropOpacity})`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        contain: 'paint layout',
      }}
      onClick={(e) => {
        // Close if clicking outside the image when not zoomed
        if (scale === 1 && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Top Bar Overlay */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex flex-col text-right min-w-0 pr-2">
          {title && (
            <h2 className="text-white text-sm sm:text-base font-black truncate drop-shadow-md">
              {title}
            </h2>
          )}
          {subtitle ? (
            <p className="text-gray-400 text-xs truncate drop-shadow-sm">{subtitle}</p>
          ) : (
            <p className="text-gray-400 text-[11px] font-medium">
              انقر مرتين للتقريب • اسحب للتحريك
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all backdrop-blur-md shadow-lg border border-white/10 shrink-0 ml-2"
        >
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* Main Image Viewport */}
      <main
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={(e) => handleDoubleTap(e.clientX, e.clientY)}
      >
        <div
          className="relative max-w-full max-h-full flex items-center justify-center p-2 sm:p-6 pointer-events-none"
          style={{
            transform: `translate3d(${position.x}px, ${position.y + dismissOffsetY}px, 0px) scale(${scale})`,
            transition: isInteracting ? 'none' : 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1)',
            willChange: isInteracting ? 'transform' : 'auto',
          }}
        >
          <AppImage
            src={src || undefined}
            alt={alt}
            priority
            containerClassName="max-w-[92vw] max-h-[76vh] flex items-center justify-center"
            className="w-auto h-auto max-w-[92vw] max-h-[76vh] object-contain drop-shadow-2xl rounded-xl"
            fallback={
              <div className="w-48 h-48 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
                تعذر تحميل الصورة
              </div>
            }
          />
        </div>
      </main>

      {/* Bottom Floating Control Bar */}
      <footer className="relative z-30 pb-6 pt-2 px-4 flex justify-center items-center pointer-events-none bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-1 sm:gap-2 bg-gray-900/80 backdrop-blur-xl border border-white/15 px-3 py-1.5 rounded-full shadow-2xl pointer-events-auto">
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={() => {
              setScale((prev) => {
                const next = Math.max(MIN_SCALE, Number((prev - 0.5).toFixed(1)));
                if (next === 1) setPosition({ x: 0, y: 0 });
                return next;
              });
            }}
            disabled={scale <= MIN_SCALE}
            aria-label="تصغير"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Current Scale Display / Reset Trigger */}
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            title="إعادة التعيين إلى 100%"
            className="px-3 py-1 text-xs font-mono font-bold text-white/90 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={() => {
              setScale((prev) => Math.min(MAX_SCALE, Number((prev + 0.5).toFixed(1))));
            }}
            disabled={scale >= MAX_SCALE}
            aria-label="تكبير"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Reset Position & Scale Button (only shown when altered) */}
          {(scale > 1 || position.x !== 0 || position.y !== 0) && (
            <>
              <div className="w-[1px] h-4 bg-white/20 mx-1" />
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                aria-label="إعادة ضبط الحجم والموضع"
                className="w-9 h-9 rounded-full flex items-center justify-center text-brand-400 hover:text-brand-300 hover:bg-white/10 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </footer>
    </div>,
    document.body
  );
};
