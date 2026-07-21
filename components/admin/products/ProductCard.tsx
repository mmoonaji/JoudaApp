import React from 'react';
import { PackageSearch } from 'lucide-react';
import { Product } from '../../../services/supabaseService';
import { ProductIndicators } from './ProductIndicators';
import { AppImage } from '../../ui/AppImage';

export const ProductCard: React.FC<{ product: Product; onClick: () => void }> = ({ product, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`group bg-white dark:bg-gray-900 border p-2 rounded-xl cursor-pointer active:scale-[0.98] md:hover:border-brand-300 md:dark:hover:border-brand-700 md:hover:shadow-md transition-all flex items-center justify-between gap-2 md:gap-4 ${
        product.is_active === false || product.is_hidden_in_app ? 'border-dashed border-gray-300 dark:border-gray-700 opacity-75' : 'border-gray-100 dark:border-gray-800 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Tiny Image */}
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-700 overflow-hidden relative">
          <AppImage
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover ${product.is_active === false || product.is_hidden_in_app || product.force_out_of_stock ? 'grayscale' : ''}`}
            fallback={<PackageSearch className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />}
          />
        </div>

        {/* Info Layout */}
        <div className="min-w-0 flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-0.5 md:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className={`font-black text-xs md:text-sm truncate ${product.is_active === false || product.is_hidden_in_app ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
              {product.name}
            </h3>
            <span className="font-bold text-gray-400 text-[9px] md:text-[10px] bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded whitespace-nowrap border border-gray-100 dark:border-gray-800">
              {product.barcode}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <span className="text-[10px] md:text-xs text-brand-600 dark:text-brand-400 font-black px-1.5 rounded whitespace-nowrap bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/50">
              {product.price}<span className="saudi-riyal mr-1">{"\u00ea"}</span>
            </span>
            <span className="text-[9px] text-gray-500 font-bold bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[90px] whitespace-nowrap">
              {product.category}
            </span>
            {product.app_category && (
              <span className="text-[9px] text-brand-600 font-bold bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded truncate max-w-[90px] whitespace-nowrap">
                {product.app_category}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <ProductIndicators product={product} />
    </div>
  );
};
