import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ShieldAlert, 
  RotateCcw
} from 'lucide-react';
import { useScanHistory } from '../hooks/useScanHistory';
import { useAnalyzer } from '../hooks/useAnalyzer';
import { useBackButton } from '../hooks';
import { Scanner } from '../components/ui/Scanner';
import { ResultCard } from '../components/ui/ResultCard';
import { HistoryList } from '../components/blog/HistoryList';
import { AnalysisResult } from '../types';

export const ScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'camera' | 'text'>('camera');
  const [analyzingToast, setAnalyzingToast] = useState(false);
  const { history, saveToHistory } = useScanHistory();

  const handleAnalysisSuccess = (newResult: AnalysisResult) => {
    saveToHistory(newResult);
  };

  const {
    isAnalyzing,
    result,
    errorMessage,
    analyzeImage,
    analyzeText,
    reset,
    setResult,
    setError,
    setErrorMessage
  } = useAnalyzer(handleAnalysisSuccess);

  // Handle native Android back button
  useBackButton(true, () => {
    if (isAnalyzing) {
      setAnalyzingToast(true);
      setTimeout(() => setAnalyzingToast(false), 2000);
      return;
    }
    if (result) {
      reset();
      return;
    }
    navigate(-1);
  });

  const handleHistorySelect = (item: AnalysisResult) => {
    setResult(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearError = () => {
    setError(false);
    setErrorMessage(null);
  };

  const handleBack = () => {
    if (result) {
      reset();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="w-full pb-36 animate-fade-in text-right">
      
      {/* Native-style Page Header matching Articles & Knowledge */}
      <div className="pt-0 pb-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={handleBack}
            aria-label="رجوع"
            className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-brand-600 dark:text-brand-500 hover:bg-brand-50 dark:hover:bg-gray-700 transition-colors active:scale-95 shadow-sm shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              فاحص الجلوتين الذكي
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              تحليل فوري للتأكد من خلو أي منتج غذائي من الجلوتين
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        
        {/* Quota Exceeded Alert */}
        {errorMessage === "LOCAL_QUOTA_EXCEEDED" && (
          <div className="p-5 bg-amber-50/80 dark:bg-amber-950/20 rounded-2xl text-center border border-amber-200/60 dark:border-amber-900/30 animate-scale-in">
            <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
            <h3 className="font-black text-gray-900 dark:text-white text-sm">خلص رصيد الصور المتاح لك اليوم</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3 font-medium">تقدر تكتب اسم المنتج بالبحث النصي؛ مجاني وبدون أي حدود!</p>
            <button 
              onClick={() => {
                handleClearError();
                setMode('text');
              }} 
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-md shadow-brand-600/20 active:scale-98 transition-all"
            >
              الانتقال للبحث النصي
            </button>
          </div>
        )}

        {/* General Error Message */}
        {errorMessage && errorMessage !== "LOCAL_QUOTA_EXCEEDED" && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 rounded-2xl text-center font-bold text-xs flex items-center justify-between gap-2">
            <span>{errorMessage}</span>
            <button 
              onClick={handleClearError}
              className="px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-[11px] font-bold text-red-600 shadow-xs"
            >
              تخطي
            </button>
          </div>
        )}

        {/* Result View or Active Scanner */}
        {result ? (
          <div className="animate-scale-in">
            <ResultCard result={result} onReset={reset} />
          </div>
        ) : (
          <div className="w-full">
            <Scanner
              onImageSelected={analyzeImage}
              onTextSearch={analyzeText}
              isAnalyzing={isAnalyzing}
              mode={mode}
              setMode={setMode}
            />
          </div>
        )}

        {/* History List */}
        {!isAnalyzing && history.length > 0 && (
          <div className="pt-2">
            <HistoryList
              history={history}
              onSelect={handleHistorySelect}
            />
          </div>
        )}

      </div>

      {/* Safety Toast during active analysis */}
      {analyzingToast && (
        <div
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/95 dark:bg-white/95 backdrop-blur-md text-white dark:text-gray-900 px-5 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2.5 text-xs font-black animate-slide-up-fade"
        >
          <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full shrink-0" />
          <span>جاري الفحص بالذكاء الاصطناعي، يرجى الانتظار ثوانٍ...</span>
        </div>
      )}

    </div>
  );
};
