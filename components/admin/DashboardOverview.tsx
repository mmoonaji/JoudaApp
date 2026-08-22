import React, { useState, useEffect } from 'react';
import { Activity, Package, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface DashboardOverviewProps {
  showError: (msg: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ showError }) => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    lastSyncTime: '',
    syncStatus: 'success',
    syncError: '',
    syncCount: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      // Products count
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('is_active', { count: 'exact' });

      if (productsError) throw productsError;

      // Sync logs
      const { data: syncData, error: syncError } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('sync_type', 'products')
        .order('created_at', { ascending: false })
        .limit(1);

      if (syncError) throw syncError;

      setStats({
        totalProducts: productsData?.length || 0,
        activeProducts: productsData?.filter(p => p.is_active).length || 0,
        lastSyncTime: syncData && syncData.length > 0 ? new Date(syncData[0].created_at).toLocaleString('en-GB') : 'غير متوفر',
        syncStatus: syncData && syncData.length > 0 ? syncData[0].status : 'unknown',
        syncError: syncData && syncData.length > 0 ? syncData[0].error_message || '' : '',
        syncCount: syncData && syncData.length > 0 ? syncData[0].items_count || 0 : 0
      });
    } catch (err: any) {
      showError(err.message || 'فشل تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-600" />
            نظرة عامة على النظام
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-bold">ملخص سريع لحالة المزامنة والمنتجات</p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Products Stat */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl flex items-center gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-bold mb-1">المنتجات المفعلة</p>
            <div className="flex items-end gap-2">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                {stats.activeProducts}
              </h3>
              <span className="text-[10px] text-gray-400 font-bold">من أصل {stats.totalProducts}</span>
            </div>
          </div>
        </div>

        {/* Sync Status Stat */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl flex items-center gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            stats.syncStatus === 'success' 
              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
              : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
          }`}>
            {stats.syncStatus === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-bold mb-1">حالة المزامنة مع الكاشير</p>
            <h3 className={`text-sm font-black leading-none ${
              stats.syncStatus === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {stats.syncStatus === 'success' ? 'مستقرة (نجاح)' : 'يوجد خطأ'}
            </h3>
            {stats.syncError && <p className="text-[10px] text-red-500 mt-1 line-clamp-1">{stats.syncError}</p>}
          </div>
        </div>

        {/* Last Sync Time */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl flex items-center gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-bold mb-1">آخر عملية مزامنة</p>
            <h3 className="text-sm font-black text-gray-900 dark:text-white leading-none" dir="ltr">
              {stats.lastSyncTime}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 font-bold">تم مزامنة {stats.syncCount} منتج</p>
          </div>
        </div>
      </div>
    </div>
  );
};
