import React, { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Sparkles } from 'lucide-react';

const PERIODIC_SW_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const VISIBILITY_STAGGER_DELAY_MS = 3000;              // 3 seconds
const TOAST_DISPLAY_DURATION_MS = 3000;                // 3 seconds

export const ReloadPrompt: React.FC = () => {
  const periodicCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  const [showToast, setShowToast] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegistered(registration) {
      if (!registration) return;

      // Check for updates periodically in the background
      periodicCheckRef.current = setInterval(() => {
        registration.update();
      }, PERIODIC_SW_CHECK_INTERVAL_MS);

      // Check for updates when user returns to the tab, staggered to avoid network contention
      visibilityHandlerRef.current = () => {
        if (visibilityTimerRef.current) {
          clearTimeout(visibilityTimerRef.current);
        }
        if (document.visibilityState === 'visible') {
          visibilityTimerRef.current = setTimeout(() => {
            registration.update();
          }, VISIBILITY_STAGGER_DELAY_MS);
        }
      };

      document.addEventListener('visibilitychange', visibilityHandlerRef.current);
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  // Automatically activate detected updates in the background without blocking the UI
  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  // Show a gentle, auto-dismissing toast when a new service worker takes control
  useEffect(() => {
    let hadActiveController = Boolean(navigator.serviceWorker?.controller);

    const handleControllerChange = () => {
      if (hadActiveController) {
        setShowToast(true);
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => {
          setShowToast(false);
        }, TOAST_DISPLAY_DURATION_MS);
      }
      hadActiveController = true;
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Clean up all active timers and event listeners on unmount
  useEffect(() => {
    return () => {
      if (periodicCheckRef.current) clearInterval(periodicCheckRef.current);
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      }
    };
  }, []);

  if (!showToast) return null;

  return (
    <div 
      role="status" 
      aria-live="polite" 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] bg-gray-900/95 dark:bg-white/95 text-white dark:text-gray-900 backdrop-blur-md px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-black border border-white/10 dark:border-gray-200 pointer-events-none transition-all duration-300 animate-slide-up-fade"
    >
      <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-500 shrink-0" />
      <span>تم تحديث التطبيق لأحدث نسخة بنجاح ✨</span>
    </div>
  );
};
