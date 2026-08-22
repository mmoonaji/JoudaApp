import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import {
  getPendingOrders,
  removePendingOrder,
  updatePendingOrderError,
  getPendingOrdersCount,
} from '../services/db';
import { submitOrderToSupabase } from '../services/supabaseService';

interface SyncContextType {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  syncErrors: string[];
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// M3: ترجمة رسائل الأخطاء التقنية لرسائل عربية مفهومة للمستخدم
const friendlyErrorMessage = (message: string | undefined): string => {
  if (!message) return 'حدث خطأ غير متوقع';
  const lower = message.toLowerCase();
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch'))
    return 'تعذر الاتصال بالخادم';
  if (lower.includes('timeout')) return 'انتهت مهلة الاتصال';
  if (lower.includes('cors')) return 'مشكلة في إعدادات الاتصال';
  if (lower.includes('quota')) return 'مساحة التخزين ممتلئة';
  return 'تعذر إرسال الطلب، سنحاول مرة أخرى';
};

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  // M2: refs لتجنب إعادة إنشاء الـ interval مع كل تغيير في state
  const isSyncingRef = useRef(isSyncing);
  const pendingCountRef = useRef(pendingCount);
  useEffect(() => { isSyncingRef.current = isSyncing; }, [isSyncing]);
  useEffect(() => { pendingCountRef.current = pendingCount; }, [pendingCount]);

  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingOrdersCount();
      setPendingCount(count);
    } catch (e) {}
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    if (isSyncingRef.current) return;

    setIsSyncing(true);
    setSyncErrors([]);
    const errors: string[] = [];

    try {
      const pending = await getPendingOrders();

      for (const order of pending) {
        try {
          const result = await submitOrderToSupabase(order.payload);

          if (result.success) {
            await removePendingOrder(order.id);
          } else {
            await updatePendingOrderError(order.id, result.message);
            // M3: رسائل عربية مفهومة بدل رسائل تقنية
            errors.push(friendlyErrorMessage(result.message));
          }
        } catch (error: any) {
          await updatePendingOrderError(order.id, error.message || 'Unknown error');
          // M3: رسائل عربية مفهومة
          errors.push(friendlyErrorMessage(error.message));
        }
      }

      setLastSyncTime(new Date());
      if (errors.length > 0) {
        setSyncErrors(errors);
      }
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      await updatePendingCount();
      setIsSyncing(false);
    }
  }, [updatePendingCount]);

  // Listen for online and pending-order events
  // M2: triggerSync الآن مستقر لأنه يستخدم ref بدل state
  useEffect(() => {
    const handleOnline = () => {
      triggerSync();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('jouda:pending-orders-changed', updatePendingCount);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('jouda:pending-orders-changed', updatePendingCount);
    };
  }, [triggerSync, updatePendingCount]);

  // M2: Check pending count on mount and periodically
  // الـ interval يُنشأ مرة واحدة فقط ويستخدم refs للقيم المتغيرة
  useEffect(() => {
    updatePendingCount();

    const interval = setInterval(() => {
      updatePendingCount();
      // Auto-sync if online and has pending orders
      if (navigator.onLine && pendingCountRef.current > 0 && !isSyncingRef.current) {
        triggerSync();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [updatePendingCount, triggerSync]);

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        pendingCount,
        lastSyncTime,
        syncErrors,
        triggerSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
