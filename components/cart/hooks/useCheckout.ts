import { useState, useMemo, useEffect } from 'react';
import { calculateDistance, calculateDeliveryFeeDetails } from '../../../utils/distanceUtils';
import { fetchPublicSettingsFromSupabase } from '../../../services/supabaseService';

const MIN_CUSTOMER_DISTANCE_KM = 0.2;

export const useCheckout = (
  items: any[], 
  cachedProducts: any[],
  sendOrderToWhatsApp: (name: string, address: string, notes: string) => void,
  submitOrderToSystem: (data: any) => Promise<any>
) => {
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('jouda_customer_name') || '');
  const [address, setAddress] = useState(() => localStorage.getItem('jouda_customer_address') || '');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState(() => localStorage.getItem('jouda_customer_phone') || '');
  
  // Map settings and location state
  const [storeLat, setStoreLat] = useState<number>(15.3980555);
  const [storeLng, setStoreLng] = useState<number>(44.2094444);
  const [pricePerKm, setPricePerKm] = useState<number>(150);
  
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'map_click' | 'search' | null>(null);
  
  const [deliveryZone, setDeliveryZone] = useState<'sanaa' | 'provinces'>(
    () => (localStorage.getItem('jouda_delivery_zone') as 'sanaa' | 'provinces') || 'sanaa'
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<{
    orderNumber: string;
    quotationId: string;
    orderId?: string;
    total: number;
  } | null>(null);

  // Fetch store coordinates and delivery price per km on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await fetchPublicSettingsFromSupabase();
        if (data) {
          setStoreLat(data.store_latitude ?? 15.3980555);
          setStoreLng(data.store_longitude ?? 44.2094444);
          setPricePerKm(data.delivery_price_per_km ?? 150);
        }
      } catch (e) {
        console.warn('Failed to fetch map settings', e);
      }
    };
    fetchSettings();
  }, []);

  // ── Computed Values ──
  const currentSubtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price || '0') || 0;
      return sum + (price * item.quantity);
    }, 0);
  }, [items]);

  const totalSavings = useMemo(() => {
    return items.reduce((sum, item) => {
      const matchedProduct = cachedProducts.find(p => p.barcode === item.barcode || p.name === item.name);
      const isPackage = item.barcode?.startsWith('PKG-') || matchedProduct?.category === 'عروض وبكجات';
      const bundleItems = matchedProduct?.bundle_items || [];
      
      if (isPackage && bundleItems.length > 0) {
        const regularTotal = bundleItems.reduce((bSum: number, bItem: any) => {
          const compProd = cachedProducts.find(p => p.barcode === bItem.barcode);
          const compPrice = compProd ? compProd.price : 0;
          return bSum + (compPrice * bItem.quantity);
        }, 0);
        const pkgPrice = parseFloat(item.price || '0') || 0;
        if (regularTotal > pkgPrice) {
          return sum + ((regularTotal - pkgPrice) * item.quantity);
        }
      }
      return sum;
    }, 0);
  }, [items, cachedProducts]);

  const SANAA_FREE_LIMIT = 20000;
  const PROVINCES_FREE_LIMIT = 40000;

  const { currentFee, rawFee, isFreeDelivery, distanceKm, qualifiesForFree } = useMemo(() => {
    const qualifies = 
      (deliveryZone === 'sanaa' && currentSubtotal >= SANAA_FREE_LIMIT) ||
      (deliveryZone === 'provinces' && currentSubtotal >= PROVINCES_FREE_LIMIT);

    if (qualifies) {
      let raw = 0;
      let dist = 0;
      if (deliveryZone === 'sanaa' && customerLat && customerLng) {
        dist = calculateDistance(storeLat, storeLng, customerLat, customerLng);
        if (dist <= 20) {
          const { rawFee: rawF } = calculateDeliveryFeeDetails(dist, pricePerKm);
          raw = rawF;
        }
      }
      return {
        currentFee: 0,
        rawFee: raw,
        isFreeDelivery: true,
        distanceKm: dist,
        qualifiesForFree: true
      };
    }

    if (deliveryZone === 'provinces') {
      return { currentFee: 0, rawFee: 0, isFreeDelivery: true, distanceKm: 0, qualifiesForFree: false };
    }
    if (customerLat && customerLng) {
      const dist = calculateDistance(storeLat, storeLng, customerLat, customerLng);
      const isFar = dist > 20;
      if (isFar) {
        return { currentFee: 0, rawFee: 0, isFreeDelivery: true, distanceKm: dist, qualifiesForFree: false };
      }
      const { rawFee: raw, boundedFee } = calculateDeliveryFeeDetails(dist, pricePerKm);
      return {
        currentFee: boundedFee,
        rawFee: raw,
        isFreeDelivery: false,
        distanceKm: dist,
        qualifiesForFree: false
      };
    }
    return { currentFee: 0, rawFee: 0, isFreeDelivery: true, distanceKm: 0, qualifiesForFree: false };
  }, [customerLat, customerLng, storeLat, storeLng, pricePerKm, deliveryZone, currentSubtotal]);

  const isLocationTooCloseToStore = deliveryZone === 'sanaa' &&
    customerLat !== null &&
    customerLng !== null &&
    calculateDistance(storeLat, storeLng, customerLat, customerLng) < MIN_CUSTOMER_DISTANCE_KM;

  const grandTotal = currentSubtotal + currentFee;
  const missingFields = useMemo(() => {
    const fields: string[] = [];
    if (!customerName.trim()) {
      fields.push('الاسم الكريم');
    }
    if (phone.trim().length < 9) {
      fields.push('رقم الجوال');
    }
    if (!address.trim()) {
      fields.push(deliveryZone === 'sanaa' ? 'تفاصيل عنوان التوصيل' : 'تفاصيل عنوان الشحن');
    }
    if (deliveryZone === 'sanaa' && (customerLat === null || customerLng === null)) {
      fields.push('تحديد الموقع على الخريطة');
    }
    if (deliveryZone === 'sanaa' && customerLat !== null && customerLng !== null && !locationConfirmed) {
      fields.push('تأكيد الموقع من الخريطة');
    }
    if (deliveryZone === 'sanaa' && isLocationTooCloseToStore) {
      fields.push('اختيار موقع أبعد من فرع جوده');
    }
    return fields;
  }, [address, customerLat, customerLng, customerName, deliveryZone, isLocationTooCloseToStore, locationConfirmed, phone]);

  const validationMessage = missingFields.length > 0
    ? `باقي: ${missingFields.join('، ')}`
    : '';

  const isFormValid = customerName.trim() !== '' && 
    phone.trim().length >= 9 && 
    address.trim() !== '' && 
    (
      deliveryZone === 'provinces' ||
      (
        customerLat !== null &&
        customerLng !== null &&
        locationConfirmed &&
        !isLocationTooCloseToStore
      )
    );

  const isSaved = (key: string, val: string) => !!val && localStorage.getItem(key) === val;

  // ── Handlers ──
  const handleSendOrder = () => {
    if (!customerName.trim() || !address.trim()) {
      alert('يرجى تعبئة الاسم الكريم وعنوان التوصيل');
      return;
    }
    sendOrderToWhatsApp(customerName, address, notes);
  };

  const handleSubmitOrder = async (onSuccess: () => void) => {
    if (submitting) return;

    if (!isFormValid) {
      alert(`فضلاً، أكمل البيانات التالية لتأكيد طلبك:\n\n• ${missingFields.join('\n• ')}`);
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const isShipping = deliveryZone === 'provinces';
      
      const result = await submitOrderToSystem({
        customer_name: customerName.trim(),
        customer_phone: phone.trim(),
        customer_address: address,
        order_type: isShipping ? 'shipping' : (distanceKm > 20 ? 'shipping' : 'delivery'),
        payment_method: 'CASH',
        notes: notes || undefined,
        subtotal: currentSubtotal,
        delivery_fee: isShipping ? 0 : (distanceKm > 20 ? 0 : currentFee),
        latitude: isShipping ? null : customerLat,
        longitude: isShipping ? null : customerLng
      });

      if (result.success) {
        // Save form fields for auto-fill next time
        localStorage.setItem('jouda_customer_phone', phone.trim());
        localStorage.setItem('jouda_customer_name', customerName.trim());
        localStorage.setItem('jouda_customer_address', address.trim());
        localStorage.setItem('jouda_delivery_zone', deliveryZone);

        setLastOrderDetails({
          orderNumber: result.order_number || result.quotation_id || '',
          quotationId: result.quotation_id || '',
          orderId: result.order_id,
          total: currentSubtotal + currentFee,
        });
        
        onSuccess();
        setTimeout(() => setShowSuccessModal(true), 300);
      } else {
        setSubmitResult({ success: false, message: result.message });
      }
    } catch (e: any) {
      setSubmitResult({ success: false, message: e.message || 'فشل إرسال الطلب' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setCustomerLat(null);
    setCustomerLng(null);
    setLocationConfirmed(false);
    setLocationSource(null);
  };

  const confirmLocation = (lat: number, lng: number, source: 'gps' | 'map_click' | 'search') => {
    setCustomerLat(lat);
    setCustomerLng(lng);
    setLocationConfirmed(true);
    setLocationSource(source);
  };

  const updateDeliveryZone = (zone: 'sanaa' | 'provinces') => {
    setDeliveryZone(zone);
    setCustomerLat(null);
    setCustomerLng(null);
    setLocationConfirmed(false);
    setLocationSource(null);
  };

  return {
    customerName, setCustomerName,
    address, setAddress,
    notes, setNotes,
    phone, setPhone,
    customerLat, setCustomerLat,
    customerLng, setCustomerLng,
    locationConfirmed,
    locationSource,
    isLocationTooCloseToStore,
    minCustomerDistanceKm: MIN_CUSTOMER_DISTANCE_KM,
    confirmLocation,
    deliveryZone, setDeliveryZone: updateDeliveryZone,
    storeLat, storeLng, pricePerKm,
    submitting,
    submitResult,
    showSuccessModal, setShowSuccessModal,
    lastOrderDetails,
    currentSubtotal,
    totalSavings,
    currentFee,
    rawFee,
    isFreeDelivery,
    distanceKm,
    qualifiesForFree,
    sanaaFreeLimit: SANAA_FREE_LIMIT,
    provincesFreeLimit: PROVINCES_FREE_LIMIT,
    grandTotal,
    isFormValid,
    missingFields,
    validationMessage,
    isSaved,
    handleSendOrder,
    handleSubmitOrder,
    resetForm
  };
};

