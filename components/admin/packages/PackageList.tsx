import React from 'react';
import { Edit2, Trash2, Power, PowerOff, Gift, Clock } from 'lucide-react';
import { Product } from '../../../services/supabaseService';
import { AdminProductService } from '../../../services/admin/AdminProductService';
import { AppImage } from '../../ui/AppImage';

interface PackageListProps {
  packages: Product[];
  onEdit: (pkg: Product) => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  loadData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const PackageList: React.FC<PackageListProps> = ({
  packages,
  onEdit,
  showSuccess,
  showError,
  loadData,
  setLoading
}) => {
  const handleToggleStatus = async (pkg: Product) => {
    try {
      setLoading(true);
      await AdminProductService.togglePackageStatus(pkg.barcode, !pkg.is_active);
      showSuccess(`تم ${!pkg.is_active ? 'تفعيل' : 'إيقاف'} البكج بنجاح`);
      await loadData();
    } catch (err: any) {
      showError(err.message || 'فشل تحديث حالة البكج');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pkg: Product) => {
    if (!window.confirm(`هل أنت متأكد من حذف البكج "${pkg.name}" نهائياً؟`)) return;
    try {
      setLoading(true);
      await AdminProductService.deletePackage(pkg.barcode);
      showSuccess('تم حذف البكج بنجاح');
      await loadData();
    } catch (err: any) {
      showError(err.message || 'فشل حذف البكج');
    } finally {
      setLoading(false);
    }
  };

  if (packages.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-12 rounded-3xl text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Gift className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        </div>
        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">لا توجد بكجات حالياً</h3>
        <p className="text-gray-500 text-sm">قم بإنشاء بكج توفيري جديد لزيادة مبيعاتك!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {packages.map(pkg => {
        const isExpired = pkg.valid_until && new Date(pkg.valid_until) < new Date();
        const statusColor = !pkg.is_active ? 'bg-gray-100 text-gray-500' : isExpired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600';
        const statusText = !pkg.is_active ? 'متوقف' : isExpired ? 'منتهي الصلاحية' : 'نشط';

        return (
          <div key={pkg.barcode} className={`bg-white dark:bg-gray-900 border ${!pkg.is_active ? 'border-gray-100 dark:border-gray-800 opacity-70' : 'border-amber-100 dark:border-amber-900/30'} p-4 rounded-3xl flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-lg`}>
            
            {/* Status Badge */}
            <div className={`absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusColor} flex items-center gap-1`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              {statusText}
            </div>

            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-gray-700">
                <AppImage
                  src={pkg.image_url}
                  alt={pkg.name}
                  className="w-full h-full object-cover"
                  fallback={<div className="w-full h-full flex items-center justify-center"><Gift className="w-6 h-6 text-gray-300 dark:text-gray-600" /></div>}
                />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{pkg.name}</h3>
                <p className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400 mt-1">{pkg.price}<span className="saudi-riyal mr-1">{"\u00ea"}</span></p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{pkg.barcode}</p>
              </div>
            </div>

            {pkg.valid_until && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl">
                <Clock className="w-3.5 h-3.5" />
                <span>ينتهي العرض:</span>
                <span className="font-mono font-bold" dir="ltr">
                  {new Date(pkg.valid_until).toLocaleString('en-GB', { 
                    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
                  })}
                </span>
              </div>
            )}

            <div className="flex gap-2 mt-auto pt-4 border-t border-gray-50 dark:border-gray-800">
              <button
                onClick={() => onEdit(pkg)}
                className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
              <button
                onClick={() => handleToggleStatus(pkg)}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center transition-colors ${
                  pkg.is_active 
                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40' 
                    : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40'
                }`}
                title={pkg.is_active ? 'إيقاف البكج' : 'تفعيل البكج'}
              >
                {pkg.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleDelete(pkg)}
                className="py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center transition-colors"
                title="حذف البكج"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
