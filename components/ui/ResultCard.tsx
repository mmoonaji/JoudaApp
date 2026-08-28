import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  Plus, 
  Check, 
  Copy, 
  Image as ImageIcon, 
  HelpCircle, 
  Camera,
  RotateCcw,
  CheckCircle,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { AnalysisResult, VerdictType } from '../../types';
import { STORE_CONFIG } from '../../constants';
import { useCart } from '../../contexts/CartContext';
import { ShareModal } from '../modals/ShareModal';
import { getCachedProducts } from '../../services/db';

interface ResultCardProps {
  result: AnalysisResult;
  onReset: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onReset }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addToCart, addToCartWithBarcode } = useCart();

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    const alt = result.alternative;
    const itemName = alt?.name || result.matchedStoreItem;
    if (!itemName) return;

    setIsAddingToCart(true);
    
    try {
      if (alt && alt.barcode) {
        addToCartWithBarcode({
          name: alt.name,
          barcode: alt.barcode,
          price: alt.price?.toString(),
          source: 'store'
        });
      } else {
        const cachedProducts = await getCachedProducts();
        const matchedProd = cachedProducts.find(p => p.name === itemName);
        
        if (matchedProd) {
          addToCartWithBarcode({
            name: matchedProd.name,
            barcode: matchedProd.barcode,
            price: matchedProd.price?.toString(),
            source: 'store'
          });
        } else {
          addToCart(itemName, 'store');
        }
      }
    } catch (e) {
      addToCart(itemName, 'store');
    }

    setTimeout(() => {
      setIsAddingToCart(false);
    }, 2000);
  };

  const getTheme = (verdict: VerdictType) => {
    switch (verdict) {
      case VerdictType.SAFE:
        return {
          bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
          border: 'border-emerald-200/80 dark:border-emerald-800/60',
          icon: <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />,
          titleColor: 'text-emerald-900 dark:text-emerald-100',
          headerBg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
          badgeText: 'خالي من الجلوتين — آمن'
        };
      case VerdictType.RISKY:
        return {
          bg: 'bg-amber-50/80 dark:bg-amber-950/20',
          border: 'border-amber-200/80 dark:border-amber-800/60',
          icon: <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />,
          titleColor: 'text-amber-900 dark:text-amber-100',
          headerBg: 'bg-amber-50/70 dark:bg-amber-950/40',
          badgeText: 'غير مؤكد — يحتاج تدقيق'
        };
      case VerdictType.UNSAFE:
        return {
          bg: 'bg-rose-50/80 dark:bg-rose-950/20',
          border: 'border-rose-200/80 dark:border-rose-800/60',
          icon: <XCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />,
          titleColor: 'text-rose-900 dark:text-rose-100',
          headerBg: 'bg-rose-50/70 dark:bg-rose-950/40',
          badgeText: 'يحتوي على جلوتين — غير آمن'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          icon: <AlertTriangle className="w-10 h-10 text-gray-500" />,
          titleColor: 'text-gray-800 dark:text-gray-200',
          headerBg: 'bg-gray-100 dark:bg-gray-800',
          badgeText: 'نتيجة الفحص'
        };
    }
  };

  const theme = getTheme(result.verdict);

  const formatTime = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const copyToClipboardFallback = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }
    } catch (err) {
      console.error('Fallback: Unable to copy', err);
    }
    document.body.removeChild(textArea);
  };

  const handleTextShare = async () => {
    if (isCopied) return;
    let shareText = `🔍 *نتيجة فحص "جوده"*\n\n${result.verdictTitle}\n\n📌 *سبب القرار:* ${result.analysis}\n\n`;
    const altName = result.alternative?.name || result.matchedStoreItem;
    if (result.verdict === VerdictType.UNSAFE && altName) {
      shareText += `🌿 بديل آمن متوفر في متجر جوده: ${altName}\n`;
    }
    shareText += `رابط المتجر: ${STORE_CONFIG.URL}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      } catch (err) {
        copyToClipboardFallback(shareText);
      }
    } else {
      copyToClipboardFallback(shareText);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto rounded-[1.75rem] overflow-hidden border ${theme.border} bg-white dark:bg-gray-850 shadow-sm animate-fade-in text-right transition-colors duration-300`}>
      
      {/* 1. Header: Verdict Title & Timestamp */}
      <div className={`${theme.headerBg} p-5 pb-4 flex flex-col items-center text-center border-b ${theme.border}`}>
        <div className="mb-2 bg-white dark:bg-gray-800 rounded-full p-2 shadow-xs">
          {theme.icon}
        </div>
        
        <h2 className={`text-xl font-black ${theme.titleColor} mb-1 leading-tight`}>
          {result.verdictTitle}
        </h2>
        
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
          <span>نتيجة الفحص</span>
          <span>•</span>
          <span dir="ltr">{formatTime(result.timestamp)}</span>
        </div>
      </div>

      {/* 2. Body: Explain Decision & Actionable Next Steps */}
      <div className="p-5 space-y-4">
        
        {/* Section A: لماذا اتّخذنا هذا القرار؟ (Explainable AI Decision) */}
        <div className="bg-gray-50/90 dark:bg-gray-800/70 rounded-2xl p-4 border border-gray-200/70 dark:border-gray-750">
          <div className="flex items-center gap-1.5 mb-2">
            <HelpCircle className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <h3 className="text-xs font-black text-gray-900 dark:text-white">
              لماذا اتُّخذ هذا القرار؟
            </h3>
          </div>

          <p className="text-[13.5px] text-gray-800 dark:text-gray-150 font-bold leading-relaxed mb-3">
            {result.analysis}
          </p>

          {/* Evidence Checklist dynamically bound to V7 evidence or fallback */}
          <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 space-y-2 text-xs">
            {result.verdict === VerdictType.SAFE && (
              <>
                {result.evidence?.certification?.found && (
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>شعار اعتماد رسمي: {result.evidence.certification.type || 'معتمد للسيلياك'}</span>
                  </div>
                )}
                {result.evidence?.glutenFreeClaim?.found && (
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>تصريح صريح: {result.evidence.glutenFreeClaim.text || 'خالي من الجلوتين'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>قائمة المكونات خالية تماماً من القمح، الشعير، والجاودار.</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>المنتج آمن للاستهلاك لمرضى حساسية الجلوتين والسيلياك.</span>
                </div>
              </>
            )}

            {result.verdict === VerdictType.UNSAFE && (
              <>
                {result.evidence?.glutenTriggers && result.evidence.glutenTriggers.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                      <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>مكونات ممنوعة تم رصدها صراحة:</span>
                    </div>
                    <div className="pr-5 flex flex-wrap gap-1.5">
                      {result.evidence.glutenTriggers.map((trig, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 text-[11px] font-black border border-rose-200 dark:border-rose-900/50">
                          • {trig.ingredient}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                    <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>يحتوي على مكونات قمح أو مشتقات جلوتين ممنوعة صراحة.</span>
                  </div>
                )}

                {result.evidence?.warnings && result.evidence.warnings.length > 0 && (
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>تحذير تلامسي: {result.evidence.warnings.map(w => w.statement).join(' | ')}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>يسبب ضرراً لأمعاء مريض السيلياك؛ تجنب تناوله نهائياً.</span>
                </div>
              </>
            )}

            {result.verdict === VerdictType.RISKY && (
              <>
                {result.reasonCode === 'MISSING_INGREDIENTS' ? (
                  <>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>الصورة تظهر واجهة العبوة فقط؛ جدول المكونات غير ظاهر.</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <Camera className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>اقلب العبوة وصوّر جدول المكونات والتحذيرات الخلفية.</span>
                    </div>
                  </>
                ) : result.reasonCode === 'INCOMPLETE_INGREDIENTS' ? (
                  <>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>جدول المكونات مقطوع أو غير مكتمل في زوايا الصورة.</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <Camera className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>أعد التصوير بحيث يظهر كامل جدول المكونات داخل الإطار.</span>
                    </div>
                  </>
                ) : result.reasonCode === 'IMAGE_UNREADABLE' ? (
                  <>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>نصوص المكونات غير واضحة أو مشوشة أو الإضاءة معتمة.</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <Camera className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>ثبّت الكاميرا وصوّر في إضاءة جيدة ومباشرة.</span>
                    </div>
                  </>
                ) : result.reasonCode === 'UNLABELED_CLEAN_INGREDIENTS' ? (
                  <>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>المكونات تبدو خالية لكن المنتج غير مصرح أو معتمد كخالٍ من الجلوتين.</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>قد يتعرض لتلوث خفي؛ يُفضل الاعتماد على منتج يحمل شعار Gluten-Free.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>لم تظهر قائمة المكونات المطبوعة بوضوح كافٍ للحسم القطعي.</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-850 dark:text-amber-200 font-bold">
                      <Camera className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>يُرجى توجيه الكاميرا مباشرة نحو جدول المكونات والتحذيرات.</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Section B: Store Alternative (ONLY SHOWN IF UNSAFE) - Distilled & Minimal */}
        {result.verdict === VerdictType.UNSAFE && (result.alternative || result.matchedStoreItem) && (
          <div className="flex items-center justify-between gap-3 p-3 bg-gray-50/90 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-100 dark:border-brand-900/30">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">بديل آمن متوفر في جودة:</div>
                <div className="text-xs font-black text-gray-900 dark:text-white truncate">
                  {result.alternative?.name || result.matchedStoreItem}
                </div>
                {result.alternative?.price ? (
                  <div className="text-[11px] font-black text-brand-600 dark:text-brand-400">
                    {result.alternative.price} ر.ي
                  </div>
                ) : null}
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 shadow-xs active:scale-95 ${
                isAddingToCart
                  ? 'bg-brand-800 text-white cursor-default'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/20'
              }`}
            >
              {isAddingToCart ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تمت الإضافة</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Section C: Single Primary Action Button */}
        <div>
          {result.verdict === VerdictType.RISKY ? (
            <button
              onClick={onReset}
              className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 active:scale-[0.98] transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>
                {result.reasonCode === 'MISSING_INGREDIENTS'
                  ? 'صوّر جدول المكونات خلف العبوة 📸'
                  : result.reasonCode === 'INCOMPLETE_INGREDIENTS'
                  ? 'صوّر باقي جدول المكونات 📸'
                  : result.reasonCode === 'IMAGE_UNREADABLE'
                  ? 'أعد التصوير بإضاءة أوضح 📸'
                  : result.reasonCode === 'TEXT_SEARCH_INFORMATIONAL'
                  ? 'صوّر جدول مكونات العبوة 📸'
                  : 'صوّر جدول المكونات بوضوح 📸'}
              </span>
            </button>
          ) : (
            <button
              onClick={onReset}
              className="w-full h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 active:scale-[0.98] transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>فحص منتج غذائي آخر 📸</span>
            </button>
          )}
        </div>

        {/* Section D: Minimal Disclaimer & Share Actions */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            * أداة إرشادية مساعدة ولا تغني عن استشارة الطبيب.
          </p>

          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={handleTextShare}
              disabled={isCopied}
              title="نسخ النتيجة"
              className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 rounded-xl transition-colors active:scale-95 border border-gray-200/70 dark:border-gray-700"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              title="مشاركة كصورة"
              className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 rounded-xl transition-colors active:scale-95 border border-gray-200/70 dark:border-gray-700"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Share as Image Modal */}
      {showShareModal && (
        <ShareModal 
          result={result} 
          onClose={() => setShowShareModal(false)} 
        />
      )}
    </div>
  );
};
