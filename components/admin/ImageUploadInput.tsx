import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';
import { AdminContentService } from '../../services/admin/AdminContentService';
import { AppImage } from '../ui/AppImage';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  folder: string; // e.g. 'recipes', 'banners', 'articles'
  label?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ value, onChange, folder, label = 'صورة' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    try {
      setIsUploading(true);
      const url = await AdminContentService.uploadAdminImage(file, folder);
      onChange(url);
    } catch (error: any) {
      alert(error.message || 'فشل رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <label className="block text-[10px] text-gray-400 font-bold mb-1.5">{label}</label>
      
      {value ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group">
          <AppImage src={value} alt="Preview" className="w-full h-full object-cover" showLoader={false} />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button 
              type="button" 
              onClick={clearImage}
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transform scale-90 group-hover:scale-100 transition-transform shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={onDrag}
          onDragLeave={onDrag}
          onDragOver={onDrag}
          onDrop={onDrop}
          className={`relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-800/80'
          }`}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/jpeg, image/png, image/webp" 
            onChange={onFileChange}
            className="hidden" 
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center text-brand-600">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs font-bold">جاري الرفع والضغط...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
              <ImagePlus className="w-8 h-8 mb-2" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">انقر هنا لرفع صورة</span>
              <span className="text-[10px] mt-1">أو اسحب الملف وأفلته هنا</span>
              <span className="text-[9px] mt-2 opacity-70">الحد الأقصى: 10MB (سيتم ضغطها لـ 150KB تلقائياً)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
