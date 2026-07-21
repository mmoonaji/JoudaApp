import { supabase } from './supabaseClient';
import {
  cacheProducts,
  getCachedProducts,
  cacheRecipes,
  getCachedRecipes,
  cacheArticles,
  getCachedArticles,
  cacheFAQ,
  getCachedFAQ,
} from './db';

export interface Product {
  id: string; // barcode for compatibility
  barcode: string;
  name: string;
  category: string;
  app_category?: string | null;
  description?: string;
  price: number;
  image?: string; // backward compat
  image_url?: string;
  is_active?: boolean;
  is_hidden_in_app?: boolean;
  force_out_of_stock?: boolean;
  is_stock_tracked?: boolean;
  stock_status?: 'available' | 'out_of_stock';
  stock_quantity?: number | null;
  stock_updated_at?: string | null;
  unit?: string;
  popular?: boolean;
  tags?: string[];
  valid_until?: string | null;
  inStock?: boolean;
  source?: 'store' | 'bakery';
  bundle_items?: {
    barcode: string;
    product_name: string;
    quantity: number;
  }[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  time: string;
  difficulty: string;
  calories: string;
  main_product: string;
  mainProduct: string; // backward compat
  ingredients: string[];
  steps: string[];
  image?: string; // backward compat
  image_url?: string;
  bundle_items?: string[];
  bundleItems?: string[]; // backward compat
  video_url?: string;
  videoUrl?: string; // backward compat
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface AppCategory {
  id: string;
  name: string;
  sort_order: number;
}

type CatalogSection = 'products' | 'recipes' | 'articles' | 'faq' | 'banners' | 'settings';

interface CatalogProductsResponse {
  products: Record<string, any>[];
  package_items: Record<string, any>[];
}

interface CatalogRecipesResponse {
  recipes: Record<string, any>[];
}

interface CatalogArticlesResponse {
  articles: Record<string, any>[];
}

interface CatalogFaqResponse {
  faq: Record<string, any>[];
}

interface CatalogBannersResponse {
  banners: Record<string, any>[];
}

interface CatalogSettingsResponse {
  settings: {
    maintenance_mode?: boolean;
    maintenance_message?: string | null;
    store_latitude?: number | null;
    store_longitude?: number | null;
    delivery_price_per_km?: number | null;
  } | null;
}

const normalizeCatalogImage = (row: Record<string, any>) => ({
  ...row,
});

async function fetchCatalogSection<T>(section: CatalogSection): Promise<T> {
  switch (section) {
    case 'settings': {
      const { data, error } = await supabase
        .from('app_settings_public')
        .select('maintenance_mode, maintenance_message, store_latitude, store_longitude, delivery_price_per_km')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;
      return { settings: data || null } as T;
    }

    case 'products': {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      const { data: packageItems, error: packageError } = await supabase
        .from('package_items')
        .select('*');

      if (packageError) throw packageError;

      return {
        products: (products || []).map((row) => normalizeCatalogImage(row)),
        package_items: packageItems || [],
      } as T;
    }

    case 'recipes': {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { recipes: (data || []).map((row) => normalizeCatalogImage(row)) } as T;
    }

    case 'articles': {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { articles: (data || []).map((row) => normalizeCatalogImage(row)) } as T;
    }

    case 'faq': {
      const { data, error } = await supabase
        .from('faq')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return { faq: data || [] } as T;
    }

    case 'banners': {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return { banners: (data || []).map((row) => normalizeCatalogImage(row)) } as T;
    }

    default:
      throw new Error(`Unsupported catalog section: ${section}`);
  }
}

export const fetchAppCategoriesFromSupabase = async (): Promise<AppCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('app_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      // 42P01 = undefined_table (table does not exist yet)
      if (error.code === '42P01') return []; 
      throw error;
    }
    return data || [];
  } catch (err) {
    console.warn('Supabase app_categories failed or not found', err);
    return [];
  }
};

export interface Article {
  id: string;
  title: string;
  image?: string; // backward compat
  image_url: string;
  content: string;
  date?: string; // backward compat
  published_date?: string;
  author: string;
}

// ==========================
// PRODUCTS (from Supabase)
// ==========================

export const fetchProductsFromSupabase = async (): Promise<Product[]> => {
  try {
    const { products, package_items: packageItems } = await fetchCatalogSection<CatalogProductsResponse>('products');

    const productsList: Product[] = (products || [])
      .filter((p) => p.is_hidden_in_app !== true)
      .map((p) => {
      const resolvedCategory = p.app_category || p.category || 'عام';
      const isBakery = resolvedCategory === 'مخبوزات' || p.category === 'مخبوزات';
      
      // If it is a package, resolve its bundle items
      let bundle_items: Product['bundle_items'] = undefined;
      const isPackage = p.barcode.startsWith('PKG-') || resolvedCategory === 'عروض وبكجات' || p.category === 'عروض وبكجات';
      let packageInStock = true;

      if (isPackage && packageItems.length > 0) {
        const mappings = packageItems.filter((m) => m.package_barcode === p.barcode);
        bundle_items = mappings.map((m) => {
          const compProduct = products.find((bp) => bp.barcode === m.product_barcode);
          return {
            barcode: m.product_barcode,
            product_name: compProduct ? compProduct.name : `منتج ${m.product_barcode}`,
            quantity: m.quantity,
          };
        });

        // Dynamic stock status check for packages: if any constituent item is out of stock, package is out of stock
        for (const m of mappings) {
          const compProduct = products.find((bp) => bp.barcode === m.product_barcode);
          if (!compProduct) {
            packageInStock = false;
            break;
          }
          const isCompBakery = compProduct.app_category === 'مخبوزات' || compProduct.category === 'مخبوزات';
          const isCompForcedOut = compProduct.force_out_of_stock === true;
          const compStockStatus = isCompForcedOut ? 'out_of_stock' : compProduct.stock_status;
          const compInStock = isCompForcedOut ? false : (isCompBakery ? true : compStockStatus === 'available');

          if (!compInStock) {
            packageInStock = false;
            break;
          }
        }
      }

      const isForcedOut = p.force_out_of_stock === true;
      const finalStockStatus = isForcedOut ? 'out_of_stock' : p.stock_status;

      return {
        id: p.barcode,
        barcode: p.barcode,
        name: p.name,
        category: resolvedCategory,
        app_category: p.app_category,
        description: p.description || '',
        price: p.price || 0,
        image: p.image_url,
        image_url: p.image_url,
        is_active: p.is_active,
        is_hidden_in_app: p.is_hidden_in_app,
        force_out_of_stock: p.force_out_of_stock,
        is_stock_tracked: p.is_stock_tracked,
        stock_status: finalStockStatus,
        stock_quantity: p.stock_quantity === undefined || p.stock_quantity === null ? null : Number(p.stock_quantity),
        stock_updated_at: p.stock_updated_at,
        unit: p.unit,
        tags: p.tags || [],
        valid_until: p.valid_until,
        // For packages, inStock is determined dynamically; bakery items are always available; others check stock_status
        inStock: isPackage 
          ? (isForcedOut ? false : packageInStock)
          : (isForcedOut ? false : (isBakery ? true : finalStockStatus === 'available')),
        source: isBakery ? ('bakery' as const) : ('store' as const),
        bundle_items,
        };
      });

    // Cache in IndexedDB for offline
    try { await cacheProducts(productsList); } catch (e) { console.warn('Failed to cache products', e); }
    return productsList;
  } catch (error) {
    console.warn('Supabase products failed, trying IndexedDB cache...', error);
    try {
      const cached = await getCachedProducts();
      if (cached.length > 0) {
        return cached.map((product) => ({
          ...product,
          image: product.image_url || product.image || '',
          image_url: product.image_url || product.image || '',
        }));
      }
    } catch (e) {}
    return [];
  }
};

// Bakery products - for now, keep empty or fetch from a separate source
// ==========================
// RECIPES
// ==========================

let recipesFetchPromise: Promise<Recipe[]> | null = null;

const fetchRecipesFresh = async (): Promise<Recipe[]> => {
  try {
    const { recipes } = await fetchCatalogSection<CatalogRecipesResponse>('recipes');

    const recipeList: Recipe[] = (recipes || []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      time: r.time || '',
      difficulty: r.difficulty || '',
      calories: r.calories || '',
      main_product: r.main_product || '',
      mainProduct: r.main_product || '',
      ingredients: r.ingredients || [],
      steps: r.steps || [],
      image: r.image_url,
      image_url: r.image_url,
      bundle_items: r.bundle_items || [],
      bundleItems: r.bundle_items || [],
      video_url: r.video_url,
      videoUrl: r.video_url,
    }));

    try { await cacheRecipes(recipeList); } catch (e) { console.warn('Failed to cache recipes', e); }
    return recipeList;
  } catch (error) {
    console.warn('Supabase recipes failed, trying IndexedDB cache...', error);
    try {
      const cached = await getCachedRecipes();
      if (cached.length > 0) {
        return cached.map((recipe) => ({
          ...recipe,
          image: recipe.image_url || recipe.image || '',
          image_url: recipe.image_url || recipe.image || '',
        }));
      }
    } catch (e) {}
    return [];
  }
};

export const fetchRecipesFromSupabase = async (): Promise<Recipe[]> => {
  if (!recipesFetchPromise) {
    recipesFetchPromise = fetchRecipesFresh().finally(() => {
      recipesFetchPromise = null;
    });
  }

  return recipesFetchPromise;
};

// ==========================
// ARTICLES
// ==========================

export const fetchArticlesFromSupabase = async (): Promise<Article[]> => {
  try {
    const { articles } = await fetchCatalogSection<CatalogArticlesResponse>('articles');

    const articleList: Article[] = (articles || []).map((a) => ({
      id: a.id,
      title: a.title,
      image: a.image_url || '',
      image_url: a.image_url || '',
      content: a.content || '',
      date: a.published_date,
      published_date: a.published_date,
      author: a.author || 'جوده',
    }));

    try { await cacheArticles(articleList); } catch (e) { console.warn('Failed to cache articles', e); }
    return articleList;
  } catch (error) {
    console.warn('Supabase articles failed, trying IndexedDB cache...', error);
    try {
      const cached = await getCachedArticles();
      if (cached.length > 0) {
        return cached.map((article) => ({
          ...article,
          image: article.image_url || article.image || '',
          image_url: article.image_url || article.image || '',
        }));
      }
    } catch (e) {}
    return [];
  }
};

// ==========================
// FAQ
// ==========================

export const fetchFAQFromSupabase = async (): Promise<FAQItem[]> => {
  try {
    const { faq } = await fetchCatalogSection<CatalogFaqResponse>('faq');

    const faqItems: FAQItem[] = (faq || []).map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
    }));

    try { await cacheFAQ(faqItems); } catch (e) { console.warn('Failed to cache FAQ', e); }
    return faqItems;
  } catch (error) {
    console.warn('Supabase FAQ failed, trying IndexedDB cache...', error);
    try {
      const cached = await getCachedFAQ();
      if (cached.length > 0) return cached;
    } catch (e) {}
    return [];
  }
};

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

export const fetchBannersFromSupabase = async (): Promise<Banner[]> => {
  try {
    const { banners } = await fetchCatalogSection<CatalogBannersResponse>('banners');
    return (banners || []).map((banner) => ({
      id: banner.id,
      title: banner.title,
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      sort_order: banner.sort_order || 0,
      is_active: banner.is_active !== false,
    }));
  } catch (error) {
    console.warn('Supabase banners failed', error);
    return [];
  }
};

export const fetchPublicSettingsFromSupabase = async (): Promise<CatalogSettingsResponse['settings']> => {
  try {
    const { settings } = await fetchCatalogSection<CatalogSettingsResponse>('settings');
    return settings;
  } catch (error) {
    console.warn('Supabase settings failed', error);
    return null;
  }
};

// ==========================
// ORDER SUBMISSION
// ==========================

export interface SubmitOrderPayload {
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  order_type: 'delivery' | 'shipping' | 'pickup';
  branch_id?: string;
  payment_method: string;
  notes?: string;
  subtotal: number;
  delivery_fee: number;
  latitude?: number | null;
  longitude?: number | null;
  items: {
    product_barcode: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
}

export interface SubmitOrderResult {
  success: boolean;
  order_number?: string;
  quotation_id?: string;
  order_id?: string;
  message: string;
}

export const submitOrderToSupabase = async (
  payload: SubmitOrderPayload
): Promise<SubmitOrderResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('submit-order', {
      body: payload,
    });

    if (error) throw error;
    return (data || { success: false, message: 'تعذر قراءة رد نظام الطلبات' }) as SubmitOrderResult;
  } catch (error: any) {
    console.error('submitOrderToSupabase error:', error);
    return {
      success: false,
      message: error.message || 'تعذر الاتصال بنظام الطلبات. جرّب مرة أخرى أو أرسل الطلب عبر واتساب.',
    };
  }
};

// ==========================
// Helpers
// ==========================

export const getYouTubeEmbedId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) return match[2];
  if (url.includes('youtube.com/shorts/')) {
    const shortsMatch = url.split('shorts/')[1];
    if (shortsMatch) return shortsMatch.split('?')[0];
  }
  return null;
};
