import React, { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export const ReloadPrompt: React.FC = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // فحص التحديثات كل ساعة بصمت
        intervalRef.current = setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);

        // فحص التحديثات كلما عاد العميل للتطبيق من الخلفية
        // تأخير 3 ثوانٍ لمنع مزاحمة الشبكة أثناء تفاعل العميل مع الأزرار
        let visibilityTimer: ReturnType<typeof setTimeout> | null = null;
        visibilityHandlerRef.current = () => {
          if (visibilityTimer) clearTimeout(visibilityTimer);
          if (document.visibilityState === 'visible') {
            visibilityTimer = setTimeout(() => r.update(), 3000);
          }
        };
        document.addEventListener('visibilitychange', visibilityHandlerRef.current);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  // M5: تنظيف الـ interval و event listener عند إزالة المكون
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      }
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-gray-200 dark:border-gray-800 animate-scale-in relative">
        
        {/* Close Button */}
        <button 
          onClick={() => setNeedRefresh(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-blue-100 dark:border-blue-900/30">
          <Sparkles className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          تطبيقك صار أفضل! ✨
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          جهزنا لك تحديث جديد يخلي طلباتك أسهل وأسرع. بضغطة زر وتكون على أحدث نسخة!
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => updateServiceWorker(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-blue-200 dark:shadow-none active:scale-[0.98]"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-lg">تحديث الآن 🚀</span>
          </button>
          
          <button
            onClick={() => setNeedRefresh(false)}
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold py-4 px-6 rounded-2xl transition-colors active:scale-[0.98]"
          >
            <span className="text-lg">بعدين</span>
          </button>
        </div>
      </div>
    </div>
  );
};
