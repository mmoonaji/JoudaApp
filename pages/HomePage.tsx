import React, { useState, useEffect, useCallback } from 'react';
import { useScanHistory } from '../hooks/useScanHistory';
import { useAnalyzer } from '../hooks/useAnalyzer';
import { useBackButton } from '../hooks';
import { DashboardView } from '../components/home/DashboardView';
import { ScannerView } from '../components/home/ScannerView';
import { AnalysisResult } from '../types';

export const HomePage: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
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

  // #25: Direct prop instead of window.dispatchEvent — DashboardView is a child of this component
  const handleOpenScanner = useCallback(() => setShowScanner(true), []);

  // Handle android back button for scanner view
  // #19: Show feedback toast when back is pressed during active analysis
  useBackButton(showScanner || !!result, () => {
    if (isAnalyzing) {
      setAnalyzingToast(true);
      setTimeout(() => setAnalyzingToast(false), 2000);
      return;
    }
    handleCloseScanner();
  });

  const handleHistorySelect = (item: AnalysisResult) => {
    setResult(item);
    setShowScanner(true);
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    reset();
  };

  const handleClearError = () => {
    setError(false);
    setErrorMessage(null);
  };

  return (
    <>
      {!showScanner && !result ? (
        <DashboardView onOpenScanner={handleOpenScanner} />
      ) : (
        <ScannerView
          isAnalyzing={isAnalyzing}
          result={result}
          history={history}
          errorMessage={errorMessage}
          onClose={handleCloseScanner}
          onImageSelected={analyzeImage}
          onTextSearch={analyzeText}
          onHistorySelect={handleHistorySelect}
          onResetAnalysis={reset}
          onClearError={handleClearError}
        />
      )}

      {/* #19: Feedback toast when back is pressed during analysis */}
      {analyzingToast && (
        <div
          aria-live="polite"
          className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-gray-900/90 dark:bg-white/90 backdrop-blur text-white dark:text-gray-900 px-5 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-slide-up-fade text-sm font-bold"
        >
          <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full shrink-0" />
          <span>جاري التحليل، انتظر لحظة...</span>
        </div>
      )}
    </>
  );
};
