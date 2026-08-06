
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { STORE_CONFIG } from '../constants';
import { submitOrderToSupabase } from '../services/supabaseService';
import { saveCartToDB, loadCartFromDB, addPendingOrder, getPendingOrdersCount, saveCompletedOrder, getCachedProducts } from '../services/db';

export interface CartItem {
  id: string;
  barcode?: string;
  name: string;
  quantity: number;
  price?: string; 
  source: 'store' | 'bakery';
}

interface CartContextType {
  items: CartItem[];
  addToCart: (name: string, source?: 'store' | 'bakery', barcode?: string, price?: string) => void;
  addToCartWithBarcode: (item: { name: string; barcode: string; price?: string; source?: 'store' | 'bakery' }) => void;
  addMultipleToCart: (names: string[], source?: 'store' | 'bakery') => void;
  decreaseQuantity: (id: string) => void;
  decreaseQuantityByName: (name: string) => void;
  setItemQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  sendOrderToWhatsApp: (name?: string, address?: string, notes?: string) => void;
  submitOrderToSystem: (payload: {
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
  }) => Promise<{ success: boolean; order_number?: string; quotation_id?: string; order_id?: string; message: string }>;
  totalItems: number;
  getItemQuantity: (name: string) => number;
  lastAddedItem: string | null; // For triggering notifications
  pendingOrdersCount: number; // Number of offline pending orders
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  // #13: ref to skip first IDB save (items start as [] before load)
  const isFirstRender = useRef(true);

  // Load cart from IndexedDB on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = await loadCartFromDB();
        if (savedCart.length > 0) {
          setItems(savedCart);
        } else {
          // Fallback to localStorage for migration
          const legacyCart = localStorage.getItem('jouda_cart_v2');
          if (legacyCart) {
            const parsed = JSON.parse(legacyCart);
            setItems(parsed);
            // Migrate to IndexedDB
            await saveCartToDB(parsed);
            localStorage.removeItem('jouda_cart_v2');
          }
        }
      } catch (e) {
        console.warn('Failed to load cart from IndexedDB', e);
      }
    };
    loadCart();

    // Load pending orders count
    const loadPending = async () => {
      try {
        const count = await getPendingOrdersCount();
        setPendingOrdersCount(count);
      } catch (e) {}
    };
    loadPending();
  }, []);

  // Save cart to IndexedDB whenever it changes
  // #13: Skip first render (items = [] before IDB load completes)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (items.length === 0) return; // Don't write empty cart unnecessarily
    const saveCart = async () => {
      try {
        await saveCartToDB(items);
      } catch (e) {
        console.warn('Failed to save cart to IndexedDB', e);
      }
    };
    saveCart();
  }, [items]);

  // Helper to trigger notification
  const triggerNotification = useCallback((name: string) => {
    setLastAddedItem(name);
    // Reset after a short delay so the same item can trigger it again later if needed
    setTimeout(() => setLastAddedItem(null), 2000);
  }, []);

  // #14: crypto.randomUUID() instead of Math.random() for safe unique IDs
  const newId = () => crypto.randomUUID();

  const addToCart = useCallback((name: string, source: 'store' | 'bakery' = 'store', barcode?: string, price?: string) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.name === name);
      if (existing) {
        return prev.map((item) =>
          item.name === name ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: newId(), name, barcode, price, quantity: 1, source }];
    });
    triggerNotification(name);
    try { navigator.vibrate?.(15); } catch {}
  }, [triggerNotification]);

  const addToCartWithBarcode = useCallback((item: { name: string; barcode: string; price?: string; source?: 'store' | 'bakery' }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) =>
          i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: newId(),
        name: item.name,
        barcode: item.barcode,
        price: item.price,
        quantity: 1,
        source: item.source || 'store'
      }];
    });
    triggerNotification(item.name);
    try { navigator.vibrate?.(15); } catch {}
  }, [triggerNotification]);

  const addMultipleToCart = useCallback((names: string[], source: 'store' | 'bakery' = 'store') => {
    setItems((prev) => {
      let newItems = [...prev];
      names.forEach(name => {
        if (!name) return;
        const existingIndex = newItems.findIndex(item => item.name === name);
        if (existingIndex > -1) {
          newItems[existingIndex] = { 
            ...newItems[existingIndex], 
            quantity: newItems[existingIndex].quantity + 1 
          };
        } else {
          newItems.push({ 
            id: newId(), 
            name: name, 
            quantity: 1,
            source
          });
        }
      });
      return newItems;
    });
    // Trigger notification for the first item or a generic message
    if (names.length > 0) triggerNotification('مجموعة منتجات');
  }, [triggerNotification]);

  const decreaseQuantity = useCallback((id: string) => {
    setItems((prev) => {
      return prev.map(item => {
        if (item.id === id) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  }, []);

  const decreaseQuantityByName = useCallback((name: string) => {
    setItems((prev) => {
      return prev.map(item => {
        if (item.name === name) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  }, []);

  const setItemQuantity = useCallback((id: string, quantity: number) => {
    const normalizedQuantity = Math.max(0, Math.floor(quantity));
    setItems((prev) => {
      if (normalizedQuantity === 0) {
        return prev.filter((item) => item.id !== id);
      }
      return prev.map((item) => (
        item.id === id ? { ...item, quantity: normalizedQuantity } : item
      ));
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const getItemQuantity = useCallback((name: string) => {
    const item = items.find(i => i.name === name);
    return item ? item.quantity : 0;
  }, [items]);

  const sendOrderToWhatsApp = useCallback((name?: string, address?: string, notes?: string) => {
    if (items.length === 0) return;

    const storeItems = items.filter(i => i.source === 'store' || !i.source);
    const bakeryItems = items.filter(i => i.source === 'bakery');

    let message = `*طلب جديد من تطبيق جوده* 🛍️\n\n`;
    
    if (name) message += `👤 *الاسم الكريم:* ${name}\n`;
    if (address) message += `📍 *العنوان / الاستلام:* ${address}\n`;
    
    message += `\n------------------\n`;
    
    if (storeItems.length > 0) {
      message += `*🛒 طلبات المتجر:*\n`;
      storeItems.forEach((item) => {
        message += `- ${item.name} *(العدد: ${item.quantity})*\n`;
      });
      message += `\n`;
    }

    if (bakeryItems.length > 0) {
      message += `*🧁 طلبات المخبز:*\n`;
      bakeryItems.forEach((item) => {
        message += `- ${item.name} *(العدد: ${item.quantity})*\n`;
      });
      message += `\n`;
    }

    if (notes && notes.trim()) {
      message += `------------------\n`;
      message += `📝 *ملاحظات:* ${notes}\n`;
    }
    
    message += `------------------\n`;
    message += `يرجى تأكيد الطلب. شكراً!`;

    const encodedMessage = encodeURIComponent(message);
    const phone = STORE_CONFIG.PHONE.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    
    window.open(url, '_blank');
  }, [items]);

  const submitOrderToSystem = useCallback(async (payload: {
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
  }) => {
    if (items.length === 0) {
      return { success: false, message: 'السلة فارغة' };
    }

    // #15: Skip IDB scan if all items already have barcodes
    let resolvedItems = items;
    const allHaveBarcodes = items.every(item => item.barcode);
    if (!allHaveBarcodes) {
      try {
        const cachedProducts = await getCachedProducts();
        resolvedItems = items.map(item => {
          if (item.barcode) return item;
          const matchedProduct = cachedProducts.find(p => p.name === item.name);
          return {
            ...item,
            barcode: matchedProduct?.barcode || '',
            price: item.price || matchedProduct?.price?.toString() || '0'
          };
        });
      } catch (e) {
        console.warn('Failed to lookup missing barcodes', e);
      }
    }

    // Filter out items without barcode (fallback items)
    const validItems = resolvedItems
      .filter((item) => item.barcode)
      .map((item) => ({
        product_barcode: item.barcode!,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: parseFloat(item.price || '0') || 0,
      }));

    if (validItems.length === 0) {
      return { success: false, message: 'لا يمكن إرسال الطلب: المنتجات لا تحتوي على باركود' };
    }

    const fullPayload = {
      ...payload,
      items: validItems,
    };

    // Check if online
    if (!navigator.onLine) {
      // Queue order for later
      try {
        const orderId = await addPendingOrder(fullPayload);
        setPendingOrdersCount((prev) => prev + 1);
        window.dispatchEvent(new Event('jouda:pending-orders-changed'));
        clearCart();
        return {
          success: true,
          message: 'حفظنا طلبك. الإنترنت مقطوع حالياً، وبنرسله تلقائياً أول ما ترجع الشبكة',
          order_number: orderId,
        };
      } catch (e) {
        return { success: false, message: 'فشل حفظ الطلب للإرسال لاحقاً' };
      }
    }

    const result = await submitOrderToSupabase(fullPayload);

    if (result.success) {
      // Save to completed orders for history
      try {
        await saveCompletedOrder({
          id: result.order_id || result.order_number || `local_${Date.now()}`,
          orderNumber: result.order_number || '',
          quotationId: result.quotation_id,
          orderId: result.order_id,
          items: validItems.map((item) => ({
            product_barcode: item.product_barcode,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          customerName: payload.customer_name,
          customerPhone: payload.customer_phone,
          customerAddress: payload.customer_address,
          orderType: payload.order_type,
          paymentMethod: payload.payment_method,
          notes: payload.notes,
          subtotal: payload.subtotal,
          deliveryFee: payload.delivery_fee,
          total: payload.subtotal + payload.delivery_fee,
          createdAt: Date.now(),
        });
      } catch (e) {
        console.warn('Failed to save completed order', e);
      }
      clearCart();
    }

    return result;
  }, [items, clearCart]);

  // #4: useMemo for context value — prevents all consumers from re-rendering on unrelated state changes
  const contextValue = useMemo<CartContextType>(() => ({
    items,
    addToCart,
    addToCartWithBarcode,
    addMultipleToCart,
    decreaseQuantity,
    decreaseQuantityByName,
    setItemQuantity,
    removeFromCart,
    clearCart,
    isCartOpen,
    setIsCartOpen,
    sendOrderToWhatsApp,
    submitOrderToSystem,
    totalItems,
    getItemQuantity,
    lastAddedItem,
    pendingOrdersCount,
  }), [
    items,
    addToCart,
    addToCartWithBarcode,
    addMultipleToCart,
    decreaseQuantity,
    decreaseQuantityByName,
    setItemQuantity,
    removeFromCart,
    clearCart,
    isCartOpen,
    sendOrderToWhatsApp,
    submitOrderToSystem,
    totalItems,
    getItemQuantity,
    lastAddedItem,
    pendingOrdersCount,
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
