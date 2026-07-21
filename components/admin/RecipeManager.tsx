import React, { useState } from 'react';
import { ChefHat, Save, Edit, Trash2 } from 'lucide-react';
import { Recipe } from '../../services/supabaseService';
import { AdminContentService } from '../../services/admin/AdminContentService';
import { ImageUploadInput } from './ImageUploadInput';
import { AppImage } from '../ui/AppImage';

interface RecipeManagerProps {
  recipes: Recipe[];
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  loadData: () => Promise<void>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const RecipeManager: React.FC<RecipeManagerProps> = ({
  recipes,
  showSuccess,
  showError,
  loadData,
  loading,
  setLoading
}) => {
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeTime, setRecipeTime] = useState('');
  const [recipeDifficulty, setRecipeDifficulty] = useState('سهل');
  const [recipeCalories, setRecipeCalories] = useState('');
  const [recipeMainProduct, setRecipeMainProduct] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<string[]>([]);
  const [recipeSteps, setRecipeSteps] = useState<string[]>([]);
  const [recipeImage, setRecipeImage] = useState('');
  const [recipeVideo, setRecipeVideo] = useState('');

  // Add Item to Array inputs
  const [newIngredient, setNewIngredient] = useState('');
  const [newStep, setNewStep] = useState('');

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setRecipeIngredients(prev => [...prev, newIngredient.trim()]);
      setNewIngredient('');
    }
  };
  const addStep = () => {
    if (newStep.trim()) {
      setRecipeSteps(prev => [...prev, newStep.trim()]);
      setNewStep('');
    }
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeTitle.trim()) {
      showError('عنوان الوصفة مطلوب');
      return;
    }

    try {
      setLoading(true);
      
      const payload: any = {
        title: recipeTitle.trim(),
        description: recipeDescription.trim(),
        time: recipeTime.trim(),
        difficulty: recipeDifficulty,
        calories: recipeCalories.trim(),
        main_product: recipeMainProduct.trim(),
        ingredients: recipeIngredients,
        steps: recipeSteps,
        image_url: recipeImage.trim(),
        video_url: recipeVideo.trim()
      };
      
      if (recipeId) {
        payload.id = recipeId;
      }

      await AdminContentService.upsertRecipe(payload);
        showSuccess('تم حفظ الوصفة بنجاح');
        setRecipeId(null);
        setRecipeTitle('');
        setRecipeDescription('');
        setRecipeTime('');
        setRecipeDifficulty('سهل');
        setRecipeCalories('');
        setRecipeMainProduct('');
        setRecipeIngredients([]);
        setRecipeSteps([]);
        setRecipeImage('');
        setRecipeVideo('');
        loadData();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ الوصفة');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوصفة؟')) return;
    try {
      await AdminContentService.deleteRecipe(id);
      showSuccess('تم حذف الوصفة');
      loadData();
    } catch (err: any) {
      showError(err.message || 'فشل حذف الوصفة');
    }
  };

  const handleEditRecipeClick = (r: Recipe) => {
    setRecipeId(r.id);
    setRecipeTitle(r.title);
    setRecipeDescription(r.description || '');
    setRecipeTime(r.time || '');
    setRecipeDifficulty(r.difficulty || 'سهل');
    setRecipeCalories(r.calories || '');
    setRecipeMainProduct(r.main_product || '');
    setRecipeIngredients(r.ingredients || []);
    setRecipeSteps(r.steps || []);
    setRecipeImage(r.image_url || r.image || '');
    setRecipeVideo(r.video_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
      {/* Recipe Form */}
      <form onSubmit={handleSaveRecipe} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4">
        <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-3">
          <ChefHat className="w-5 h-5 text-orange-500" />
          {recipeId ? 'تعديل الوصفة' : 'إضافة وصفة جديدة'}
        </h2>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] text-gray-400 font-bold mb-1.5">عنوان الوصفة *</label>
            <input
              type="text"
              placeholder="معكرونة الغلوتين اللذيذة"
              required
              value={recipeTitle}
              onChange={e => setRecipeTitle(e.target.value)}
              className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold mb-1.5">وقت التحضير (مثال: `30 دقيقة`)</label>
            <input
              type="text"
              placeholder="30 دقيقة"
              value={recipeTime}
              onChange={e => setRecipeTime(e.target.value)}
              className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold mb-1.5">الصعوبة</label>
            <select
              value={recipeDifficulty}
              onChange={e => setRecipeDifficulty(e.target.value)}
              className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none dark:text-white"
            >
              <option value="سهل">سهل</option>
              <option value="متوسط">متوسط</option>
              <option value="صعب">صعب</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold mb-1.5">السعرات الحرارية (اختياري)</label>
            <input
              type="text"
              placeholder="350 سعرة"
              value={recipeCalories}
              onChange={e => setRecipeCalories(e.target.value)}
              className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold mb-1.5">باركود المنتج الأساسي للوصفة (شراء سريع)</label>
          <input
            type="text"
            placeholder="6291000000000"
            value={recipeMainProduct}
            onChange={e => setRecipeMainProduct(e.target.value)}
            className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white font-mono"
          />
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div>
            <ImageUploadInput 
              value={recipeImage} 
              onChange={setRecipeImage} 
              folder="recipes" 
              label="صورة الوصفة *" 
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold mb-1.5">رابط فيديو اليوتيوب</label>
            <input
              type="text"
              placeholder="https://youtube.com/..."
              value={recipeVideo}
              onChange={e => setRecipeVideo(e.target.value)}
              className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 font-bold mb-1.5">نبذة عن الوصفة</label>
          <textarea
            rows={2}
            placeholder="وصف مبسط للطعم والمميزات..."
            value={recipeDescription}
            onChange={e => setRecipeDescription(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none resize-none dark:text-white"
          />
        </div>

        {/* Ingredients builder */}
        <div className="border-t border-gray-50 dark:border-gray-800 pt-3">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">المكونات والمقادير</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="مثال: كوبين دقيق خالي من الغلوتين"
              value={newIngredient}
              onChange={e => setNewIngredient(e.target.value)}
              className="flex-1 h-9 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none dark:text-white"
            />
            <button
              type="button"
              onClick={addIngredient}
              className="px-3 bg-gray-900 dark:bg-brand-600 text-white rounded-lg text-xs font-bold"
            >
              أضف
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
            {recipeIngredients.map((ing, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-[10px] font-bold text-gray-700 dark:text-gray-300">
                <span>{ing}</span>
                <button type="button" onClick={() => setRecipeIngredients(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Steps builder */}
        <div className="border-t border-gray-50 dark:border-gray-800 pt-3">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">خطوات التحضير</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="مثال: يخلط الدقيق مع البيكنج باودر..."
              value={newStep}
              onChange={e => setNewStep(e.target.value)}
              className="flex-1 h-9 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none dark:text-white"
            />
            <button
              type="button"
              onClick={addStep}
              className="px-3 bg-gray-900 dark:bg-brand-600 text-white rounded-lg text-xs font-bold"
            >
              أضف
            </button>
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {recipeSteps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg">
                <span className="w-4 h-4 bg-orange-100 dark:bg-orange-950/40 text-orange-600 rounded-full flex items-center justify-center shrink-0">{i+1}</span>
                <span className="flex-1 leading-snug">{step}</span>
                <button type="button" onClick={() => setRecipeSteps(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 border-t border-gray-50 dark:border-gray-800 pt-3">
          <button
            type="submit"
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>حفظ الوصفة</span>
          </button>
          {recipeId && (
            <button
              type="button"
              onClick={() => {
                setRecipeId(null);
                setRecipeTitle('');
                setRecipeDescription('');
                setRecipeTime('');
                setRecipeDifficulty('سهل');
                setRecipeCalories('');
                setRecipeMainProduct('');
                setRecipeIngredients([]);
                setRecipeSteps([]);
                setRecipeImage('');
                setRecipeVideo('');
              }}
              className="px-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>

      {/* Recipes List */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4">
        <h2 className="text-sm font-black text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-3">الوصفات الحالية ({recipes.length})</h2>
        
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {recipes.map(r => (
            <div key={r.id} className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/80 flex flex-col justify-between">
              <div className="w-full aspect-[16/10] relative bg-white overflow-hidden">
                <AppImage
                  src={r.image_url || r.image}
                  alt={r.title}
                  className="w-full h-full object-cover"
                  fallback={<div className="w-full h-full flex items-center justify-center bg-orange-50/50"><ChefHat className="text-orange-350 w-12 h-12" /></div>}
                />
              </div>
              
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-gray-900 dark:text-white truncate">{r.title}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5 truncate">{r.time || 'بدون وقت المحدد'} | الصعوبة: {r.difficulty}</p>
                </div>
                
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEditRecipeClick(r)}
                    className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-brand-50 text-gray-500 hover:text-brand-600 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRecipe(r.id)}
                    className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {recipes.length === 0 && (
            <p className="col-span-2 text-center text-gray-400 py-12">لا توجد وصفات مضافة حالياً</p>
          )}
        </div>
      </div>
    </div>
  );
};
