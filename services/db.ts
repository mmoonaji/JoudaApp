import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Product, Recipe, Article, FAQItem } from './supabaseService';

const DB_NAME = 'JoudaDB';
const DB_VERSION = 2;
const MAX_COMPLETED_ORDERS = 50;
const RECIPE_PREVIEWS_KEY = 'recipePreviews';
const ARTICLE_PREVIEWS_KEY = 'articlePreviews';

export interface CompletedOrder {
  id: string;
  orderNumber: string;
  quotationId?: string;
  orderId?: string;
  items: {
    product_barcode: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }[];
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  orderType: 'delivery' | 'shipping' | 'pickup';
  paymentMethod: string;
  notes?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: number;
}

interface JoudaDBSchema extends DBSchema {
  products: {
    key: string;
    value: Product & { _cachedAt: number };
    indexes: { 'by-category': string; 'by-name': string };
  };
  recipes: {
    key: string;
    value: Recipe & { _cachedAt: number };
  };
  articles: {
    key: string;
    value: Article & { _cachedAt: number };
  };
  faq: {
    key: string;
    value: FAQItem & { _cachedAt: number };
  };
  cart: {
    key: string;
    value: {
      id: string;
      name: string;
      barcode?: string;
      price?: string;
      quantity: number;
      source: 'store' | 'bakery';
      _updatedAt: number;
    };
  };
  pendingOrders: {
    key: string;
    value: {
      id: string;
      payload: any;
      _createdAt: number;
      _retryCount: number;
      _lastError?: string;
    };
    indexes: { 'by-status': string };
  };
  completedOrders: {
    key: string;
    value: CompletedOrder;
    indexes: { 'by-date': number };
  };
  favorites: {
    key: string;
    value: {
      productId: string;
      _addedAt: number;
    };
  };
  meta: {
    key: string;
    value: {
      key: string;
      value: any;
      _updatedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<JoudaDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<JoudaDBSchema>> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<JoudaDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      // Products store
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-category', 'category');
        productStore.createIndex('by-name', 'name');
      }

      // Recipes store
      if (!db.objectStoreNames.contains('recipes')) {
        db.createObjectStore('recipes', { keyPath: 'id' });
      }

      // Articles store
      if (!db.objectStoreNames.contains('articles')) {
        db.createObjectStore('articles', { keyPath: 'id' });
      }

      // FAQ store
      if (!db.objectStoreNames.contains('faq')) {
        db.createObjectStore('faq', { keyPath: 'id' });
      }

      // Cart store
      if (!db.objectStoreNames.contains('cart')) {
        db.createObjectStore('cart', { keyPath: 'id' });
      }

      // Pending orders store
      if (!db.objectStoreNames.contains('pendingOrders')) {
        const orderStore = db.createObjectStore('pendingOrders', { keyPath: 'id' });
        orderStore.createIndex('by-status', '_createdAt');
      }

      // Completed orders store
      if (!db.objectStoreNames.contains('completedOrders')) {
        const orderStore = db.createObjectStore('completedOrders', { keyPath: 'id' });
        orderStore.createIndex('by-date', 'createdAt');
      }

      // Favorites store
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', { keyPath: 'productId' });
      }

      // Meta store
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });

  return dbPromise;
}

// ==========================
// PRODUCTS
// ==========================

export async function cacheProducts(products: Product[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');
  const store = tx.objectStore('products');

  // Clear old cache
  await store.clear();

  // Add new products with timestamp
  const now = Date.now();
  for (const product of products) {
    await store.put({ ...product, _cachedAt: now });
  }

  await tx.done;

  // Update last sync time
  await setMeta('productsLastSync', now);
}

export async function getCachedProducts(): Promise<Product[]> {
  const db = await getDB();
  const products = await db.getAll('products');
  const mapped = products.map(({ _cachedAt, ...product }) => product as Product);
  return mapped.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function getCachedProductsByCategory(category: string): Promise<Product[]> {
  const db = await getDB();
  const products = await db.getAllFromIndex('products', 'by-category', category);
  return products.map(({ _cachedAt, ...product }) => product as Product);
}

export async function searchCachedProducts(query: string): Promise<Product[]> {
  const db = await getDB();
  const products = await db.getAll('products');
  const lower = query.toLowerCase();
  return products
    .filter((p) => p.name.toLowerCase().includes(lower))
    .map(({ _cachedAt, ...product }) => product as Product);
}

export async function getCachedProductByBarcode(barcode: string): Promise<Product | undefined> {
  const db = await getDB();
  const product = await db.get('products', barcode);
  if (!product) return undefined;
  const { _cachedAt, ...rest } = product;
  return rest as Product;
}

// ==========================
// RECIPES
// ==========================

export async function cacheRecipes(recipes: Recipe[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('recipes', 'readwrite');
  const store = tx.objectStore('recipes');

  await store.clear();
  const now = Date.now();
  for (const recipe of recipes) {
    await store.put({ ...recipe, _cachedAt: now });
  }
  await tx.done;

  await setMeta('recipesLastSync', now);
}

export async function getCachedRecipes(): Promise<Recipe[]> {
  const db = await getDB();
  const recipes = await db.getAll('recipes');
  return recipes.map(({ _cachedAt, ...recipe }) => recipe as Recipe);
}

export async function cacheRecipePreviews(recipes: Recipe[]): Promise<void> {
  await setMeta(RECIPE_PREVIEWS_KEY, recipes.slice(0, 7));
}

export async function getCachedRecipePreviews(): Promise<Recipe[]> {
  const recipes = await getMeta<Recipe[]>(RECIPE_PREVIEWS_KEY);
  return Array.isArray(recipes) ? recipes : [];
}

// ==========================
// ARTICLES
// ==========================

export async function cacheArticles(articles: Article[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('articles', 'readwrite');
  const store = tx.objectStore('articles');

  await store.clear();
  const now = Date.now();
  for (const article of articles) {
    await store.put({ ...article, _cachedAt: now });
  }
  await tx.done;

  await setMeta('articlesLastSync', now);
}

export async function getCachedArticles(): Promise<Article[]> {
  const db = await getDB();
  const articles = await db.getAll('articles');
  return articles.map(({ _cachedAt, ...article }) => article as Article);
}

export async function cacheArticlePreviews(articles: Article[]): Promise<void> {
  await setMeta(ARTICLE_PREVIEWS_KEY, articles.slice(0, 5));
}

export async function getCachedArticlePreviews(): Promise<Article[]> {
  const articles = await getMeta<Article[]>(ARTICLE_PREVIEWS_KEY);
  return Array.isArray(articles) ? articles : [];
}

// ==========================
// FAQ
// ==========================

export async function cacheFAQ(faq: FAQItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('faq', 'readwrite');
  const store = tx.objectStore('faq');

  await store.clear();
  const now = Date.now();
  for (const item of faq) {
    await store.put({ ...item, _cachedAt: now });
  }
  await tx.done;

  await setMeta('faqLastSync', now);
}

export async function getCachedFAQ(): Promise<FAQItem[]> {
  const db = await getDB();
  const faq = await db.getAll('faq');
  return faq.map(({ _cachedAt, ...item }) => item as FAQItem);
}

// ==========================
// CART
// ==========================

export interface CartDBItem {
  id: string;
  name: string;
  barcode?: string;
  price?: string;
  quantity: number;
  source: 'store' | 'bakery';
}

export async function saveCartToDB(items: CartDBItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cart', 'readwrite');
  const store = tx.objectStore('cart');

  await store.clear();
  const now = Date.now();
  for (const item of items) {
    await store.put({ ...item, _updatedAt: now });
  }
  await tx.done;
}

export async function loadCartFromDB(): Promise<CartDBItem[]> {
  const db = await getDB();
  const items = await db.getAll('cart');
  return items.map(({ _updatedAt, ...item }) => ({
    id: item.id,
    name: item.name,
    barcode: item.barcode,
    price: item.price,
    quantity: item.quantity,
    source: item.source,
  }));
}

// ==========================
// PENDING ORDERS (Offline Queue)
// ==========================

export interface PendingOrder {
  id: string;
  payload: any;
}

export async function addPendingOrder(payload: any): Promise<string> {
  const db = await getDB();
  const id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.put('pendingOrders', {
    id,
    payload,
    _createdAt: Date.now(),
    _retryCount: 0,
  });
  return id;
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  const db = await getDB();
  const orders = await db.getAll('pendingOrders');
  return orders.map(({ _createdAt, _retryCount, _lastError, ...rest }) => ({
    id: rest.id,
    payload: rest.payload,
  }));
}

export async function removePendingOrder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingOrders', id);
}

export async function updatePendingOrderError(id: string, error: string): Promise<void> {
  const db = await getDB();
  const order = await db.get('pendingOrders', id);
  if (order) {
    order._retryCount += 1;
    order._lastError = error;
    await db.put('pendingOrders', order);
  }
}

export async function getPendingOrdersCount(): Promise<number> {
  const db = await getDB();
  return db.count('pendingOrders');
}

// ==========================
// META
// ==========================

export async function setMeta(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put('meta', {
    key,
    value,
    _updatedAt: Date.now(),
  });
}

export async function getMeta<T = any>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const meta = await db.get('meta', key);
  return meta?.value as T;
}

// ==========================
// CACHE VALIDATION
// ==========================

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export async function isCacheValid(type: 'products' | 'recipes' | 'articles' | 'faq'): Promise<boolean> {
  const lastSync = await getMeta<number>(`${type}LastSync`);
  if (!lastSync) return false;
  return Date.now() - lastSync < CACHE_MAX_AGE;
}

export async function getCacheAge(type: 'products' | 'recipes' | 'articles' | 'faq'): Promise<number> {
  const lastSync = await getMeta<number>(`${type}LastSync`);
  if (!lastSync) return Infinity;
  return Date.now() - lastSync;
}

// ==========================
// CLEAR ALL
// ==========================

export async function clearAllCache(): Promise<void> {
  const db = await getDB();
  const stores = ['products', 'recipes', 'articles', 'faq', 'cart', 'pendingOrders', 'completedOrders', 'favorites', 'meta'] as const;
  for (const storeName of stores) {
    if (db.objectStoreNames.contains(storeName)) {
      await db.clear(storeName);
    }
  }
}

// ==========================
// STORAGE INFO
// ==========================

export async function getStorageInfo(): Promise<{
  products: number;
  recipes: number;
  articles: number;
  faq: number;
  cart: number;
  pendingOrders: number;
  completedOrders: number;
  favorites: number;
}> {
  const db = await getDB();
  return {
    products: await db.count('products'),
    recipes: await db.count('recipes'),
    articles: await db.count('articles'),
    faq: await db.count('faq'),
    cart: await db.count('cart'),
    pendingOrders: await db.count('pendingOrders'),
    completedOrders: await db.count('completedOrders'),
    favorites: await db.count('favorites'),
  };
}

// ==========================
// COMPLETED ORDERS
// ==========================

export async function saveCompletedOrder(order: CompletedOrder): Promise<void> {
  const db = await getDB();
  await db.put('completedOrders', order);
  await pruneCompletedOrders(db);
}

export async function getCompletedOrders(): Promise<CompletedOrder[]> {
  const db = await getDB();
  const orders = await db.getAllFromIndex('completedOrders', 'by-date');
  // Return newest first
  return orders.reverse();
}

export async function getCompletedOrderById(id: string): Promise<CompletedOrder | undefined> {
  const db = await getDB();
  return db.get('completedOrders', id);
}

export async function deleteCompletedOrder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('completedOrders', id);
}

export async function clearCompletedOrders(): Promise<void> {
  const db = await getDB();
  await db.clear('completedOrders');
}

async function pruneCompletedOrders(db: IDBPDatabase<JoudaDBSchema>): Promise<void> {
  const orders = await db.getAllFromIndex('completedOrders', 'by-date');
  const excessCount = orders.length - MAX_COMPLETED_ORDERS;
  if (excessCount <= 0) return;

  const tx = db.transaction('completedOrders', 'readwrite');
  for (const order of orders.slice(0, excessCount)) {
    await tx.store.delete(order.id);
  }
  await tx.done;
}

// ==========================
// FAVORITES
// ==========================

export async function saveFavorite(productId: string): Promise<void> {
  const db = await getDB();
  await db.put('favorites', {
    productId,
    _addedAt: Date.now(),
  });
}

export async function removeFavorite(productId: string): Promise<void> {
  const db = await getDB();
  await db.delete('favorites', productId);
}

export async function getFavorites(): Promise<string[]> {
  const db = await getDB();
  const favs = await db.getAll('favorites');
  return favs.map((f) => f.productId);
}

export async function isFavoriteInDB(productId: string): Promise<boolean> {
  const db = await getDB();
  const fav = await db.get('favorites', productId);
  return !!fav;
}

export async function clearFavorites(): Promise<void> {
  const db = await getDB();
  await db.clear('favorites');
}
