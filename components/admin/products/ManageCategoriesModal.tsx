import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { AppCategory } from '../../../services/supabaseService';
import { AdminProductService } from '../../../services/admin/AdminProductService';

export interface ManageCategoriesModalProps {
  categories: AppCategory[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  showError: (msg: string) => void;
  showSuccess: (msg: string) => void;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({ categories, onClose, onRefresh, showError, showSuccess }) => {
  const [newCatName, setNewCatName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    setIsAdding(true);
    try {
      const newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 1;
      await AdminProductService.addAppCategory(newCatName.trim(), newOrder);
      await onRefresh();
      setNewCatName('');
      showSuccess('تمت الإضافة بنجاح');
    } catch (err: any) {
      showError(err.message || 'فشل إضافة التصنيف');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
    try {
      await AdminProductService.deleteAppCategory(id);
      await onRefresh();
      showSuccess('تم الحذف بنجاح');
    } catch (err: any) {
      showError(err.message || 'فشل حذف التصنيف');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[75vh] sm:h-auto sm:max-h-[80vh] animate-slide-up sm:animate-scale-in overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="font-black text-gray-900 dark:text-white text-lg">إدارة تصنيفات التطبيق</h2>
            <p className="text-xs text-gray-500 font-bold mt-1">تخصيص الأقسام التي تظهر للعملاء</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full active:bg-gray-200 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="اسم التصنيف الجديد..."
              className="flex-1 h-12 px-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={isAdding || !newCatName.trim()}
              className="h-12 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {isAdding ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>

          <div className="space-y-2 mt-4">
            {categories.length === 0 ? (
              <p className="text-center py-6 text-xs font-bold text-gray-400 border border-dashed rounded-xl border-gray-200 dark:border-gray-800">
                لا توجد تصنيفات مضافة بعد، أنشئ أول تصنيف لك!
              </p>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl">
                  <span className="font-bold text-sm text-gray-900 dark:text-white">{cat.name}</span>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
