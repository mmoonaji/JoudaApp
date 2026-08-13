import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { ReceiptModal } from '../modals/ReceiptModal';
import { SuccessOrderModal } from '../modals/SuccessOrderModal';
import { useScrollLock, useBackButton } from '../../hooks';
import { getCachedProducts } from '../../services/db';
import { useCheckout } from './hooks/useCheckout';

import { CartHeader } from './CartHeader';
import { EmptyCartView } from './EmptyCartView';
import { CartItemsList } from './CartItemsList';
import { FreeDeliveryProgressCard } from './FreeDeliveryProgressCard';
import { CheckoutFormFields } from './CheckoutFormFields';
import { TotalsBreakdownCard } from './TotalsBreakdownCard';
import { CartFooter } from './CartFooter';
import { StockIssue, formatStockIssueMessage, getCartStockIssue } from '../../utils/stockUtils';

const MapLocationPicker = lazy(() => import('./MapLocationPicker').then((module) => ({
  default: module.MapLocationPicker,
})));

export const CartDrawer: React.FC = () => {
  const location = useLocation();
  const { 
    items, 
    isCartOpen, 
    setIsCartOpen, 
    removeFromCart,
    decreaseQuantity,
    setItemQuantity,
    addToCart, 
    sendOrderToWhatsApp,
    submitOrderToSystem,
    totalItems 
  } = useCart();

  const [cachedProducts, setCachedProducts] = useState<any[]>([]);
  const [bouncingItemId, setBouncingItemId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [showMap, setShowMap] = useState(false);

  // ── Checkout Logic (Custom Hook) ──
  const checkout = useCheckout(
    items, 
    cachedProducts, 
    sendOrderToWhatsApp, 
    submitOrderToSystem
  );

  // Load products to resolve packages details when open
  useEffect(() => {
    if (isCartOpen) {
      getCachedProducts().then(setCachedProducts).catch(console.warn);
    }
  }, [isCartOpen]);

  // Close cart on route change
  useEffect(() => {
    if (isCartOpen) {
      setIsCartOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Lock scroll when cart is open
  useScrollLock(isCartOpen || checkout.showSuccessModal);

  // Handle android hardware back button for success modal
  useBackButton(checkout.showSuccessModal, () => {
    checkout.setShowSuccessModal(false);
    setIsCartOpen(false);
    checkout.resetForm();
  });

  // Handle android hardware back button for map picker
  useBackButton(showMap, () => {
    setShowMap(false);
  });

  // Handle android hardware back button for receipt modal
  useBackButton(showReceipt, () => {
    setShowReceipt(false);
  });

  // Handle android hardware back button for the cart drawer itself
  useBackButton(isCartOpen, () => {
    setIsCartOpen(false);
  });

  // ── Handlers ──
  const handleClose = () => {
    setIsCartOpen(false);
    setShowReceipt(false);
    setTimeout(() => setStep('cart'), 300);
  };

  const handleDecrease = (id: string) => {
    decreaseQuantity(id);
    setBouncingItemId(id);
    setTimeout(() => setBouncingItemId(null), 350);
    try { navigator.vibrate?.(10); } catch {}
  };

  const handleIncrease = (name: string, id: string) => {
    const item = items.find((cartItem) => cartItem.id === id);
    addToCart(name, item?.source || 'store', item?.barcode, item?.price);
    setBouncingItemId(id);
    setTimeout(() => setBouncingItemId(null), 350);
  };

  const handleSetQuantity = (id: string, quantity: number) => {
    setItemQuantity(id, quantity);
    setBouncingItemId(id);
    setTimeout(() => setBouncingItemId(null), 350);
  };

  const handleRemove = (id: string) => {
    try { navigator.vibrate?.(25); } catch {}
    removeFromCart(id);
  };

  const cartStockIssues = useMemo<StockIssue[]>(() => {
    return items
      .map((item) => {
        const matchedProduct = cachedProducts.find(p => p.barcode === item.barcode || p.name === item.name);
        return getCartStockIssue(item, matchedProduct);
      })
      .filter((issue): issue is StockIssue => issue !== null);
  }, [items, cachedProducts]);

  const stockValidationMessage = cartStockIssues.length > 0
    ? formatStockIssueMessage(cartStockIssues[0]!)
    : undefined;

  const canSubmitOrder = checkout.isFormValid && cartStockIssues.length === 0;

  if (!isCartOpen && !checkout.showSuccessModal) return null;

  return (
    <>
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:justify-end md:items-stretch bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-gray-50 dark:bg-gray-900 w-full max-w-md h-[85vh] md:h-full md:max-w-lg md:rounded-l-3xl rounded-t-3xl shadow-2xl flex flex-col animate-slide-up-mobile md:animate-slide-in-right overflow-hidden border-l border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <CartHeader 
              totalItems={totalItems} 
              handleClose={handleClose} 
              step={step}
              onBack={() => setStep('cart')}
            />

            <div className="flex-1 overflow-y-auto p-5 relative space-y-4">
              {items.length === 0 ? (
                <EmptyCartView handleClose={handleClose} />
              ) : (
                <>
                  {step === 'cart' ? (
                    <div className="space-y-4">
                      <CartItemsList
                        items={items}
                        cachedProducts={cachedProducts}
                        totalItems={totalItems}
                        bouncingItemId={bouncingItemId}
                        handleIncrease={handleIncrease}
                        handleDecrease={handleDecrease}
                        handleSetQuantity={handleSetQuantity}
                        handleRemove={handleRemove}
                      />
                      <FreeDeliveryProgressCard
                        subtotal={checkout.currentSubtotal}
                        zone={checkout.deliveryZone}
                      />
                    </div>
                  ) : (
                    <div className="animate-fade-in space-y-6">
                      <CheckoutFormFields
                        customerName={checkout.customerName}
                        setCustomerName={checkout.setCustomerName}
                        phone={checkout.phone}
                        setPhone={checkout.setPhone}
                        customerLat={checkout.customerLat}
                        customerLng={checkout.customerLng}
                        locationConfirmed={checkout.locationConfirmed}
                        isLocationTooCloseToStore={checkout.isLocationTooCloseToStore}
                        address={checkout.address}
                        setAddress={checkout.setAddress}
                        notes={checkout.notes}
                        setNotes={checkout.setNotes}
                        isFormValid={checkout.isFormValid}
                        isSaved={checkout.isSaved}
                        onOpenMap={() => setShowMap(true)}
                        rawFee={checkout.rawFee}
                        currentFee={checkout.currentFee}
                        deliveryZone={checkout.deliveryZone}
                        setDeliveryZone={checkout.setDeliveryZone}
                        qualifiesForFree={checkout.qualifiesForFree}
                      />
                      <FreeDeliveryProgressCard
                        subtotal={checkout.currentSubtotal}
                        zone={checkout.deliveryZone}
                        isMinimal={true}
                      />
                      <TotalsBreakdownCard
                        currentSubtotal={checkout.currentSubtotal}
                        totalSavings={checkout.totalSavings}
                        currentFee={checkout.currentFee}
                        rawFee={checkout.rawFee}
                        isFreeDelivery={checkout.isFreeDelivery}
                        distanceKm={checkout.distanceKm}
                        deliveryZone={checkout.deliveryZone}
                        qualifiesForFree={checkout.qualifiesForFree}
                        grandTotal={checkout.grandTotal}
                      />
                    </div>
                  )}
                </>
              )}
              <div className="h-8"></div>
            </div>

            {items.length > 0 && (
              <CartFooter
                isFormValid={checkout.isFormValid}
                canSubmitOrder={canSubmitOrder}
                validationMessage={stockValidationMessage || checkout.validationMessage}
                submitting={checkout.submitting}
                submitResult={checkout.submitResult}
                handleSendOrder={checkout.handleSendOrder}
                handleSubmitOrder={() => {
                  if (cartStockIssues.length > 0) {
                    alert(`راجع الكميات قبل إرسال الطلب:\n\n${cartStockIssues.map(issue => `• ${formatStockIssueMessage(issue)}`).join('\n')}`);
                    return;
                  }
                  checkout.handleSubmitOrder(() => setIsCartOpen(false));
                }}
                showReceipt={showReceipt}
                setShowReceipt={setShowReceipt}
                step={step}
                onNext={() => setStep('checkout')}
              />
            )}
          </div>
        </div>
      )}

      {showMap && (
        <Suspense fallback={<div className="fixed inset-0 z-[110] bg-black/60" />}>
          <MapLocationPicker
            onLocationSelected={checkout.confirmLocation}
            onClose={() => setShowMap(false)}
            defaultLat={checkout.customerLat || undefined}
            defaultLng={checkout.customerLng || undefined}
            initialLocationSelected={checkout.locationConfirmed}
            storeLat={checkout.storeLat}
            storeLng={checkout.storeLng}
            pricePerKm={checkout.pricePerKm}
            minCustomerDistanceKm={checkout.minCustomerDistanceKm}
          />
        </Suspense>
      )}

      {showReceipt && (
        <ReceiptModal 
          items={items}
          customerName={checkout.customerName}
          address={checkout.address}
          notes={checkout.notes}
          orderType="delivery"
          subtotal={checkout.currentSubtotal}
          deliveryFee={checkout.currentFee}
          total={checkout.grandTotal}
          phone={checkout.phone}
          discount={checkout.totalSavings}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {checkout.showSuccessModal && checkout.lastOrderDetails && (
        <SuccessOrderModal
          orderNumber={checkout.lastOrderDetails.orderNumber}
          quotationId={checkout.lastOrderDetails.quotationId}
          orderId={checkout.lastOrderDetails.orderId}
          customerName={checkout.customerName}
          total={checkout.lastOrderDetails.total}
          onClose={() => {
            checkout.setShowSuccessModal(false);
            setIsCartOpen(false);
            checkout.resetForm();
          }}
        />
      )}

      {/* ✨ Enhancement Animations */}
      <style>{`
        @keyframes qty-bounce {
          0%, 100% { transform: scale(1); }
          40% { transform: scale(1.45); }
          70% { transform: scale(0.95); }
        }
        .cart-qty-bounce {
          animation: qty-bounce 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
};
