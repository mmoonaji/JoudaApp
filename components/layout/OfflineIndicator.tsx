import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  RefreshCw,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { useSync } from '../../contexts/SyncContext';
import { useOnlineStatus } from '../../hooks/index';

const OFFLINE_NOTICE_MS = 6000;
const ONLINE_NOTICE_MS = 4500;

type NoticeVariant = 'offline' | 'connected' | 'syncing' | 'synced' | 'sync-error';
type ActiveOnlineNotice = Exclude<NoticeVariant, 'offline' | 'syncing'>;
type OnlineNotice = ActiveOnlineNotice | null;

const NOTICE_STYLES: Record<NoticeVariant, string> = {
  offline: 'bg-amber-600/95 dark:bg-amber-700/95 border-amber-500/20 shadow-[0_8px_32px_rgba(217,119,6,0.15)]',
  connected: 'bg-blue-600/95 dark:bg-blue-700/95 border-blue-500/20 shadow-[0_8px_32px_rgba(37,99,235,0.15)]',
  syncing: 'bg-emerald-600/95 dark:bg-emerald-700/95 border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.15)]',
  synced: 'bg-emerald-600/95 dark:bg-emerald-700/95 border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.15)]',
  'sync-error': 'bg-red-600/95 dark:bg-red-700/95 border-red-500/20 shadow-[0_8px_32px_rgba(220,38,38,0.16)]',
};

const NOTICE_ICONS: Record<NoticeVariant, LucideIcon> = {
  offline: WifiOff,
  connected: Cloud,
  syncing: RefreshCw,
  synced: CheckCircle2,
  'sync-error': AlertTriangle,
};

const pendingStatus = (pendingCount: number) => {
  if (pendingCount === 0) return null;
  if (pendingCount === 1) return 'طلب محفوظ';
  return `${pendingCount} طلبات محفوظة`;
};

const onlineNoticeContent = (onlineNotice: ActiveOnlineNotice, pendingCount: number) => {
  if (onlineNotice === 'connected') {
    return {
      title: 'رجع الاتصال',
      description: pendingCount > 0 ? 'جاري إرسال طلباتك المحفوظة...' : 'تقدر تكمل الطلب بشكل طبيعي',
    };
  }

  if (onlineNotice === 'synced') {
    return {
      title: 'تم إرسال الطلب',
      description: 'وصل طلبك للمتجر بنجاح',
    };
  }

  return {
    title: 'ما قدرنا نرسل الطلب',
    description: 'الطلب ما زال محفوظ، وبنحاول مرة ثانية تلقائياً',
  };
};

const IndicatorShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-sm px-1.5 pointer-events-none animate-slide-down">
    <div className="pointer-events-auto">{children}</div>
  </div>
);

const NoticeCard: React.FC<{ variant: NoticeVariant; title: string; description: string }> = ({
  variant,
  title,
  description,
}) => {
  const Icon = NOTICE_ICONS[variant];
  const iconMotion = variant === 'syncing' ? 'animate-spin' : variant === 'offline' ? 'animate-pulse' : '';

  return (
    <div className={`${NOTICE_STYLES[variant]} text-white backdrop-blur-md p-3.5 rounded-2xl border flex items-center gap-3.5`}>
      <div className="w-9 h-9 bg-white/10 dark:bg-black/10 rounded-xl flex items-center justify-center shrink-0">
        <Icon className={`w-5 h-5 ${iconMotion}`} />
      </div>
      <div className="flex-1 min-w-0 text-right">
        <h4 className="font-black text-xs">{title}</h4>
        <p className="text-[10px] text-white/80 font-bold mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

const OfflinePill: React.FC<{ pendingStatusText: string | null }> = ({ pendingStatusText }) => (
  <div className="mx-auto w-max max-w-full rounded-full bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 px-3 py-2 shadow-lg backdrop-blur-md border border-white/10 flex items-center gap-2 text-[11px] font-black">
    <WifiOff className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
    <span>بدون اتصال{pendingStatusText ? ` • ${pendingStatusText}` : ''}</span>
  </div>
);

const PendingPill: React.FC<{ pendingStatusText: string }> = ({ pendingStatusText }) => (
  <div className="mx-auto w-max max-w-full rounded-full bg-blue-600/95 dark:bg-blue-700/95 text-white px-3 py-2 shadow-lg backdrop-blur-md border border-blue-500/20 flex items-center gap-2 text-[11px] font-black">
    <CloudOff className="w-3.5 h-3.5 text-blue-100" />
    <span>{pendingStatusText} • بنرسله تلقائياً</span>
  </div>
);

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { isSyncing, pendingCount, lastSyncTime, syncErrors } = useSync();
  const [showOfflineNotice, setShowOfflineNotice] = useState(!isOnline);
  const [onlineNotice, setOnlineNotice] = useState<OnlineNotice>(null);
  const previousOnlineRef = useRef(isOnline);
  const previousSyncingRef = useRef(isSyncing);
  const syncStartedWithPendingRef = useRef(false);
  const pendingStatusText = useMemo(() => pendingStatus(pendingCount), [pendingCount]);

  useEffect(() => {
    const wasOnline = previousOnlineRef.current;
    previousOnlineRef.current = isOnline;

    if (!isOnline) {
      setOnlineNotice(null);
      setShowOfflineNotice(true);
      const timer = window.setTimeout(() => setShowOfflineNotice(false), OFFLINE_NOTICE_MS);
      return () => window.clearTimeout(timer);
    }

    setShowOfflineNotice(false);

    if (!wasOnline) {
      setOnlineNotice('connected');
      const timer = window.setTimeout(() => setOnlineNotice(null), ONLINE_NOTICE_MS);
      return () => window.clearTimeout(timer);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isSyncing) {
      if (pendingCount > 0) {
        syncStartedWithPendingRef.current = true;
      }
      previousSyncingRef.current = true;
      setOnlineNotice(null);
      return;
    }

    const wasSyncing = previousSyncingRef.current;
    previousSyncingRef.current = false;

    if (wasSyncing && syncStartedWithPendingRef.current && lastSyncTime) {
      setOnlineNotice(syncErrors.length > 0 || pendingCount > 0 ? 'sync-error' : 'synced');
      syncStartedWithPendingRef.current = false;
      const timer = window.setTimeout(() => setOnlineNotice(null), ONLINE_NOTICE_MS);
      return () => window.clearTimeout(timer);
    }
  }, [isSyncing, lastSyncTime, pendingCount, syncErrors.length]);

  if (!isOnline) {
    return (
      <IndicatorShell>
        {showOfflineNotice ? (
          <NoticeCard
            variant="offline"
            title="الإنترنت مقطوع"
            description="تقدر تتصفح المنتجات المحفوظة، وأي طلب ترسله بنحفظه لين ترجع الشبكة"
          />
        ) : (
          <OfflinePill pendingStatusText={pendingStatusText} />
        )}
      </IndicatorShell>
    );
  }

  if (isSyncing) {
    return (
      <IndicatorShell>
        <NoticeCard variant="syncing" title="جاري إرسال طلباتك المحفوظة..." description="بنرسل الطلبات للمتجر حالياً" />
      </IndicatorShell>
    );
  }

  if (onlineNotice) {
    const content = onlineNoticeContent(onlineNotice, pendingCount);
    return (
      <IndicatorShell>
        <NoticeCard variant={onlineNotice} title={content.title} description={content.description} />
      </IndicatorShell>
    );
  }

  if (pendingStatusText) {
    return (
      <IndicatorShell>
        <PendingPill pendingStatusText={pendingStatusText} />
      </IndicatorShell>
    );
  }

  return null;
};
