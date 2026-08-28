import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Store, 
  ShoppingCart, 
  FileText, 
  MapPin, 
  Send, 
  Sparkles, 
  ArrowLeft,
  ArrowRight,
  MessageCircle, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { STORE_CONFIG } from '../../constants';
import { useScrollLock, useBackButton } from '../../hooks';

interface HowToOrderModalProps {
  onClose: () => void;
}

export const HowToOrderModal: React.FC<HowToOrderModalProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  // Touch gesture states for vertical swipe
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  // Handle body scrolling lock & native Android back button
  useScrollLock(true);
  useBackButton(true, onClose);

  const whatsappLink = `https://api.whatsapp.com/send?phone=${STORE_CONFIG.PHONE.replace(/\D/g, '')}&text=${encodeURIComponent('السلام عليكم، أحتاج مساعدة في كيفية إتمام طلبي من متجر جودة')}`;

  const steps = [
    {
      numeral: '٠١',
      stepNum: 1,
      title: 'ادخل المتجر واختر أصنافك',
      description: 'اضغط على زر «متجرك» أسفل الشاشة، وتصفح الأقسام (مخبوزات، حبوب، دقيق، سناك)، واضغط على علامة (+) أو «إضافة للسلة» على أي صنف تحتاجه.',
      icon: <Store className="w-6 h-6 text-brand-600 dark:text-brand-400" />,
      accentBg: 'bg-red-50 dark:bg-red-950/30',
      badgeColor: 'text-brand-600 dark:text-brand-400'
    },
    {
      numeral: '٠٢',
      stepNum: 2,
      title: 'افتح سلتك وراجع طلبك',
      description: 'اضغط على زر «سلتك» الأحمر أعلى يسار الشاشة؛ بتشوف كل الأصناف اللي اخترتها، وتقدر تزيد الكمية أو تنقصها، وتشوف المجموع وقيمة التوصيل.',
      icon: <ShoppingCart className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      accentBg: 'bg-amber-50 dark:bg-amber-950/30',
      badgeColor: 'text-amber-600 dark:text-amber-400'
    },
    {
      numeral: '٠٣',
      stepNum: 3,
      title: 'اكتب بياناتك ونوع التوصيل',
      description: 'اضغط زر «متابعة الطلب» أسفل السلة، وسجّل اسمك ورقم جوالك (واتساب)، واختر نوع التوصيل: داخل صنعاء أو شحن لباقي المحافظات.',
      icon: <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      accentBg: 'bg-blue-50 dark:bg-blue-950/30',
      badgeColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      numeral: '٠٤',
      stepNum: 4,
      title: 'حدّد موقعك أو عنوان الشحن',
      description: 'إذا اخترت داخل صنعاء، اضغط «تحديد موقعي» بالخريطة لتحديد بيتك بدقة؛ وإذا اخترت شحن للمحافظات، اكتب اسم محافظتك ومدينتك وشركة النقل.',
      icon: <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
      accentBg: 'bg-purple-50 dark:bg-purple-950/30',
      badgeColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      numeral: '٠٥',
      stepNum: 5,
      title: 'أكّد طلبك وتابعه لحظة بلحظة',
      description: 'اضغط الزر الأخضر «تأكيد وإرسال الطلب»؛ بيوصل طلبك مباشرة لنظام المتجر ويبدأ التجهيز فوراً، وتقدر تتابع خط سير المندوب من تبويب «طلباتك» أسفل الشاشة.',
      icon: <Send className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      badgeColor: 'text-emerald-600 dark:text-emerald-400'
    }
  ];

  const handleStartShopping = () => {
    onClose();
    navigate('/products');
  };

  const handleNext = () => {
    if (activeIndex < steps.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else {
      handleStartShopping();
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  };

  // Vertical touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (touchStartY === null || touchEndY === null) return;
    const distance = touchStartY - touchEndY;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      // Swiped UP -> Next Card
      handleNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped DOWN -> Previous Card
      handlePrev();
    }
    setTouchStartY(null);
    setTouchEndY(null);
  };

  const isLastStep = activeIndex === steps.length - 1;

  return createPortal(
    <div 
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-warm-white dark:bg-gray-900 w-full max-w-md rounded-t-[2.2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up border-t border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle Indicator */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto my-3 shrink-0" />

        {/* Modal Header */}
        <div className="px-6 py-2.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-100 dark:border-brand-900/30 shadow-xs">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                كيف تطلب من جودة؟
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Step Counter Pill */}
            <span className="text-xs font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1 rounded-full border border-brand-100 dark:border-brand-900/40">
              {activeIndex + 1} من {steps.length}
            </span>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center transition-colors active:scale-95"
              aria-label="إغلاق الدليل"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Vertical Stack Stage */}
        <div className="px-5 pt-2 pb-2 flex-1 flex flex-col justify-center">
          
          {/* The Deck of Vertical Cards */}
          <div 
            className="relative w-full h-[270px] sm:h-[290px] flex items-center justify-center select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {steps.map((step, index) => {
              const diff = index - activeIndex;

              let positionStyles: React.CSSProperties = {};
              let cardClasses = "";

              if (diff === 0) {
                // Top Active Card
                cardClasses = "z-30 opacity-100 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)] pointer-events-auto border-gray-200 dark:border-gray-750";
                positionStyles = {
                  transform: 'translateY(0px) scale(1)',
                };
              } else if (diff === 1) {
                // 1st Card peeking from underneath (Below)
                cardClasses = "z-20 opacity-80 shadow-md pointer-events-none border-gray-200/90 dark:border-gray-800";
                positionStyles = {
                  transform: 'translateY(22px) scale(0.94)',
                };
              } else if (diff === 2) {
                // 2nd Card peeking deeper from underneath (Below)
                cardClasses = "z-10 opacity-50 shadow-sm pointer-events-none border-gray-200/70 dark:border-gray-800/80";
                positionStyles = {
                  transform: 'translateY(40px) scale(0.88)',
                };
              } else if (diff < 0) {
                // Already passed cards (slid away to top)
                cardClasses = "z-0 opacity-0 pointer-events-none";
                positionStyles = {
                  transform: 'translateY(-120%) scale(0.92)',
                };
              } else {
                // Cards further down in stack
                cardClasses = "z-0 opacity-0 pointer-events-none";
                positionStyles = {
                  transform: 'translateY(55px) scale(0.82)',
                };
              }

              return (
                <div
                  key={index}
                  style={positionStyles}
                  className={`absolute inset-x-2 top-0 bottom-8 bg-white dark:bg-gray-800/95 rounded-[1.75rem] p-5 sm:p-6 border flex flex-col justify-between transition-all duration-400 ease-out text-right ${cardClasses}`}
                >
                  {/* Card Top: Number Watermark + Icon & Title (No Badge) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl ${step.accentBg} flex items-center justify-center shadow-xs shrink-0`}>
                        {step.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">
                          {step.title}
                        </h3>
                      </div>
                    </div>

                    {/* Decorative Numeral */}
                    <span className="text-3xl font-black text-gray-200 dark:text-gray-750 select-none shrink-0">
                      {step.numeral}
                    </span>
                  </div>

                  {/* Card Middle: Description Text (Enlarged, Clear & Bold) */}
                  <div className="my-auto py-2">
                    <p className="text-[15px] sm:text-base text-gray-800 dark:text-gray-100 font-bold leading-[1.9]">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stepper Progress Bar Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                aria-label={`الانتقال للبطاقة ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeIndex
                    ? 'w-6 bg-brand-600 dark:bg-brand-500'
                    : idx < activeIndex
                      ? 'w-2 bg-brand-200 dark:bg-brand-900'
                      : 'w-1.5 bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

        </div>

        {/* Modal Controls: Next / Prev / Start Shopping */}
        <div className="p-4 pt-2 bg-warm-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0 flex flex-col gap-2.5">
          
          <div className="flex items-center gap-2 w-full">
            {activeIndex > 0 && (
              <button
                onClick={handlePrev}
                className="h-12 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className={`flex-1 h-12 rounded-xl text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                isLastStep
                  ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/25'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-600/20'
              }`}
            >
              {isLastStep ? (
                <>
                  <ShoppingCart className="w-4.5 h-4.5" />
                  <span>فهمت عليك، خلنا نبدأ نتسوق 🛒</span>
                </>
              ) : (
                <>
                  <span>الخطوة اللي بعدها</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Quick WhatsApp Support Help Link */}
          <div className="flex items-center justify-center gap-1.5 text-center">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              واجهت أي صعوبة؟
            </span>
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>كلمنا واتساب وندعمك فوراً 💬</span>
            </a>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};
