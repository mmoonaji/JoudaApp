import React, { useEffect, useState, useMemo } from 'react';
import { AlertCircle, Search, ChevronDown, Sparkles } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { fetchProductsFromSupabase, Product } from '../services/supabaseService';
import { getCachedProducts } from '../services/db';
import { ProductDetailsModal } from '../components/modals/ProductDetailsModal';
import { ProductRequestModal } from '../components/modals/ProductRequestModal';
import { useDebounce } from '../hooks/useDebounce';
import { useRecentSearches } from '../hooks/useRecentSearches';

import { StoreBakeryTabs } from '../components/products/StoreBakeryTabs';
import { ProductSearchBar } from '../components/products/ProductSearchBar';
import { HomePackagesCarousel } from '../components/home/HomePackagesCarousel';
import { ProductCard } from '../components/products/ProductCard';
import { FilterPanelModal, FilterState } from '../components/products/FilterPanelModal';
import { calculatePackageSavings } from '../components/products/utils';

interface ProductsPageProps {
  initialViewMode?: 'store' | 'bakery';
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ initialViewMode = 'store' }) => {
  const { addToCart, decreaseQuantityByName, getItemQuantity } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [bakeryProducts, setBakeryProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const [viewMode, setViewMode] = useState<'store' | 'bakery'>(initialViewMode);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [requestProduct, setRequestProduct] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useRecentSearches();

  const [filters, setFilters] = useState<FilterState>({
    sort: 'default',
    minPrice: null,
    maxPrice: null,
    inStockOnly: false,
    favoritesOnly: false,
  });

  // Pagination
  const INITIAL_ITEMS = 20;
  const LOAD_MORE_ITEMS = 20;
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS);

  // Reset pagination when filters/search/category/view changes
  useEffect(() => {
    setVisibleCount(INITIAL_ITEMS);
  }, [viewMode, selectedCategory, debouncedSearchQuery, filters.sort, filters.inStockOnly, filters.favoritesOnly, filters.minPrice, filters.maxPrice]);

  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  // Load from IndexedDB first (instant), then refresh from Supabase (background)
  const loadAllData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(false);
    
    let loadedFromCache = false;
    
    // 1. Try IndexedDB cache first (instant display)
    try {
      const cached = await getCachedProducts();
      if (cached.length > 0) {
        const storeData = cached.filter(p => p.source !== 'bakery');
        const bakeryData = cached.filter(p => p.source === 'bakery');
        setStoreProducts(storeData);
        setBakeryProducts(bakeryData);
        loadedFromCache = true;
        if (showLoading) setLoading(false); // Hide loader instantly
      }
    } catch (e) {
      console.warn('Failed to load cached products', e);
    }
    
    // 2. Always refresh from Supabase in background
    try {
      const allProducts = await fetchProductsFromSupabase();
      // Split: bakery items go to bakery tab, everything else to store tab
      const storeData = allProducts.filter(p => p.source !== 'bakery');
      const bakeryData = allProducts.filter(p => p.source === 'bakery');
      setStoreProducts(storeData);
      setBakeryProducts(bakeryData);
      if (storeData.length === 0 && bakeryData.length === 0) {
        setError(true);
      }
    } catch (e) {
      console.error(e);
      // Only show error if we didn't load from cache
      if (!loadedFromCache) {
        setError(true);
      }
    } finally {
      if (!loadedFromCache || showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAllData(true);
  }, []);

  const currentProducts = viewMode === 'store' ? storeProducts : bakeryProducts;
  const categories = ['الكل', ...Array.from(new Set(currentProducts.map(p => p.category).filter(Boolean)))];

  // Calculate price range from products
  const prices = currentProducts.map(p => p.price || 0).filter(p => p > 0);
  const maxProductPrice = prices.length > 0 ? Math.max(...prices) : 0;

  // Smart search: search in name, description, category, barcode
  const filteredProducts = useMemo(() => {
    let result = currentProducts.filter(product => {
      const matchCategory = selectedCategory === 'الكل' || product.category === selectedCategory;
      const searchLower = debouncedSearchQuery.toLowerCase().trim();
      const matchSearch = !searchLower || 
                          product.name.toLowerCase().includes(searchLower);
      const matchStock = !filters.inStockOnly || product.inStock !== false;
      const matchFav = !filters.favoritesOnly || isFavorite(product.id);
      const pPrice = product.price || 0;
      const hasPrice = pPrice > 0;
      // If a price filter is applied, only show products that HAVE a price and match the condition
      const matchMinPrice = filters.minPrice === null || (hasPrice && pPrice >= filters.minPrice);
      const matchMaxPrice = filters.maxPrice === null || (hasPrice && pPrice <= filters.maxPrice);
      return matchCategory && matchSearch && matchStock && matchFav && matchMinPrice && matchMaxPrice;
    });

    // Sort
    result.sort((a, b) => {
      switch (filters.sort) {
        case 'price-asc':
          // Available first, then by price
          if (a.inStock !== false && b.inStock === false) return -1;
          if (a.inStock === false && b.inStock !== false) return 1;
          const priceA = a.price || Infinity;
          const priceB = b.price || Infinity;
          return priceA - priceB;
        case 'price-desc':
          // Available first, then by price
          if (a.inStock !== false && b.inStock === false) return -1;
          if (a.inStock === false && b.inStock !== false) return 1;
          return (b.price || 0) - (a.price || 0);
        case 'name-asc':
          // Available first, then by name
          if (a.inStock !== false && b.inStock === false) return -1;
          if (a.inStock === false && b.inStock !== false) return 1;
          return a.name.localeCompare(b.name, 'ar');
        case 'popular':
          // Available first, then popular
          if (a.inStock !== false && b.inStock === false) return -1;
          if (a.inStock === false && b.inStock !== false) return 1;
          if (a.popular && !b.popular) return -1;
          if (!a.popular && b.popular) return 1;
          return 0;
        case 'default':
        default:
          // Available first, then popular, then by name
          if (a.inStock !== false && b.inStock === false) return -1;
          if (a.inStock === false && b.inStock !== false) return 1;
          if (a.popular && !b.popular) return -1;
          if (!a.popular && b.popular) return 1;
          return a.name.localeCompare(b.name, 'ar');
      }
    });

    return result;
  }, [currentProducts, selectedCategory, debouncedSearchQuery, filters, isFavorite]);

  const activeFiltersCount = [
    filters.sort !== 'default',
    filters.inStockOnly,
    filters.favoritesOnly,
    filters.minPrice !== null,
    filters.maxPrice !== null,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilters({
      sort: 'default',
      minPrice: null,
      maxPrice: null,
      inStockOnly: false,
      favoritesOnly: false,
    });
  };

  const handleAddToCart = (product: Product, mode: 'store' | 'bakery') => {
    addToCart(product.name, mode, product.barcode, product.price?.toString());
    setJustAdded(product.name);
    setTimeout(() => setJustAdded(null), 1500);
  };

  return (
    <div className="pb-24 md:pb-8 animate-fade-in">
      
      {/* Store / Bakery Tabs */}
      <StoreBakeryTabs 
        viewMode={viewMode}
        setViewMode={setViewMode}
        setSelectedCategory={setSelectedCategory}
        setSearchQuery={setSearchQuery}
      />

      {/* Search + Filter */}
      <ProductSearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        debouncedSearchQuery={debouncedSearchQuery}
        isSearchFocused={isSearchFocused}
        setIsSearchFocused={setIsSearchFocused}
        recentSearches={recentSearches}
        addRecentSearch={addRecentSearch}
        removeRecentSearch={removeRecentSearch}
        clearRecentSearches={clearRecentSearches}
        activeFiltersCount={activeFiltersCount}
        setShowFilters={setShowFilters}
      />

      {/* Category Filters */}
      {!loading && !error && categories.length > 1 && (
        <div className="py-3 mb-4 -mx-4 px-4">
          <div className="flex overflow-x-auto gap-2 pb-1 hide-scrollbar">
            {categories.map(cat => (
              <button
                type="button"
                key={cat}
                onClick={() => {
                   setSelectedCategory(cat);
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedCategory === cat 
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm' 
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Featured Packages Carousel */}
      {!loading && !error && viewMode === 'store' && selectedCategory === 'الكل' && !searchQuery && (
        <HomePackagesCarousel />
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="grid gap-3 grid-cols-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-warm-white dark:bg-gray-800 rounded-3xl animate-pulse border border-gray-100 dark:border-gray-700 h-64"></div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-3xl border border-red-50 dark:border-red-900/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">حصلت مشكلة في تحميل المنتجات، شيك على الإنترنت</p>
          <button onClick={() => loadAllData()} className="text-brand-600 font-bold text-sm mt-2 hover:underline">جرب مرة ثانية</button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-900 dark:text-white font-bold text-base mb-1">ما لقينا نتائج</p>
          <p className="text-gray-400 text-sm mb-4">
            {debouncedSearchQuery 
              ? `ما لقينا منتجات تطابق "${debouncedSearchQuery}".. جرب كلمة ثانية!`
              : 'ما في منتجات تطابق الفلاتر اللي اخترتها'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {debouncedSearchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')} 
                className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-bold rounded-xl border border-brand-200 dark:border-brand-800 hover:bg-brand-100 transition-colors"
              >
                امسح البحث
              </button>
            )}
            {activeFiltersCount > 0 && (
              <button 
                type="button"
                onClick={resetFilters} 
                className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 transition-colors"
              >
                امسح الفلاتر ({activeFiltersCount})
              </button>
            )}
          </div>
          {/* Smart suggestions */}
          {debouncedSearchQuery && currentProducts.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 mb-3">ممكن قصدك:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {currentProducts
                  .filter(p => p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase().slice(0, 2)))
                  .slice(0, 5)
                  .map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setSearchQuery(p.name);
                        addRecentSearch(p.name);
                      }}
                      className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search Results Info Bar */}
          {debouncedSearchQuery && (
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-xs text-gray-500">
                  <span className="font-bold text-gray-900 dark:text-white">{filteredProducts.length}</span> نتيجة بحث عن "<span className="font-bold">{debouncedSearchQuery}</span>"
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-gray-400 hover:text-brand-600 font-bold transition-colors"
              >
                امسح
              </button>
            </div>
          )}
          
          <div className="grid gap-3 grid-cols-2">
            {filteredProducts.slice(0, visibleCount).map((product, index) => {
              const isPackage = product.barcode.startsWith('PKG-') || product.category === 'عروض وبكجات';
              const savings = isPackage ? calculatePackageSavings(product, [...storeProducts, ...bakeryProducts]) : null;

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode={viewMode}
                  isFavorite={isFavorite}
                  toggleFavorite={toggleFavorite}
                  getItemQuantity={getItemQuantity}
                  handleAddToCart={handleAddToCart}
                  decreaseQuantityByName={decreaseQuantityByName}
                  setSelectedProductDetails={setSelectedProductDetails}
                  setRequestProduct={setRequestProduct}
                  justAdded={justAdded}
                  savings={savings}
                  debouncedSearchQuery={debouncedSearchQuery}
                  priority={index === 0}
                />
              );
            })}
          </div>

          {/* Load More */}
          {visibleCount < filteredProducts.length && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount(v => v + LOAD_MORE_ITEMS)}
                className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-[0.98] shadow-sm"
              >
                <ChevronDown className="w-4 h-4" />
                عرض المزيد
                <span className="text-[10px] text-gray-400 font-normal bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  باقي {filteredProducts.length - visibleCount} منتج
                </span>
              </button>
            </div>
          )}

          {/* End of list indicator */}
          {visibleCount >= filteredProducts.length && filteredProducts.length > INITIAL_ITEMS && (
            <div className="mt-6 text-center pb-4">
              <div className="inline-flex items-center gap-2 text-gray-400 text-xs">
                <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />
                <span>وصلت لآخر المنتجات</span>
                <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          )}
        </>
      )}

      {/* Filter Panel */}
      <FilterPanelModal
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filters={filters}
        setFilters={setFilters}
        maxProductPrice={maxProductPrice}
        filteredCount={filteredProducts.length}
        resetFilters={resetFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {requestProduct && (
        <ProductRequestModal
           initialProductName={requestProduct}
           onClose={() => setRequestProduct(null)}
        />
      )}

      {selectedProductDetails && (
        <ProductDetailsModal
           product={selectedProductDetails}
           onClose={() => setSelectedProductDetails(null)}
        />
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          height: 4px;
          background: transparent;
        }
        .hide-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 4px;
        }
        .hide-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
        }
      `}</style>
    </div>
  );
};
