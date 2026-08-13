import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Wrench, Clock, Shield } from 'lucide-react';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

const AdminLogin = lazy(() => import('./pages/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminPasswordReset = lazy(() => import('./pages/AdminPasswordReset').then(m => ({ default: m.AdminPasswordReset })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ProductsPageRoute = lazy(() => import('./pages/ProductsPageRoute').then(m => ({ default: m.ProductsPageRoute })));
const RecipesPageRoute = lazy(() => import('./pages/RecipesPageRoute').then(m => ({ default: m.RecipesPageRoute })));
const ArticlesPageRoute = lazy(() => import('./pages/ArticlesPageRoute').then(m => ({ default: m.ArticlesPageRoute })));
const ArticlePage = lazy(() => import('./pages/ArticlePage').then(m => ({ default: m.ArticlePage })));
const AboutPageRoute = lazy(() => import('./pages/AboutPageRoute').then(m => ({ default: m.AboutPageRoute })));
const HealthPage = lazy(() => import('./pages/HealthPage').then(m => ({ default: m.HealthPage })));
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })));
import { Onboarding } from './components/ui/Onboarding';
import { OfflineIndicator } from './components/layout/OfflineIndicator';
import { useScrollToTop, useLocalStorage, handleBackButton } from './hooks';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SyncProvider } from './contexts/SyncContext';
import { supabase } from './services/supabaseClient';
import { AdminLayout } from './components/admin/AdminLayout';
import { ReloadPrompt } from './components/common/ReloadPrompt';
import {
  fetchPublicSettingsFromSupabase,
  refreshPublicSettingsFromSupabase,
} from './services/supabaseService';

const ONBOARDING_KEY = 'jouda_onboarding_seen_v1';

const MaintenancePage: React.FC<{ message: string; onSecretClick: () => void }> = ({ message, onSecretClick }) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleWrenchClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 2000) {
      setClickCount(1);
    } else {
      setClickCount(prev => prev + 1);
    }
    setLastClickTime(now);

    if (clickCount >= 2) {
      onSecretClick();
      setClickCount(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* #29: changed from <div onClick> to <button> for keyboard accessibility */}
        <button
          type="button"
          onClick={handleWrenchClick}
          aria-label="فتح لوحة الإدارة (اضغط 3 مرات)"
          className="w-20 h-20 bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 cursor-pointer select-none active:scale-95 transition-transform"
        >
          <Wrench className="w-10 h-10 text-brand-600" />
        </button>
        <h1 className="text-2xl font-black text-white mb-3">
          تحت الصيانة
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          {message}
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Clock className="w-4 h-4" />
          <span>نحاول العودة في أسرع وقت</span>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const isAdminRoute = location.pathname.startsWith('/admin');

  const isRecoveryUrl = () => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('type=recovery') || search.includes('type=recovery');
  };

  // Check auth session
  useEffect(() => {
    if (isRecoveryUrl()) {
      setIsPasswordRecovery(true);
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setIsAdmin(!!session);
      })
      .catch((error) => {
        console.warn('Failed to restore admin session', error);
        setIsAdmin(false);
      })
      .finally(() => setCheckingAuth(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      setIsAdmin(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Keyboard shortcut: Ctrl+Shift+A to open admin login
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate('/admin/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    let isActive = true;

    const applyMaintenanceSettings = async (settingsRequest: ReturnType<typeof fetchPublicSettingsFromSupabase>) => {
      const settings = await settingsRequest;
      if (isActive && settings) {
        setMaintenanceMode(settings.maintenance_mode || false);
        setMaintenanceMessage(settings.maintenance_message || '');
      }
    };

    const refreshMaintenance = () => {
      void applyMaintenanceSettings(refreshPublicSettingsFromSupabase());
    };

    void applyMaintenanceSettings(fetchPublicSettingsFromSupabase());
    const interval = window.setInterval(refreshMaintenance, 60000);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshMaintenance();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Scroll to top on route change
  useScrollToTop();

  // Apply dark mode class on mount and when changed
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Show onboarding on first visit
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle Capacitor Android Hardware Back Button
  useEffect(() => {
    let lastTime = 0;
    let toastTimeout: NodeJS.Timeout;

    const handleBackButtonCap = async () => {
      // 1. Check if any overlay/modal handled the event (LIFO stack)
      const handled = handleBackButton();
      if (handled) {
        return;
      }

      // 2. If no modal is open, check current path
      if (location.pathname !== '/') {
        // Go back in history (which reacts within the SPA router)
        navigate(-1);
      } else {
        // We are on the homepage. Double tap to exit.
        const now = Date.now();
        if (now - lastTime < 2000) {
          CapApp.exitApp();
        } else {
          lastTime = now;
          setShowExitToast(true);
          clearTimeout(toastTimeout);
          toastTimeout = setTimeout(() => {
            setShowExitToast(false);
          }, 2000);
        }
      }
    };

    const setupListener = async () => {
      if (!Capacitor.isNativePlatform()) {
        return null;
      }
      const listener = await CapApp.addListener('backButton', handleBackButtonCap);
      return listener;
    };

    const listenerPromise = setupListener();

    return () => {
      clearTimeout(toastTimeout);
      listenerPromise.then(l => {
        if (l) l.remove();
      });
    };
  }, [location.pathname, navigate]);


  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const handleAdminLogout = async () => {
    navigate('/', { replace: true });
    // Add a tiny delay before signing out so React Router processes the navigation first
    setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = '/';
    }, 50);
  };

  if (isAdminRoute && checkingAuth) {
    return (
      <div className="fixed inset-0 z-[200] bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isPasswordRecovery) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" /></div>}>
        <AdminPasswordReset
          onDone={() => {
            setIsPasswordRecovery(false);
            navigate('/admin/overview', { replace: true });
          }}
          onCancel={() => {
            setIsPasswordRecovery(false);
            navigate('/admin/login', { replace: true });
          }}
        />
      </Suspense>
    );
  }

  // Handle Admin Routes completely outside the customer Layout
  if (isAdminRoute) {
    if (!isAdmin && location.pathname !== '/admin/login') {
      // Redirect to login if not admin
      return <Navigate to="/admin/login" replace />;
    }

    if (location.pathname === '/admin/login') {
      if (isAdmin) {
        return <Navigate to="/admin/overview" replace />;
      }
      return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" /></div>}>
          <AdminLogin />
        </Suspense>
      );
    }

    return (
      <AdminLayout onLogout={handleAdminLogout}>
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" /></div>}>
          <Routes>
            <Route path="/*" element={<AdminDashboard />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    );
  }

  // Handle Customer Routes
  if (maintenanceMode && !isAdmin) {
    return (
      <MaintenancePage 
        message={maintenanceMessage} 
        onSecretClick={() => navigate('/admin/login')} 
      />
    );
  }

  return (
    <>
      <ReloadPrompt />
      <OfflineIndicator />

      <Layout 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode}
        onHelpClick={() => setShowOnboarding(true)}
        isAdmin={isAdmin}
        onAdminLogout={handleAdminLogout}
        onLogoClick={() => {
          if (!isAdmin) navigate('/admin/login');
        }}
      >
        <Suspense fallback={<div className="flex h-full min-h-[50vh] items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" /></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPageRoute />} />
            <Route path="/recipes" element={<RecipesPageRoute />} />
            <Route path="/articles" element={<ArticlesPageRoute />} />
            <Route path="/articles/:id" element={<ArticlePage />} />
            <Route path="/orders" element={<OrdersPage isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
            <Route path="/about" element={<AboutPageRoute />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </Suspense>
      </Layout>
      
      {showOnboarding && <Onboarding onClose={handleCloseOnboarding} />}

      {showExitToast && (
        <div aria-live="assertive" className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 dark:bg-white/90 backdrop-blur text-white dark:text-gray-900 px-6 py-3 rounded-full shadow-2xl z-[200] flex items-center gap-2 animate-slide-up-fade text-sm font-black w-max max-w-[90%]">
          <span>اضغط مرة أخرى للخروج من التطبيق</span>
        </div>
      )}
    </>

  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SyncProvider>
          <AppContent />
        </SyncProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
