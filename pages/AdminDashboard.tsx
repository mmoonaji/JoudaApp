import React, { useEffect, useState } from 'react';
import { 
  Shield, Gift, BadgeCheck, Image as ImageIcon, BookOpen, 
  ChefHat, Check, AlertCircle 
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchProductsFromSupabase, Product, Recipe, Article } from '../services/supabaseService';
import { useLocation } from 'react-router-dom';

// Extracted Sub-managers
import { PackageManager } from '../components/admin/PackageManager';
import { BannerManager } from '../components/admin/BannerManager';
import { RecipeManager } from '../components/admin/RecipeManager';
import { ArticleManager } from '../components/admin/ArticleManager';
import { FAQManager } from '../components/admin/FAQManager';
import { SettingsManager } from '../components/admin/SettingsManager';
import { ProductManager } from '../components/admin/ProductManager';
import { DashboardOverview } from '../components/admin/DashboardOverview';

interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
}

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const pathPart = location.pathname.split('/').pop() || '';
  const validTabs = ['packages', 'banners', 'recipes', 'articles', 'faq', 'settings', 'products'];
  const activeTab = validTabs.includes(pathPart) ? pathPart : 'overview';
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reload data
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Products: Fetch all products directly from Supabase for management, ordered by name
      const { data: fetchedProducts, error: prodError } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (prodError) throw prodError;
      setProducts(fetchedProducts || []);

      // Recipes
      const { data: fetchedRecipes } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
      if (fetchedRecipes) setRecipes(fetchedRecipes);

      // Articles
      const { data: fetchedArticles } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (fetchedArticles) setArticles(fetchedArticles);

      // Banners
      const { data: fetchedBanners } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
      if (fetchedBanners) setBanners(fetchedBanners);

    } catch (err: any) {
      setError(err.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Flash messages helper
  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  return (
    <div className="pb-12 text-right w-full" dir="rtl">
      {/* Messages */}
      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isInitialLoad && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Managers Content */}
      {!isInitialLoad && activeTab === 'overview' && (
        <DashboardOverview showError={showError} />
      )}

      {!isInitialLoad && activeTab === 'products' && (
        <ProductManager
          showSuccess={showSuccess}
          showError={showError}
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {!isInitialLoad && activeTab === 'packages' && (
        <PackageManager
          products={products}
          showSuccess={showSuccess}
          showError={showError}
          loadData={loadData}
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {!isInitialLoad && activeTab === 'banners' && (
        <BannerManager
          banners={banners}
          showSuccess={showSuccess}
          showError={showError}
          loadData={loadData}
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {!isInitialLoad && activeTab === 'recipes' && (
        <RecipeManager
          products={products}
          recipes={recipes}
          showSuccess={showSuccess}
          showError={showError}
          loadData={loadData}
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {!isInitialLoad && activeTab === 'articles' && (
        <ArticleManager
          articles={articles}
          showSuccess={showSuccess}
          showError={showError}
          loadData={loadData}
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {!isInitialLoad && activeTab === 'faq' && (
        <FAQManager
          showSuccess={showSuccess}
          showError={showError}
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {!isInitialLoad && activeTab === 'settings' && (
        <SettingsManager
          showSuccess={showSuccess}
          showError={showError}
          loading={loading}
          setLoading={setLoading}
        />
      )}
    </div>
  );
};
