import React, { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon, ScanSearch, Search, Type, Info, X } from 'lucide-react';
import { compressImage, fileToBase64 } from '../../utils/imageCompression';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

type Mode = 'camera' | 'text';

interface ScannerProps {
  onImageSelected: (base64: string) => void;
  onTextSearch: (text: string) => void;
  isAnalyzing: boolean;
  mode: Mode;
  setMode: (mode: Mode) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onImageSelected, onTextSearch, isAnalyzing, mode, setMode }) => {
  const [searchText, setSearchText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);

  const loadingMessages = [
    "جاري التعرف على المنتج...",
    "نطابقها مع لستة الممنوعات...",
    "نجهز لك النتيجة النهائية..."
  ];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAnalyzing) {
      setLoadingIndex(0);
      interval = setInterval(() => {
        setLoadingIndex((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

  const processFile = async (file: File) => {
      if (isProcessingImage || isAnalyzing) return;
      setIsProcessingImage(true);
      try {
        const compressedFile = await compressImage(file);
        const base64Data = await fileToBase64(compressedFile);
        onImageSelected(base64Data.split(',')[1]);
      } catch (error) {
        console.error("Image processing failed", error);
        const reader = new FileReader();
        reader.onloadend = () => {
           const res = reader.result as string;
           onImageSelected(res.split(',')[1]);
        };
        reader.readAsDataURL(file);
      } finally {
        setTimeout(() => setIsProcessingImage(false), 1000);
      }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim() && !isSubmittingText && !isAnalyzing) {
      setIsSubmittingText(true);
      onTextSearch(searchText);
      setTimeout(() => setIsSubmittingText(false), 1000);
    }
  };

  const triggerFileInput = async () => {
    if (isProcessingImage || isAnalyzing) return;
    
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await Camera.getPhoto({
          quality: 60,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt // Prompts user to choose Camera or Gallery natively
        });
        
        if (image.base64String) {
          onImageSelected(image.base64String);
        }
      } catch (error) {
        console.error("Capacitor camera error:", error);
        // Fallback to web input if user cancels or error occurs
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-850 rounded-[1.75rem] shadow-sm border border-gray-150/70 dark:border-gray-800 my-2 relative overflow-hidden transition-all duration-300">
      
      {/* iOS Segmented Control Capsule */}
      <div className="p-3 pb-0">
        <div className={`p-1 bg-gray-100/90 dark:bg-gray-800 rounded-2xl flex items-center gap-1 border border-gray-200/50 dark:border-gray-750 transition-opacity duration-300 ${isAnalyzing ? 'pointer-events-none opacity-50' : ''}`}>
          <button
            type="button"
            onClick={() => setMode('camera')}
            disabled={isAnalyzing}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all duration-300 select-none ${
              mode === 'camera'
                ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <CameraIcon className="w-4 h-4" />
            <span>فحص بصورة</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('text')}
            disabled={isAnalyzing}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all duration-300 select-none ${
              mode === 'text'
                ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>اكتب الاسم</span>
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 flex flex-col items-center justify-center">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center text-center animate-pulse py-8">
            <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mb-4 relative">
               <ScanSearch className="w-12 h-12 text-brand-600 animate-spin-slow" />
            </div>
            <h3 className="text-xl font-bold text-brand-600 dark:text-brand-400 min-h-[2rem] transition-all duration-300">
              {loadingMessages[loadingIndex]}
            </h3>
            <p className="text-sm text-gray-550 dark:text-gray-400 mt-2">ثواني والنتيجة تكون جاهزة</p>
          </div>
        ) : mode === 'camera' ? (
          /* Simplified Mobile-first Large Clickable Area */
          <div 
            onClick={triggerFileInput}
            className={`flex flex-col items-center justify-center text-center w-full animate-fade-in border-2 border-dashed rounded-3xl p-6 md:p-8 cursor-pointer transition-all duration-300 ${
              dragActive 
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20' 
                : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-800 hover:bg-brand-50/10 dark:hover:bg-brand-950/5'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100 dark:shadow-none mb-4 transition-transform duration-300 hover:scale-105 active:scale-95">
              <CameraIcon className="w-7 h-7 text-white" />
            </div>
            
            <h2 className="text-base font-black text-gray-900 dark:text-white mb-1.5">صوّر قائمة المكونات والتحذيرات بوضوح</h2>
            <p className="text-gray-400 dark:text-gray-500 text-xs px-4 leading-relaxed max-w-xs">
              اضغط لفتح الكاميرا — إذا كان هناك شعار خالي من الجلوتين، حاول إظهاره أيضاً
            </p>
          </div>
        ) : (
          <div className="w-full animate-fade-in flex flex-col items-center max-w-md py-2">
            <h2 className="text-base font-black text-gray-900 dark:text-white mb-1.5">البحث باسم المنتج</h2>
            <p className="text-gray-400 dark:text-gray-500 text-xs px-4 text-center mb-4">
              اكتب اسم المنتج والشركة للحصول على تحليل دقيق
            </p>

            <form onSubmit={handleTextSubmit} className="w-full">
              <div className="relative mb-2.5">
                <label htmlFor="scanner-search" className="sr-only">أدخل اسم المنتج التجاري</label>
                <input
                  id="scanner-search"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="مثال: دقيق شار خالي من الجلوتين..."
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-right font-medium pl-10 pr-10 text-sm shadow-sm"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full"
                    title="مسح النص"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Direct Search Guidance (No extra click needed) */}
              <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mb-4 justify-start pr-1">
                <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span>عشان تكون النتيجة دقيقة: اكتب اسم المنتج مع الماركة</span>
              </div>

              <button
                type="submit"
                disabled={!searchText.trim() || isSubmittingText || isAnalyzing}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-200 dark:shadow-none active:scale-[0.98]"
              >
                <Search className="w-4 h-4" />
                <span>افحص المنتج</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
