import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingOrdersCount();
      setPendingCount(count);
    } catch (e) {}
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    if (isSyncing) return;

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
            errors.push(`طلب ${order.id}: ${result.message}`);
          }
        } catch (error: any) {
          await updatePendingOrderError(order.id, error.message || 'Unknown error');
          errors.push(`طلب ${order.id}: ${error.message || 'خطأ غير معروف'}`);
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
  }, [isSyncing, updatePendingCount]);

  // Listen for online and pending-order events
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

  // Check pending count on mount and periodically
  useEffect(() => {
    updatePendingCount();

    const interval = setInterval(() => {
      updatePendingCount();
      // Auto-sync if online and has pending orders
      if (navigator.onLine && pendingCount > 0 && !isSyncing) {
        triggerSync();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [updatePendingCount, pendingCount, isSyncing, triggerSync]);

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
