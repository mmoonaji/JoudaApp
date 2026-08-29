import React, { useState, useMemo, useEffect } from 'react';
import { Gift, Search, Save, X, ArrowRight } from 'lucide-react';
import { Product } from '../../../services/supabaseService';
import { AdminProductService } from '../../../services/admin/AdminProductService';
import { ImageUploadInput } from '../ImageUploadInput';

interface PackageFormProps {
  products: Product[];
  editingPackage: Product | null;
  onClose: () => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  loadData: () => Promise<void>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const PackageForm: React.FC<PackageFormProps> = ({
  products,
  editingPackage,
  onClose,
  showSuccess,
  showError,
  loadData,
  loading,
  setLoading
}) => {
  const [pkgBarcode, setPkgBarcode] = useState('');
  const [pkgName, setPkgName] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgImage, setPkgImage] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [pkgItems, setPkgItems] = useState<{ barcode: string; product_name: string; quantity: number; price?: number }[]>([]);
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'items'>('info');
  
  const [compSearch, setCompSearch] = useState('');
  const [compQuantity, setCompQuantity] = useState(1);

  useEffect(() => {
    if (editingPackage) {
      setPkgBarcode(editingPackage.barcode);
      setPkgName(editingPackage.name);
      setPkgPrice(editingPackage.price?.toString() || '');
      setPkgDesc(editingPackage.description || '');
      setPkgImage(editingPackage.image_url || '');
      setIsActive(editingPackage.is_active);
      
      // Handle date formatting for datetime-local input
      if (editingPackage.valid_until) {
        const d = new Date(editingPackage.valid_until);
        // Format to YYYY-MM-DDThh:mm
        const formatted = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setValidUntil(formatted);
      } else {
        setValidUntil('');
      }

      // Load items
      const loadItems = async () => {
        try {
          setLoading(true);
          const items = await AdminProductService.getPackageItems(editingPackage.barcode);
          
          const enrichedItems = items.map((item: any) => {
            const productMatch = products.find(p => p.barcode === item.product_barcode);
            return {
              barcode: item.product_barcode,
              product_name: productMatch ? productMatch.name : 'منتج غير معروف',
              quantity: item.quantity,
              price: productMatch ? productMatch.price : 0
            };
          });
          
          setPkgItems(enrichedItems);
        } catch (err: any) {
          showError('فشل تحميل مكونات البكج');
        } finally {
          setLoading(false);
        }
      };
      loadItems();
    } else {
      // Auto-generate barcode for new package
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      setPkgBarcode(`PKG-${Date.now().toString().slice(-4)}${randomStr}`);
      setPkgName('');
      setPkgPrice('');
      setPkgDesc('');
      setPkgImage('');
      setValidUntil('');
      setIsActive(true);
      setPkgItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPackage]);

  const matchedComponents = useMemo(() => {
    if (!compSearch.trim()) return [];
    return products.filter(p => 
      !p.barcode.startsWith('PKG-') && 
      p.category !== 'عروض وبكجات' &&
      (p.name.toLowerCase().includes(compSearch.toLowerCase()) || p.barcode.includes(compSearch))
    ).slice(0, 5);
  }, [products, compSearch]);

  const addComponentToPackage = (prod: Product) => {
    if (pkgItems.some(i => i.barcode === prod.barcode)) {
      showError('المنتج مضاف بالفعل للبكج');
      return;
    }
    setPkgItems(prev => [...prev, {
      barcode: prod.barcode,
      product_name: prod.name,
      quantity: compQuantity,
      price: prod.price
    }]);
    setCompSearch('');
    setCompQuantity(1);
  };

  const removeComponentFromPackage = (barcode: string) => {
    setPkgItems(prev => prev.filter(i => i.barcode !== barcode));
  };

  const packageCalculation = useMemo(() => {
    const regularTotal = pkgItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
    const salePrice = parseFloat(pkgPrice) || 0;
    const savings = regularTotal > salePrice ? regularTotal - salePrice : 0;
    const savingsPercentage = regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0;
    return { regularTotal, savings, savingsPercentage };
  }, [pkgItems, pkgPrice]);

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgBarcode.trim() || !pkgName.trim() || !pkgPrice.trim()) {
      showError('يرجى تعبئة الحقول الأساسية للبكج');
      return;
    }
    if (pkgItems.length === 0) {
      showError('يجب إضافة منتج واحد على الأقل داخل البكج');
      return;
    }

    try {
      setLoading(true);
      const isoDate = validUntil ? new Date(validUntil).toISOString() : null;
      
      await AdminProductService.upsertPackage(
        pkgBarcode.trim(),
        pkgName.trim(),
        parseFloat(pkgPrice),
        pkgDesc.trim(),
        pkgImage.trim(),
        pkgItems.map(i => ({ barcode: i.barcode, quantity: i.quantity })),
        isoDate,
        isActive
      );

      showSuccess(editingPackage ? 'تم تحديث البكج التوفيري بنجاح' : 'تم إنشاء البكج التوفيري بنجاح');
      await loadData();
      onClose();
    } catch (err: any) {
      showError(err.message || 'فشل حفظ البكج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 animate-fade-in">
      
      {/* Column 1: Info & Search Box */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Main Metadata Form */}
        <form id="package-form" onSubmit={handleSavePackage} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-3">
            <h2 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              {editingPackage ? 'تعديل البكج' : 'إنشاء بكج توفيري جديد'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-bold bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg"
            >
              <span>رجوع للقائمة</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Tab Switched Segmented Control */}
          <div className="flex lg:hidden bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-2">
            <button
              type="button"
              onClick={() => setActiveFormTab('info')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${
                activeFormTab === 'info'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              بيانات البكج
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('items')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeFormTab === 'items'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>مكونات البكج</span>
              {pkgItems.length > 0 && (
                <span className="bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded-full text-[9px] font-mono">
                  {pkgItems.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Info (Hidden on mobile if tab is items) */}
          <div className={`${activeFormTab === 'info' ? 'block' : 'hidden lg:block'} space-y-4`}>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] text-gray-400 font-bold mb-1.5">اسم البكج *</label>
                <input
                  type="text"
                  placeholder="بكج الرشاقة الخالي من الغلوتين"
                  required
                  value={pkgName}
                  onChange={e => setPkgName(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 font-bold mb-1.5">سعر العرض للبكج (ريال) *</label>
                <input
                  type="number"
                  placeholder="4500"
                  required
                  value={pkgPrice}
                  onChange={e => setPkgPrice(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white font-mono"
                />
              </div>
              <div>
                <ImageUploadInput
                  value={pkgImage}
                  onChange={setPkgImage}
                  folder="packages"
                  label="صورة البكج (اختياري)"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 font-bold mb-1.5">تاريخ ووقت انتهاء العرض (اختياري)</label>
                <input
                  type="datetime-local"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-white font-mono"
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="relative inline-flex items-center cursor-pointer select-none" dir="ltr">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                  <span className="ml-3 text-xs font-bold text-gray-900 dark:text-gray-300">
                    {isActive ? 'البكج مفعل ومرئي' : 'البكج متوقف ومخفي'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 font-bold mb-1.5">وصف البكج (يدعم Markdown)</label>
              <textarea
                rows={3}
                placeholder="تفاصيل العرض والمميزات... (يدعم **عريض**، - قوائم، أسطر جديدة)"
                value={pkgDesc}
                onChange={e => setPkgDesc(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none dark:text-white"
              />
            </div>

            {/* Wizard Next Button on Mobile */}
            <button
              type="button"
              onClick={() => setActiveFormTab('items')}
              className="w-full lg:hidden bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98] mt-4"
            >
              <span>التالي: اختيار المكونات</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </form>

        {/* Tab 2: Components Selector (Hidden on mobile if tab is info) */}
        <div className={`${activeFormTab === 'items' ? 'block' : 'hidden lg:block'} bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl space-y-4`}>
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">أضف منتجات داخل البكج</label>
          
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="ابحث عن منتج فرعي لإضافته..."
                value={compSearch}
                onChange={e => setCompSearch(e.target.value)}
                className="w-full h-10 pr-9 pl-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none dark:text-white"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              
              {/* Results list */}
              {matchedComponents.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
                  {matchedComponents.map(p => (
                    <button
                      key={p.barcode}
                      type="button"
                      onClick={() => addComponentToPackage(p)}
                      className="w-full px-3 py-2.5 text-right text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                    >
                      <span className="font-bold dark:text-white">{p.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">({p.price}<span className="saudi-riyal mr-1">{"\u00ea"}</span>)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-20 shrink-0">
              <input
                type="number"
                min={1}
                value={compQuantity}
                onChange={e => setCompQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-10 px-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-center focus:outline-none dark:text-white font-mono"
                title="الكمية المطلوبة"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Column 2: Selected Items, Savings Box, and Save Button */}
      {/* Hidden on mobile if active tab is info */}
      <div className={`${activeFormTab === 'items' ? 'block' : 'hidden lg:block'} space-y-4`}>
        
        {/* Selected Items List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 rounded-3xl space-y-3">
          <h3 className="text-xs font-black text-gray-800 dark:text-gray-200">المنتجات المختارة ({pkgItems.length})</h3>
          
          <div className="space-y-2 divide-y divide-gray-50 dark:divide-gray-800 max-h-[250px] overflow-y-auto">
            {pkgItems.map(item => (
              <div key={item.barcode} className="flex items-center justify-between pt-2.5 first:pt-0">
                <div className="min-w-0 flex-1 pl-2">
                  <p className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{item.product_name}</p>
                  <p className="text-[10px] text-gray-400 font-bold font-mono mt-0.5">
                    {item.quantity} عدد × {item.price || 0}<span className="saudi-riyal mr-1">{"\u00ea"}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeComponentFromPackage(item.barcode)}
                  className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {pkgItems.length === 0 && (
              <p className="text-[10px] text-gray-400 text-center py-6">الرجاء إضافة منتجات لتظهر هنا</p>
            )}
          </div>
        </div>

        {/* Savings Box */}
        <div className="bg-gradient-to-br from-amber-500/5 to-brand-500/5 border border-amber-100 dark:border-brand-900/30 p-4 rounded-3xl">
          <h3 className="text-xs font-black text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-1">
            <span>توفير البكج التقديري</span>
            <span>⚡</span>
          </h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>سعر المكونات فرادى:</span>
              <span className="font-bold font-mono">{packageCalculation.regularTotal}<span className="saudi-riyal mr-1">{"\u00ea"}</span></span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>سعر البكج المحدد:</span>
              <span className="font-bold font-mono text-brand-600">{pkgPrice || 0}<span className="saudi-riyal mr-1">{"\u00ea"}</span></span>
            </div>
            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>
            <div className="flex justify-between text-green-600 dark:text-green-400 font-bold">
              <span>المبلغ الموفر:</span>
              <span className="font-black font-mono">-{packageCalculation.savings}<span className="saudi-riyal mr-1">{"\u00ea"}</span> ({packageCalculation.savingsPercentage}%)</span>
            </div>
          </div>
        </div>

        {/* Save Button (Form submit button placed outside of the form using HTML5 form attribute) */}
        <button
          type="submit"
          form="package-form"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <Save className="w-4.5 h-4.5" />
          <span>حفظ البكج التوفيري</span>
        </button>

      </div>
      
    </div>
  );
};
