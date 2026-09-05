import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Quote, Star, ArrowUpRight, Instagram, Facebook, Globe, ShoppingBag, MessageCircle, MessageSquare } from 'lucide-react';
import { STORE_CONFIG, APP_LOGO } from '../constants';
import { SuggestionModal } from '../components/modals/SuggestionModal';

const TESTIMONIALS = [
  {
    id: 1,
    rating: 5,
    name: "Ahlam Ali",
    image: "https://lh3.googleusercontent.com/a/ACg8ocJM-X5iJ1aNKpsmDDWvB1qKf9mc7dPXlS6ebeI3oLVzVTJtwQ=s120-c-rp-mo-br100",
    time: "قبل 7 أشهر",
    text: "تعامل راقي وجميل، اهتمام بنظافة وشكل الطلبات، شكراً جودة."
  },
  {
    id: 2,
    rating: 5,
    name: "قصي الماوري",
    image: "https://lh3.googleusercontent.com/a/ACg8ocI5fpjHxdtVpYOnMylOVNKfFzAnLgqxFitqYYZpRHsscdNfHQ=s120-c-rp-mo-br100",
    time: "قبل 11 شهر",
    text: "حبيت أشكر متجر جوده على خدماته وتوفيره كل ما نحتاجه من دقيق لكل المخبوزات والمعجنات، وحتى الحلويات متوفرة بكل أشكالها وطعمها جميل."
  },
  {
    id: 3,
    rating: 5,
    name: "Mram Al ahmadi",
    image: "",
    time: "قبل 9 أشهر",
    text: "من أجمل المتاجر، تعامل راقي ومنتج مناسب، وخدمة عملاء ومعلومات واستشارات من أجمل ما يكون."
  },
  {
    id: 4,
    rating: 5,
    name: "Reem Al Dhamari",
    image: "",
    time: "قبل 3 أشهر",
    text: "شكراً جوده لتعاملكم الراقي وأصنافكم اللذيذة."
  },
  {
    id: 5,
    rating: 5,
    name: "Ashley Muharram",
    image: "",
    time: "قبل 11 شهر",
    text: "متجر جوده من أوائل المتاجر الذي ساعدنا كسيلياكيين ووفر لنا أشياء كنا فعلاً نحتاجها، وما بخلوا علينا بأي معلومة ممكن تفيدنا في رحلتنا مع السيلياك."
  },
  {
    id: 6,
    rating: 5,
    name: "Fog Master",
    image: "",
    time: "قبل 9 أشهر",
    text: "أول متجر تخصصي بالمنتجات الخالية من الجلوتين في اليمن. شخصياً كسيلياكية أطلب كل ما أحتاجه من متجر جوده ومعتمدة عليه بعد الله."
  },
  {
    id: 7,
    rating: 5,
    name: "امين خالد",
    image: "",
    time: "قبل 9 أشهر",
    text: "أحب أشكر متجر جوده الأكثر من رائع وعلى جهودهم المبذولة، بما أنهم يحسوا بنا كونهم سيلياكيين مثلنا ويوفروا أغلب المنتجات اللي محرومين منها."
  },
  {
    id: 8,
    rating: 5,
    name: "loly abdo",
    image: "",
    time: "قبل 7 أشهر",
    text: "متجر أكثر من رائع، كل الحب من أجلكم."
  },
  {
    id: 9,
    rating: 5,
    name: "حماس الدعيس",
    image: "",
    time: "قبل 11 شهر",
    text: "أول وأفضل متجر في اليمن وفر احتياجاتنا كسيلياكيين، ومن معاناة أصحابه عرفوا يوصلوا رسالتهم ويفهمونا، وتعاملهم راقي جداً."
  },
  {
    id: 10,
    rating: 5,
    name: "Vvv by High",
    image: "",
    time: "قبل 9 أشهر",
    text: "The quality of the store is very excellent, and the flavors and products are soothing to the patient."
  },
  {
    id: 11,
    rating: 5,
    name: "ahlam naif",
    image: "",
    time: "قبل 11 شهر",
    text: "أشكر متجر جوده اللي يكون حاضراً في عز احتياجنا لمنتجات خالية من الجلوتين، ولجهودهم في توفير أكبر قدر ممكن من هذه المنتجات وبأسعار مناسبة."
  },
  {
    id: 12,
    rating: 5,
    name: "Abdulqader Naji",
    image: "",
    time: "قبل 11 شهر",
    text: "من أفضل المنتجات ومتوفر بأغلب الأوقات، وخدمة عملاء ممتازة. أتمنى لكم دوام التقدم والنجاح."
  },
  {
    id: 13,
    rating: 5,
    name: "Shaima'a Khaled",
    image: "",
    time: "قبل 8 أشهر",
    text: "متجر جوده أعتقد أنه ما فيش كلام نقدر نوصل به شكرنا لكم ولا في وصف ممكن يوصف حبنا واحترامنا الكبير لكم."
  },
  {
    id: 14,
    rating: 5,
    name: "dany hakim",
    image: "",
    time: "قبل 10 أشهر",
    text: "متجر رائع وأمين وفر لي منتجات خالية من الجلوتين بجودة بدون قلق أو معاناة. شكراً من القلب."
  },
  {
    id: 15,
    rating: 5,
    name: "Emad Muthana",
    image: "",
    time: "قبل 11 شهر",
    text: "من أفضل المتاجر الذي تعاملت معها."
  },
  {
    id: 16,
    rating: 5,
    name: "هيام الذبحاني",
    image: "",
    time: "قبل 6 أشهر",
    text: "أجمل متجر بالحياة."
  },
  {
    id: 17,
    rating: 5,
    name: "أم عمير",
    image: "",
    time: "قبل 9 أشهر",
    text: "يكفينا الثقة في المنتجات، نأخذ بدون قلق."
  },
  {
    id: 18,
    rating: 5,
    name: "Really Ali Abdo",
    image: "https://lh3.googleusercontent.com/a/ACg8ocKX90ddwtzLPDL4dKLXgOAESZWXZlKgUPdvTG_x8t-VYixxeA=s120-c-rp-mo-br100",
    time: "قبل 9 أشهر",
    text: "متجر جوده شكراً كثير لكم."
  },
  {
    id: 19,
    rating: 5,
    name: "Haime Fahmi",
    image: "",
    time: "قبل 9 أشهر",
    text: "جوده الشركة الحب لحياتي."
  },
  {
    id: 20,
    rating: 5,
    name: "Ghofran Nasr",
    image: "",
    time: "قبل 7 أشهر",
    text: "Very Nice."
  },
  {
    id: 21,
    rating: 5,
    name: "laila mohmmed",
    image: "",
    time: "قبل 23 ساعة",
    text: "شكراً على جهودكم، من أحلى وأحب المتاجر اللي أتعامل معها من جودة، وسرعة، ودقة، وأسعار مناسبة لنا كسلياكيين."
  },
  {
    id: 22,
    rating: 5,
    name: "Ameer Haill",
    image: "",
    time: "قبل يوم",
    text: "متجر رائع وتعامل راقي، وثقتنا بهم لأنهم سيلياكيين مثلنا يحسوا فينا."
  },
];

const CAROUSEL_AUTO_PLAY_INTERVAL_MS = 4000;
const USER_INTERACTION_PAUSE_MS = 8000;

const getCarouselStepWidth = (): number => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const cardWidth = isMobile ? 290 : 350;
  const gap = 16;
  return cardWidth + gap;
};

export const JoudaPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const whatsappLink = `https://api.whatsapp.com/send?phone=${STORE_CONFIG.PHONE.replace(/\D/g, '')}`;

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastInteractionTime = useRef<number>(0);

  const registerInteraction = () => {
    lastInteractionTime.current = Date.now();
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollLeft = Math.abs(container.scrollLeft);
    const stepWidth = getCarouselStepWidth();
    const index = Math.round(scrollLeft / stepWidth);

    if (index >= 0 && index < TESTIMONIALS.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollToSlide = (index: number) => {
    setActiveIndex(index);
    const container = scrollRef.current;
    if (container) {
      const stepWidth = getCarouselStepWidth();
      const targetLeft = -(stepWidth * index);

      container.scrollTo({
        left: targetLeft,
        behavior: 'smooth',
      });
    }
  };

  // Auto-play logic for testimonials
  useEffect(() => {
    if (TESTIMONIALS.length <= 1) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastInteractionTime.current < USER_INTERACTION_PAUSE_MS) {
        return;
      }

      const nextIndex = (activeIndex + 1) % TESTIMONIALS.length;
      scrollToSlide(nextIndex);
    }, CAROUSEL_AUTO_PLAY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeIndex]);

  return (
    <div className="pb-32 md:pb-12 animate-fade-in px-4 w-full max-w-3xl mx-auto">
      
      {/* 1. Header */}
      <div className="text-center py-8 md:py-12">
         <div className="relative w-24 h-24 md:w-28 md:h-28 mx-auto mb-6">
              <div className="absolute inset-0 bg-brand-400 dark:bg-brand-500 blur-2xl opacity-20 dark:opacity-30 rounded-full"></div>
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-xl ring-4 ring-white dark:ring-gray-800">
                 <img 
                   src={APP_LOGO} 
                   alt="Jouda" 
                   width="112" 
                   height="112" 
                   loading="eager"
                   fetchPriority="high" 
                   decoding="async" 
                   className="w-full h-full object-cover" 
                 />
              </div>
         </div>
         <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">{STORE_CONFIG.NAME}</h1>
         <p className="text-base text-gray-500 dark:text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
           نخبز بحب، عشان نرجع لك متعة الأكل اللذيذ والآمن الخالي تماماً من الجلوتين.
         </p>
      </div>

      <div className="space-y-8 md:space-y-10">
        
        {/* 2. Story */}
        <div className="bg-brand-50/40 dark:bg-brand-950/20 rounded-3xl p-8 md:p-10 border border-brand-100/20 dark:border-brand-900/10 shadow-sm">
           <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-right">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-full shrink-0 shadow-sm border border-brand-100/10">
                 <Quote className="w-8 h-8 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                 <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-snug">
                   "عشنا نفس التجربة.. <span className="text-brand-600">وعشان كذا صنعنا الحل"</span>
                 </h2>
                 <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base leading-loose font-medium">
                   لما تشخّص أحد من عيلتنا بالسيلياك، عرفنا قد إيش صعب تلاقي أكل آمن ولذيذ بنفس الوقت. عشان كذا أسسنا «جوده».. لتكون مصدر ثقتك الأول للغذاء الآمن 100%. ما نبيعك مجرد منتجات، بنقدم لك نفس الأكل اللي نثق نأكله لأولادنا في بيوتنا.
                 </p>
              </div>
           </div>
        </div>

        {/* 3. Testimonials (Social Proof Carousel) */}
        <div>
           <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-xl">ناس حبّتنا وجربتنا</h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-800">
                 <Star className="w-3.5 h-3.5 fill-current" />
                 <span className="text-xs font-bold">5.0</span>
              </div>
           </div>

           {/* حاوية الكاروسيل الأفقي */}
           <div
              ref={scrollRef}
              onScroll={handleScroll}
              onTouchStart={registerInteraction}
              onMouseDown={registerInteraction}
              className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
           >
              {TESTIMONIALS.map((review) => (
                 <div 
                    key={review.id} 
                    className="min-w-[290px] max-w-[290px] md:min-w-[350px] md:max-w-[350px] min-h-[170px] snap-center shrink-0 relative overflow-hidden bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4 transition-transform hover:-translate-y-1 duration-300"
                 >
                    <Quote className="absolute top-2 left-2 w-16 h-16 text-gray-100 dark:text-gray-700 opacity-50 z-0 rotate-180" />
                    {review.image ? (
                      <img 
                        src={review.image} 
                        alt={review.name} 
                        width="48" 
                        height="48" 
                        loading="lazy" 
                        decoding="async" 
                        className="w-12 h-12 rounded-full shrink-0 relative z-10 border-2 border-white dark:border-gray-700 shadow-sm" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full shrink-0 relative z-10 border-2 border-white dark:border-gray-700 shadow-sm bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 flex items-center justify-center font-black text-sm">
                        {review.name.trim().charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 relative z-10 text-right">
                       <h4 className="font-bold text-sm md:text-base text-gray-900 dark:text-white leading-normal mb-1">{review.name}</h4>
                       <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-0.5 text-yellow-400 shrink-0" aria-label={`تقييم ${review.rating} من 5`}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 md:w-3.5 md:h-3.5 ${review.rating >= star ? 'fill-current' : 'fill-none text-gray-300 dark:text-gray-600'}`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] md:text-xs text-gray-400 shrink-0 font-medium">{review.time}</span>
                       </div>
                       <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium line-clamp-4">
                         "{review.text}"
                       </p>
                    </div>
                 </div>
              ))}
           </div>
           {/* النقاط الإرشادية للنقل (Dots Indicator) */}
           {TESTIMONIALS.length > 1 && (
              <div className="flex justify-center items-center gap-1.5 mt-2">
                 {TESTIMONIALS.map((_, idx) => (
                    <button
                       key={idx}
                       onClick={() => {
                          registerInteraction();
                          scrollToSlide(idx);
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

        {/* 4. Actions Section (CTA + Contact) */}
        <div className="space-y-3 pt-2">
           {/* Primary CTA */}
           <button
              onClick={() => navigate('/products')}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-brand-200 dark:shadow-none transition-all active:scale-[0.98] text-base"
           >
              <ShoppingBag className="w-5 h-5" />
              <span>تصفح المتجر وابدأ تسوقك الآن 🛒</span>
           </button>

           {/* Whatsapp Contact Card */}
           <a 
              href={whatsappLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all shadow-sm group active:scale-[0.99]"
           >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 text-right">
                 <div className="bg-green-100 dark:bg-green-950/30 p-3 rounded-full text-green-600 dark:text-green-400 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                 </div>
                 <div className="min-w-0">
                    <span className="block text-[15px] font-bold text-gray-900 dark:text-white group-hover:text-green-700 leading-normal">تواصل معنا واتساب</span>
                    <span className="text-xs text-gray-500 truncate block mt-0.5">لأي استفسار أو طلب خاص بخاطرك</span>
                 </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 shrink-0" />
           </a>

           {/* Suggestion Card */}
           <button
              onClick={() => setIsSuggestionModalOpen(true)}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-brand-200 hover:bg-brand-50/50 dark:hover:bg-brand-950/10 transition-all shadow-sm group active:scale-[0.99] text-right"
           >
              <div className="flex items-center gap-3.5 flex-1 min-w-0 text-right">
                 <div className="bg-brand-50 dark:bg-brand-950/30 p-3 rounded-full text-brand-600 dark:text-brand-400 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                 </div>
                 <div className="min-w-0">
                    <span className="block text-[15px] font-bold text-gray-900 dark:text-white group-hover:text-brand-600 leading-normal">شاركنا اقتراحك أو رأيك</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate block mt-0.5">صوتك يساعدنا نطور خدماتنا ومنتجاتنا</span>
                 </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 shrink-0" />
           </button>
        </div>

        {isSuggestionModalOpen && (
           <SuggestionModal onClose={() => setIsSuggestionModalOpen(false)} />
        )}

        {/* Footer */}
        <div className="pt-2 text-center pb-4">
           <div className="flex items-center justify-center gap-3 mb-4">
              <a href="https://www.facebook.com/joudafood" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="https://www.instagram.com/joudafood/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 flex items-center justify-center transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href={STORE_CONFIG.URL} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"><Globe className="w-5 h-5" /></a>
           </div>
           <p className="text-xs font-bold text-gray-400 dark:text-gray-500">© 2024 عالم جوده. صُنع بكل حب لتسهيل حياتك الخالية من الجلوتين.</p>
        </div>

      </div>
    </div>
  );
};
