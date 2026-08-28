
import React, { useState } from 'react';
import { History, Clock, ChevronLeft, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { AnalysisResult, VerdictType } from '../../types';

interface HistoryListProps {
  history: AnalysisResult[];
  onSelect: (item: AnalysisResult) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (history.length === 0) {
    return null;
  }

  const getVerdictColor = (verdict: VerdictType) => {
    switch (verdict) {
      case VerdictType.SAFE: return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30';
      case VerdictType.RISKY: return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-900/30';
      case VerdictType.UNSAFE: return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700';
    }
  };

  const formatTime = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('ar-EG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Determine which items to show
  const visibleHistory = isExpanded ? history : history.slice(0, 2);

  return (
    <div className="w-full mt-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-brand-50 dark:bg-brand-950/40 p-1.5 rounded-xl text-brand-600 dark:text-brand-400">
             <History className="w-4 h-4" />
          </div>
          <h3 className="text-base font-black text-gray-900 dark:text-white">
            {isExpanded ? 'سجل الفحص الكامل' : 'آخر الفحوصات'}
          </h3>
        </div>
        
        {!isExpanded && history.length > 2 && (
           <span className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-full">
             +{history.length - 2}
           </span>
        )}
      </div>

      <div className={`space-y-3 ${isExpanded ? 'md:grid md:grid-cols-2 md:gap-3 md:space-y-0' : ''}`}>
        {visibleHistory.map((item) => (
          <button
            key={item.timestamp}
            onClick={() => onSelect(item)}
            className="w-full bg-white dark:bg-gray-850 border border-gray-150/80 dark:border-gray-750 rounded-2xl p-3 flex items-center gap-3 shadow-xs hover:shadow-sm transition-all active:scale-[0.99] group hover:border-brand-200 dark:hover:border-brand-900/50"
          >
            {/* Thumbnail */}
            <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-100 dark:border-gray-700 relative">
              {item.imageUrl ? (
                <img 
                  src={`data:image/jpeg;base64,${item.imageUrl}`} 
                  alt="Scan thumbnail" 
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-300 dark:text-gray-500" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 text-right min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getVerdictColor(item.verdict)}`}>
                  {item.verdictTitle}
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-[10px]">
                <Clock className="w-3 h-3" />
                <span>{formatTime(item.timestamp)}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 font-medium">
                {item.analysis.substring(0, 40)}...
              </p>
            </div>

            {/* Arrow */}
            <div className="text-gray-300 dark:text-gray-600 group-hover:text-brand-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </div>
          </button>
        ))}
      </div>

      {/* Show More / Show Less Button */}
      {history.length > 2 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-center gap-1 transition-colors"
        >
          {isExpanded ? (
            <>
              <span>عرض أقل</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>عرض السجل الكامل ({history.length})</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
};
