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
    price?: number;
    image?: string;
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

type PublicSettings = CatalogSettingsResponse['settings'];

const PRODUCT_CATALOG_COLUMNS = 'barcode, name, category, app_category, description, price, image_url, is_active, is_hidden_in_app, force_out_of_stock, is_stock_tracked, stock_status, stock_quantity, stock_updated_at, unit, tags, valid_until';
const PRODUCT_COMPONENT_COLUMNS = 'barcode, name, category, app_category, price, image_url, force_out_of_stock, stock_status';
const PACKAGE_ITEM_COLUMNS = 'package_barcode, product_barcode, quantity';
const RECIPE_PREVIEW_COLUMNS = 'id, title, time, difficulty, image_url, video_url';
const ARTICLE_PREVIEW_COLUMNS = 'id, title, image_url, published_date, author';

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
      const [productsResponse, packageItemsResponse] = await Promise.all([
        supabase
          .from('products')
          .select(PRODUCT_CATALOG_COLUMNS)
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase.from('package_items').select(PACKAGE_ITEM_COLUMNS),
      ]);

      if (productsResponse.error) throw productsResponse.error;
      if (packageItemsResponse.error) throw packageItemsResponse.error;

      return {
        products: (productsResponse.data || []).map((row) => normalizeCatalogImage(row)),
        package_items: packageItemsResponse.data || [],
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

const recipeFromRow = (recipe: Record<string, any>): Recipe => ({
  id: recipe.id,
  title: recipe.title,
  description: recipe.description || '',
  time: recipe.time || '',
  difficulty: recipe.difficulty || '',
  calories: recipe.calories || '',
  main_product: recipe.main_product || '',
  mainProduct: recipe.main_product || '',
  ingredients: recipe.ingredients || [],
  steps: recipe.steps || [],
  image: recipe.image_url,
  image_url: recipe.image_url,
  bundle_items: recipe.bundle_items || [],
  bundleItems: recipe.bundle_items || [],
  video_url: recipe.video_url,
  videoUrl: recipe.video_url,
});

const articleFromRow = (article: Record<string, any>): Article => ({
  id: article.id,
  title: article.title,
  image: article.image_url || '',
  image_url: article.image_url || '',
  content: article.content || '',
  date: article.published_date,
  published_date: article.published_date,
  author: article.author || 'جوده',
});

const isBakeryProduct = (product: Record<string, any>) => (
  product.app_category === 'مخبوزات' || product.category === 'مخبوزات'
);

const isPackageProduct = (product: Record<string, any>) => (
  product.barcode.startsWith('PKG-')
  || product.app_category === 'عروض وبكجات'
  || product.category === 'عروض وبكجات'
);

const catalogProductIsAvailable = (product: Record<string, any>) => {
  if (product.force_out_of_stock === true) return false;
  return isBakeryProduct(product) || product.stock_status === 'available';
};

const mapCatalogProducts = (
  products: Record<string, any>[],
  packageItems: Record<string, any>[],
): Product[] => {
  const productLookup = new Map(products.map((product) => [product.barcode, product]));
  const mappingsByPackage = new Map<string, Record<string, any>[]>();

  for (const mapping of packageItems) {
    const mappings = mappingsByPackage.get(mapping.package_barcode) || [];
    mappings.push(mapping);
    mappingsByPackage.set(mapping.package_barcode, mappings);
  }

  return products
    .filter((product) => product.is_hidden_in_app !== true)
    .map((product) => mapCatalogProduct(product, productLookup, mappingsByPackage));
};

const mapCatalogProduct = (
  product: Record<string, any>,
  productLookup: Map<string, Record<string, any>>,
  mappingsByPackage: Map<string, Record<string, any>[]>,
): Product => {
  const resolvedCategory = product.app_category || product.category || 'عام';
  const isPackage = isPackageProduct(product);
  const mappings = mappingsByPackage.get(product.barcode) || [];
  const bundleItems = isPackage ? mappings.map((mapping) => {
    const component = productLookup.get(mapping.product_barcode);
    return {
      barcode: mapping.product_barcode,
      product_name: component?.name || `منتج ${mapping.product_barcode}`,
      quantity: mapping.quantity,
      price: component?.price,
      image: component?.image_url,
    };
  }) : undefined;
  const packageInStock = mappings.every((mapping) => {
    const component = productLookup.get(mapping.product_barcode);
    return component ? catalogProductIsAvailable(component) : false;
  });
  const finalStockStatus = product.force_out_of_stock === true ? 'out_of_stock' : product.stock_status;

  return {
    id: product.barcode,
    barcode: product.barcode,
    name: product.name,
    category: resolvedCategory,
    app_category: product.app_category,
    description: product.description || '',
    price: product.price || 0,
    image: product.image_url,
    image_url: product.image_url,
    is_active: product.is_active,
    is_hidden_in_app: product.is_hidden_in_app,
    force_out_of_stock: product.force_out_of_stock,
    is_stock_tracked: product.is_stock_tracked,
    stock_status: finalStockStatus,
    stock_quantity: product.stock_quantity == null ? null : Number(product.stock_quantity),
    stock_updated_at: product.stock_updated_at,
    unit: product.unit,
    tags: product.tags || [],
    valid_until: product.valid_until,
    inStock: isPackage ? product.force_out_of_stock !== true && packageInStock : catalogProductIsAvailable(product),
    source: isBakeryProduct(product) ? 'bakery' : 'store',
    bundle_items: bundleItems,
  };
};

// ==========================
// PRODUCTS (from Supabase)
// ==========================

export const fetchProductsFromSupabase = async (): Promise<Product[]> => {
  try {
    const { products, package_items: packageItems } = await fetchCatalogSection<CatalogProductsResponse>('products');
    const productsList = mapCatalogProducts(products || [], packageItems);

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

export const fetchFeaturedPackagesFromSupabase = async (): Promise<Product[]> => {
  try {
    const [packagesResponse, packageItemsResponse] = await Promise.all([
      supabase
        .from('products')
        .select(PRODUCT_CATALOG_COLUMNS)
        .eq('is_active', true)
        .or('barcode.like.PKG-%,category.eq.عروض وبكجات,app_category.eq.عروض وبكجات')
        .limit(6),
      supabase.from('package_items').select(PACKAGE_ITEM_COLUMNS),
    ]);

    if (packagesResponse.error) throw packagesResponse.error;
    if (packageItemsResponse.error) throw packageItemsResponse.error;

    const packageRows = packagesResponse.data || [];
    const packageBarcodes = new Set(packageRows.map((product) => product.barcode));
    const packageItems = (packageItemsResponse.data || []).filter((mapping) => (
      packageBarcodes.has(mapping.package_barcode)
    ));
    const componentBarcodes = [...new Set(packageItems.map((mapping) => mapping.product_barcode))];
    let componentRows: Record<string, any>[] = [];

    if (componentBarcodes.length > 0) {
      const componentResponse = await supabase
        .from('products')
        .select(PRODUCT_COMPONENT_COLUMNS)
        .in('barcode', componentBarcodes)
        .eq('is_active', true);
      if (componentResponse.error) throw componentResponse.error;
      componentRows = componentResponse.data || [];
    }

    const catalogRows = [...packageRows, ...componentRows];
    const featuredBarcodeSet = new Set(packageRows.map((product) => product.barcode));
    return mapCatalogProducts(catalogRows, packageItems).filter((product) => (
      featuredBarcodeSet.has(product.barcode)
    ));
  } catch (error) {
    console.warn('Supabase featured packages failed, trying IndexedDB cache...', error);
    const cachedProducts = await getCachedProducts().catch(() => []);
    return cachedProducts.filter((product) => (
      product.barcode.startsWith('PKG-')
      || product.category === 'عروض وبكجات'
      || product.app_category === 'عروض وبكجات'
    ));
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

    const recipeList: Recipe[] = (recipes || []).map(recipeFromRow);

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

export const fetchRecipePreviewsFromSupabase = async (): Promise<Recipe[]> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(RECIPE_PREVIEW_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(7);

    if (error) throw error;
    return (data || []).map(recipeFromRow);
  } catch (error) {
    console.warn('Supabase recipe previews failed, trying IndexedDB cache...', error);
    return getCachedRecipes().then((recipes) => recipes.slice(0, 7)).catch(() => []);
  }
};

// ==========================
// ARTICLES
// ==========================

export const fetchArticlesFromSupabase = async (): Promise<Article[]> => {
  try {
    const { articles } = await fetchCatalogSection<CatalogArticlesResponse>('articles');

    const articleList: Article[] = (articles || []).map(articleFromRow);

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

export const fetchArticlePreviewsFromSupabase = async (): Promise<Article[]> => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select(ARTICLE_PREVIEW_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return (data || []).map(articleFromRow);
  } catch (error) {
    console.warn('Supabase article previews failed, trying IndexedDB cache...', error);
    return getCachedArticles().then((articles) => articles.slice(0, 5)).catch(() => []);
  }
};

export const fetchArticleFromSupabase = async (articleId: string): Promise<Article | null> => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .maybeSingle();

    if (error) throw error;
    return data ? articleFromRow(data) : null;
  } catch (error) {
    console.warn('Supabase article detail failed', error);
    return null;
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

let cachedPublicSettings: PublicSettings | undefined;
let publicSettingsRequest: Promise<PublicSettings> | null = null;

const requestPublicSettings = (): Promise<PublicSettings> => {
  if (publicSettingsRequest) return publicSettingsRequest;

  publicSettingsRequest = fetchCatalogSection<CatalogSettingsResponse>('settings')
    .then(({ settings }) => {
      cachedPublicSettings = settings;
      return settings;
    })
    .catch((error) => {
      console.warn('Supabase settings failed', error);
      return cachedPublicSettings ?? null;
    })
    .finally(() => {
      publicSettingsRequest = null;
    });

  return publicSettingsRequest;
};

export const fetchPublicSettingsFromSupabase = (): Promise<PublicSettings> => {
  if (cachedPublicSettings !== undefined) {
    return Promise.resolve(cachedPublicSettings);
  }
  return requestPublicSettings();
};

export const refreshPublicSettingsFromSupabase = (): Promise<PublicSettings> => {
  return requestPublicSettings();
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
