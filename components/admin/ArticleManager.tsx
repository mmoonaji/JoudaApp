import React, { useState } from 'react';
import { BookOpen, Save, Edit, Trash2 } from 'lucide-react';
import { Article } from '../../services/supabaseService';
import { AdminContentService } from '../../services/admin/AdminContentService';
import { ImageUploadInput } from './ImageUploadInput';
import { AppImage } from '../ui/AppImage';

interface ArticleManagerProps {
  articles: Article[];
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  loadData: () => Promise<void>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ArticleManager: React.FC<ArticleManagerProps> = ({
  articles,
  showSuccess,
  showError,
  loadData,
  loading,
  setLoading
}) => {
  const [articleId, setArticleId] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleImage, setArticleImage] = useState('');
  const [articleAuthor, setArticleAuthor] = useState('جوده');
  const [articlePublishDate, setArticlePublishDate] = useState('');

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleTitle.trim()) {
      showError('عنوان المقال مطلوب');
      return;
    }

    try {
      setLoading(true);
      
      const payload: any = {
        title: articleTitle.trim(),
        content: articleContent.trim(),
        image_url: articleImage.trim(),
        author: articleAuthor.trim(),
        published_date: articlePublishDate.trim() || new Date().toLocaleDateString('ar-YE')
      };
      
      if (articleId) {
        payload.id = articleId;
      }

      await AdminContentService.upsertArticle(payload);
        showSuccess('تم حفظ المقال بنجاح');
        setArticleId(null);
        setArticleTitle('');
        setArticleContent('');
        setArticleImage('');
        setArticleAuthor('جوده');
        setArticlePublishDate('');
        loadData();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ المقال');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المقال؟')) return;
    try {
      await AdminContentService.deleteArticle(id);
      showSuccess('تم حذف المقال');
      loadData();
    } catch (err: any) {
      showError(err.message || 'فشل حذف المقال');
    }
  };

  const handleEditArticleClick = (a: Article) => {
    setArticleId(a.id);
    setArticleTitle(a.title);
    setArticleContent(a.content || '');
    setArticleImage(a.image_url || a.image || '');
    setArticleAuthor(a.author || 'جوده');
    setArticlePublishDate(a.published_date || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      {/* Article Form */}
      <form onSubmit={handleSaveArticle} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4">
        <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
          <BookOpen className="w-5 h-5 text-brand-650" />
          {articleId ? 'تعديل المقال' : 'إضافة مقال جديد'}
        </h2>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold mb-1.5">عنوان المقال *</label>
          <input
            type="text"
            placeholder="كيف تعيش بأمان مع السلياك؟"
            required
            value={articleTitle}
            onChange={e => setArticleTitle(e.target.value)}
            className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
          />
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <ImageUploadInput 
              value={articleImage} 
              onChange={setArticleImage} 
              folder="articles" 
              label="صورة المقال" 
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold mb-1.5">الكاتب</label>
            <input
              type="text"
              placeholder="جوده"
              value={articleAuthor}
              onChange={e => setArticleAuthor(e.target.value)}
              className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold mb-1.5">محتوى المقال (Markdown)</label>
          <textarea
            rows={10}
            placeholder="الموضوع بالتفصيل..."
            value={articleContent}
            onChange={e => setArticleContent(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>حفظ المقال</span>
          </button>
          {articleId && (
            <button
              type="button"
              onClick={() => {
                setArticleId(null);
                setArticleTitle('');
                setArticleContent('');
                setArticleImage('');
                setArticleAuthor('جوده');
                setArticlePublishDate('');
              }}
              className="px-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      {/* Articles List */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4">
        <h2 className="text-sm font-black text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-3">المقالات الحالية ({articles.length})</h2>
        
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {articles.map(a => (
            <div key={a.id} className="bg-gray-50 dark:bg-gray-850 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/80 flex flex-col justify-between">
              <div className="w-full aspect-[2/1] relative bg-white overflow-hidden">
                <AppImage
                  src={a.image_url || a.image}
                  alt={a.title}
                  className="w-full h-full object-cover"
                  fallback={<div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-850"><BookOpen className="text-gray-300 w-12 h-12" /></div>}
                />
              </div>
              
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-gray-900 dark:text-white truncate">{a.title}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 truncate">بواسطة: {a.author} | {a.published_date || 'تاريخ غير محدد'}</p>
                </div>
                
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEditArticleClick(a)}
                    className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-brand-50 text-gray-500 hover:text-brand-600 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(a.id)}
                    className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {articles.length === 0 && (
            <p className="col-span-2 text-center text-gray-400 py-12">لا توجد مقالات مضافة حالياً</p>
          )}
        </div>
      </div>
    </div>
  );
};
