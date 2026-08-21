import React, { useState } from 'react';
import { Wallet, User, MessageCircle, MapPin, FileText, Map, Sparkles, Building, Truck } from 'lucide-react';
import { FULL_RATE_THRESHOLD } from '../../utils/distanceUtils';

const arabicToEnglishNumbers = (str: string) => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => arabicNumbers.indexOf(w).toString());
};

interface CheckoutFormFieldsProps {
  customerName: string;
  setCustomerName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  customerLat: number | null;
  customerLng: number | null;
  locationConfirmed: boolean;
  isLocationTooCloseToStore: boolean;
  address: string;
  setAddress: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  isFormValid: boolean;
  isSaved: (key: string, value: string) => boolean;
  onOpenMap: () => void;
  rawFee?: number;
  currentFee?: number;
  deliveryZone: 'sanaa' | 'provinces';
  setDeliveryZone: (v: 'sanaa' | 'provinces') => void;
  qualifiesForFree?: boolean;
}

export const CheckoutFormFields: React.FC<CheckoutFormFieldsProps> = ({
  customerName,
  setCustomerName,
  phone,
  setPhone,
  customerLat,
  customerLng,
  locationConfirmed,
  isLocationTooCloseToStore,
  address,
  setAddress,
  notes,
  setNotes,
  isFormValid,
  onOpenMap,
  rawFee = 0,
  currentFee = 0,
  deliveryZone,
  setDeliveryZone,
  qualifiesForFree = false
}) => {
  const [showNotes, setShowNotes] = useState(!!notes);
  // Show distance-cap savings info card when the company is subsidising any part of the delivery fee
  const showSurpriseCard = !qualifiesForFree && deliveryZone === 'sanaa' && rawFee > currentFee && currentFee > 0;
  const savings = rawFee - currentFee;
  const isFullRateDiscount = rawFee > FULL_RATE_THRESHOLD;

  return (
    <section className="mb-4 animate-fade-in">
      {/* Title */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-brand-600" />
          بيانات التوصيل والشحن
        </h3>
        {isFormValid && (
          <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 font-bold px-2 py-0.5 rounded-full">✓ مكتمل</span>
        )}
      </div>

      {/* Segmented Control / Tabs Selector */}
      <div className="mb-4 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl flex w-full border border-gray-200/50 dark:border-gray-700/30">
        <button
          type="button"
          onClick={() => setDeliveryZone('sanaa')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
            deliveryZone === 'sanaa'
              ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Building className="w-4 h-4" />
          داخل صنعاء
        </button>
        <button
          type="button"
          onClick={() => setDeliveryZone('provinces')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
            deliveryZone === 'provinces'
              ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          شحن المحافظات
        </button>
      </div>

      <div className="space-y-4">
          {/* Customer Name */}
          <div>
            <label htmlFor="cart-name" className="text-xs font-bold text-gray-550 dark:text-gray-400 block mb-1.5">
              الاسم الكريم
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
              <input 
                id="cart-name"
                type="text" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pr-11 pl-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-sm dark:text-white font-medium transition-all shadow-sm"
                placeholder="اكتب اسمك الثلاثي"
              />
            </div>
          </div>

          {/* Phone and map for Sana'a, or phone full-width for provinces */}
          {deliveryZone === 'sanaa' ? (
            <div className="space-y-4">
              {/* Customer Phone */}
              <div>
                <label htmlFor="cart-phone" className="text-xs font-bold text-gray-550 dark:text-gray-400 block mb-1.5">
                  رقم الجوال
                </label>
                <div className="relative">
                  <MessageCircle className={`w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 ${phone.length > 0 && phone.length < 9 ? 'text-red-400' : 'text-gray-400'}`} />
                  <input 
                    id="cart-phone"
                    type="tel" 
                    value={phone}
                    onChange={(e) => {
                      const englishNums = arabicToEnglishNumbers(e.target.value);
                      const val = englishNums.replace(/\D/g, '');
                      if (val.length <= 15) setPhone(val);
                    }}
                    className={`w-full pr-10 pl-3 py-3 bg-gray-50 dark:bg-gray-800/50 border rounded-xl focus:outline-none focus:ring-4 text-sm dark:text-white font-medium transition-all shadow-sm text-left ${phone.length > 0 && phone.length < 9 ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-brand-500 focus:ring-brand-500/10'}`}
                    placeholder="77XXXXXXX"
                    dir="ltr"
                  />
                </div>
                {phone.length > 0 && phone.length < 9 && (
                  <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">📱 الرقم ناقص، لازم يكون 9 أرقام</p>
                )}
                <p className="text-[10px] text-gray-400 font-bold mt-1.5 leading-relaxed">
                  مهم: اكتب رقم الواتساب عشان نقدر نأكد الطلب ونتواصل معك.
                </p>
              </div>

              {/* Map picker */}
              <div>
                <label className="text-xs font-bold text-gray-550 dark:text-gray-400 block mb-1.5">
                  موقع التوصيل
                </label>
                <button
                  type="button"
                  onClick={onOpenMap}
                  className={`w-full min-h-[50px] px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border shadow-sm active:scale-[0.98] ${
                    locationConfirmed && customerLat && customerLng && !isLocationTooCloseToStore
                      ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400' 
                      : isLocationTooCloseToStore
                        ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Map className={`w-4 h-4 shrink-0 ${
                    locationConfirmed && customerLat && customerLng && !isLocationTooCloseToStore
                      ? 'text-green-500'
                      : isLocationTooCloseToStore
                        ? 'text-red-500'
                        : 'text-brand-500'
                  }`} />
                  <span className="truncate">
                    {locationConfirmed && customerLat && customerLng && !isLocationTooCloseToStore
                      ? 'تم تأكيد الموقع ✓'
                      : isLocationTooCloseToStore
                        ? 'أعد تحديد الموقع'
                        : 'حدد على الخريطة 📍'}
                  </span>
                </button>
                {isLocationTooCloseToStore ? (
                  <p className="text-[10px] text-red-500 font-bold mt-1.5 leading-relaxed">
                    الموقع قريب جداً من جوده. حدد موقع بيتك بدقة.
                  </p>
                ) : locationConfirmed && customerLat && customerLng ? (
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mt-1.5">
                    تم تأكيد موقعك لحساب التوصيل.
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 font-bold mt-1.5 leading-relaxed">
                    لازم تؤكد موقعك على الخريطة عشان نحسب التوصيل صح.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Customer Phone (Full width for Provinces) */
            <div>
              <label htmlFor="cart-phone" className="text-xs font-bold text-gray-550 dark:text-gray-400 block mb-1.5">
                رقم الجوال
              </label>
              <div className="relative">
                <MessageCircle className={`w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 ${phone.length > 0 && phone.length < 9 ? 'text-red-400' : 'text-gray-400'}`} />
                <input 
                  id="cart-phone"
                  type="tel" 
                  value={phone}
                  onChange={(e) => {
                    const englishNums = arabicToEnglishNumbers(e.target.value);
                    const val = englishNums.replace(/\D/g, '');
                    if (val.length <= 15) setPhone(val);
                  }}
                  className={`w-full pr-11 pl-4 py-3 bg-gray-50 dark:bg-gray-800/50 border rounded-xl focus:outline-none focus:ring-4 text-sm dark:text-white font-medium transition-all shadow-sm text-left ${phone.length > 0 && phone.length < 9 ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:border-brand-500 focus:ring-brand-500/10'}`}
                  placeholder="77XXXXXXX"
                  dir="ltr"
                />
              </div>
              {phone.length > 0 && phone.length < 9 && (
                <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">📱 الرقم ناقص، لازم يكون 9 أرقام</p>
              )}
              <p className="text-[10px] text-gray-400 font-bold mt-1.5 leading-relaxed">
                مهم: اكتب رقم الواتساب عشان نقدر نأكد الطلب ونتواصل معك.
              </p>
            </div>
          )}

          {/* Floating Surprise Card (Only shown for Sana'a when fee > MAX and no absolute free delivery) */}
          {showSurpriseCard && (
            <div className="surprise-card-container animate-surprise-card">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 dark:border-emerald-500/10 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 dark:from-emerald-950/25 dark:to-emerald-950/5 pr-5 pl-4 py-4 shadow-sm backdrop-blur-md">
                {/* Vertical brand accent strip on the right edge */}
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500 dark:bg-emerald-400 rounded-r-2xl"></div>
                
                <div className="relative flex items-start gap-3.5">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 animate-float-icon">
                    <Sparkles className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                      <span>🎉 مفاجأة من جوده!</span>
                    </p>
                    <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed font-bold">
                      {isFullRateDiscount
                        ? 'مشوارك بعيد، لكن جوده معك! خصم ثابت '
                        : 'لأن مشوارك بعيد وطلبت من التطبيق، جوده تتحمل الفارق لتوصيل طلبك بـ'}
                      {!isFullRateDiscount && ' '}
                      <span className="inline-flex items-center gap-0.5 font-black text-emerald-950 dark:text-white bg-white/70 dark:bg-gray-800/80 px-1.5 py-0.5 rounded-md border border-emerald-500/10 shadow-sm font-mono leading-none">
                        {isFullRateDiscount ? savings.toLocaleString('en-US') : currentFee.toLocaleString('en-US')}
                        <span className="saudi-riyal mr-0.5">{"\u00ea"}</span>
                      </span>{' '}
                      {isFullRateDiscount ? 'على التوصيل' : 'فقط'} (وفرت{' '}
                      <span className="inline-flex items-center gap-0.5 font-black text-emerald-950 dark:text-white bg-white/70 dark:bg-gray-800/80 px-1.5 py-0.5 rounded-md border border-emerald-500/10 shadow-sm font-mono leading-none">
                        {savings.toLocaleString('en-US')}
                        <span className="saudi-riyal mr-0.5">{"\u00ea"}</span>
                      </span>
                      ) 💚
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Address Details */}
          <div>
            <label htmlFor="cart-address" className="text-xs font-bold text-gray-550 dark:text-gray-400 block mb-1.5">
              {deliveryZone === 'sanaa' 
                ? 'تفاصيل العنوان (رقم البيت / الدور / الشقة)' 
                : 'تفاصيل عنوان الشحن (المحافظة / المدينة / الشارع)'}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
              <input 
                id="cart-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pr-11 pl-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-sm dark:text-white font-medium transition-all shadow-sm"
                placeholder={deliveryZone === 'sanaa' 
                  ? 'مثال: الدور الثاني، شقة 4، بجانب...' 
                  : 'مثال: إب، مدينة القاعدة، بجانب مدرسة...'}
              />
            </div>
          </div>

          {/* Notes for driver */}
          {!showNotes ? (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1.5 py-1"
            >
              <span className="text-sm leading-none">+</span>
              إضافة ملاحظة للمندوب أو الشحن (اختياري)
            </button>
          ) : (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="cart-notes" className="text-xs font-bold text-gray-550 dark:text-gray-400">ملاحظات إضافية</label>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNotes(false);
                    setNotes('');
                  }}
                  className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-bold"
                >
                  إلغاء
                </button>
              </div>
              <div className="relative">
                <FileText className="w-4 h-4 text-gray-400 absolute right-4 top-3.5" />
                <textarea 
                  id="cart-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full pr-11 pl-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-sm dark:text-white font-medium resize-none transition-all shadow-sm"
                  placeholder="مثال: اتصل بي أول ما توصل، لون الباب بني..."
                />
              </div>
            </div>
          )}
        </div>

      {/* Animations */}
      <style>{`
        @keyframes surprise-card-in {
          0% { opacity: 0; transform: translateY(-12px) scale(0.96); }
          50% { opacity: 1; transform: translateY(4px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float-icon {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes slide-down {
          0% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-surprise-card {
          animation: surprise-card-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-shimmer {
          animation: shimmer 2.5s ease-in-out infinite;
        }
        .animate-float-icon {
          animation: float-icon 2s ease-in-out infinite;
        }
        .animate-slide-down {
          animation: slide-down 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </section>
  );
};
