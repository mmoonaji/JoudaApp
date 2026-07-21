import React, { useState } from 'react';
import { Image as ImageIcon, Save, Edit, Trash2 } from 'lucide-react';
import { AdminContentService } from '../../services/admin/AdminContentService';
import { ImageUploadInput } from './ImageUploadInput';
import { AppImage } from '../ui/AppImage';

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
}

interface BannerManagerProps {
  banners: Banner[];
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  loadData: () => Promise<void>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const BannerManager: React.FC<BannerManagerProps> = ({
  banners,
  showSuccess,
  showError,
  loadData,
  loading,
  setLoading
}) => {
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerSort, setBannerSort] = useState(0);
  const [bannerActive, setBannerActive] = useState(true);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImage.trim()) {
      showError('رابط الصورة مطلوب للبانر');
      return;
    }

    try {
      setLoading(true);
      
      const payload: any = {
        title: bannerTitle.trim(),
        image_url: bannerImage.trim(),
        link_url: bannerLink.trim(),
        is_active: bannerActive,
        sort_order: bannerSort
      };
      
      if (bannerId) {
        payload.id = bannerId;
      }

      await AdminContentService.upsertBanner(payload);
        showSuccess('تم حفظ البانر بنجاح');
        setBannerId(null);
        setBannerTitle('');
        setBannerImage('');
        setBannerLink('');
        setBannerSort(0);
        setBannerActive(true);
        loadData();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ البانر');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البانر؟')) return;
    try {
      await AdminContentService.deleteBanner(id);
      showSuccess('تم حذف البانر');
      loadData();
    } catch (err: any) {
      showError(err.message || 'فشل حذف البانر');
    }
  };

  const handleEditBannerClick = (b: Banner) => {
    setBannerId(b.id);
    setBannerTitle(b.title || '');
    setBannerImage(b.image_url);
    setBannerLink(b.link_url || '');
    setBannerSort(b.sort_order);
    setBannerActive(b.is_active);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      {/* Banner Form */}
      <form onSubmit={handleSaveBanner} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4">
        <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
          <ImageIcon className="w-5 h-5 text-brand-600" />
          {bannerId ? 'تعديل البانر' : 'إضافة بانر إعلاني جديد'}
        </h2>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold mb-1.5">عنوان البانر (اختياري)</label>
          <input
            type="text"
            placeholder="عرض الصيف التوفيري"
            value={bannerTitle}
            onChange={e => setBannerTitle(e.target.value)}
            className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
          />
        </div>

        <div>
          <ImageUploadInput 
            value={bannerImage} 
            onChange={setBannerImage} 
            folder="banners" 
            label="صورة البانر *" 
          />
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold mb-1.5">رابط التوجيه (مثال: `cart:PKG-001` أو رابط ويب)</label>
          <input
            type="text"
            placeholder="https://..."
            value={bannerLink}
            onChange={e => setBannerLink(e.target.value)}
            className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white font-mono"
          />
        </div>

        <div className="grid gap-3 grid-cols-2">
          <div>
            <label className="block text-[10px] text-gray-400 font-bold mb-1.5">الترتيب</label>
            <input
              type="number"
              value={bannerSort}
              onChange={e => setBannerSort(parseInt(e.target.value) || 0)}
              className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white font-mono"
            />
          </div>
          <div className="flex items-center pt-5 justify-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bannerActive}
                onChange={e => setBannerActive(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 border-gray-300 focus:ring-brand-500"
              />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">نشط ومعروض</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>حفظ البانر</span>
          </button>
          {bannerId && (
            <button
              type="button"
              onClick={() => {
                setBannerId(null);
                setBannerTitle('');
                setBannerImage('');
                setBannerLink('');
                setBannerSort(0);
                setBannerActive(true);
              }}
              className="px-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      {/* Banner List */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4">
        <h2 className="text-sm font-black text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-3">البانرات الحالية ({banners.length})</h2>
        
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {banners.map(b => (
            <div key={b.id} className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/80 flex flex-col justify-between">
              <div className="w-full aspect-[2.2/1] relative bg-white overflow-hidden">
                <AppImage
                  src={b.image_url}
                  alt={b.title}
                  className="w-full h-full object-cover"
                />
                {!b.is_active && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">غير معروض</span>
                  </div>
                )}
              </div>
              
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-gray-900 dark:text-white truncate">{b.title || 'بدون عنوان'}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 truncate font-mono">الترتيب: {b.sort_order}</p>
                </div>
                
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEditBannerClick(b)}
                    className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-brand-50 text-gray-500 hover:text-brand-600 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBanner(b.id)}
                    className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <p className="col-span-2 text-center text-gray-400 py-12">لا توجد بانرات مضافة حالياً</p>
          )}
        </div>
      </div>
    </div>
  );
};
