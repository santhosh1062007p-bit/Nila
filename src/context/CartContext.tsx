'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CartItem, Product, FulfilmentType, DeliveryZone, Coupon } from '@/types';
import { useToast } from './ToastContext';
import { useRealtimeSubscription, useRealtimeBroadcast } from './RealtimeContext';

interface AddItemParams {
  product: Product;
  weightKg: 0.5 | 1.0;
  eggless: boolean;
  quantity?: number;
  customMessage?: string;
  specialInstructions?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (params: AddItemParams) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  // Fulfilment & Delivery
  fulfilmentType: FulfilmentType;
  setFulfilmentType: (type: FulfilmentType) => void;
  pincode: string;
  setPincode: (pincode: string) => void;
  activeDeliveryZone: DeliveryZone | null;
  deliveryError: string | null;
  checkPincode: (pincode: string) => Promise<boolean>;

  // Coupons
  appliedCoupon: Coupon | null;
  couponError: string | null;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;

  // Totals in paise
  subtotalPaise: number;
  deliveryChargePaise: number;
  discountPaise: number;
  totalPaise: number;
  totalItemsCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'nilas_treat_cart_v1';
const CART_META_KEY = 'nilas_treat_cart_meta_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const broadcast = useRealtimeBroadcast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [fulfilmentType, setFulfilmentTypeState] = useState<FulfilmentType>('delivery');
  const [pincode, setPincodeState] = useState('625531'); // Default Theni Town
  const [activeDeliveryZone, setActiveDeliveryZone] = useState<DeliveryZone | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const isRemoteSyncRef = useRef(false);

  // Load cart and meta from localStorage on mount
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          setItems(JSON.parse(stored));
        }
        const storedMeta = localStorage.getItem(CART_META_KEY);
        if (storedMeta) {
          const meta = JSON.parse(storedMeta);
          if (meta.fulfilmentType) setFulfilmentTypeState(meta.fulfilmentType);
          if (meta.pincode) setPincodeState(meta.pincode);
          if (meta.appliedCoupon) setAppliedCoupon(meta.appliedCoupon);
        }
      } catch {
        // Ignore parse errors
      }
      setIsLoaded(true);
    });

    return () => {
      active = false;
    };
  }, []);

  // Save cart to localStorage and broadcast cross-tab sync when changed locally
  useEffect(() => {
    if (!isLoaded) return;

    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      return;
    }

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(
        CART_META_KEY,
        JSON.stringify({ fulfilmentType, pincode, appliedCoupon })
      );
      broadcast('CART_SYNC', {
        items,
        fulfilmentType,
        pincode,
        appliedCoupon,
      });
    } catch {
      // Ignore storage errors
    }
  }, [items, fulfilmentType, pincode, appliedCoupon, isLoaded, broadcast]);

  const checkPincode = useCallback(async (code: string): Promise<boolean> => {
    const trimmed = code.trim();
    if (!trimmed) {
      setDeliveryError('Please enter a 6-digit delivery pincode');
      setActiveDeliveryZone(null);
      return false;
    }

    try {
      const res = await fetch(`/api/delivery-zones?pincode=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (data.zone && data.zone.is_serviceable) {
        setActiveDeliveryZone(data.zone);
        setDeliveryError(null);
        return true;
      } else {
        setActiveDeliveryZone(null);
        setDeliveryError(
          data.message ||
            `Sorry, delivery is currently not serviceable at ${trimmed}. You can select Shop Pickup!`
        );
        return false;
      }
    } catch {
      // Fallback local check for common Theni pincodes
      if (trimmed === '625531' || trimmed === '625512' || trimmed === '625534') {
        const fallbackZone: DeliveryZone = {
          id: 'dz-fallback',
          pincode: trimmed,
          area_name: trimmed === '625531' ? 'Theni Town' : 'Allinagaram / Periyakulam',
          delivery_charge_paise: trimmed === '625531' ? 4000 : 5000,
          minimum_order_paise: 30000,
          is_serviceable: true,
        };
        setActiveDeliveryZone(fallbackZone);
        setDeliveryError(null);
        return true;
      }

      setDeliveryError(`Pincode ${trimmed} is outside configured delivery zones in Theni.`);
      setActiveDeliveryZone(null);
      return false;
    }
  }, []);

  // Initial check for default pincode
  useEffect(() => {
    let active = true;
    if (fulfilmentType === 'delivery') {
      const trimmed = pincode.trim();
      if (!trimmed) {
        Promise.resolve().then(() => {
          if (!active) return;
          setDeliveryError('Please enter a 6-digit delivery pincode');
          setActiveDeliveryZone(null);
        });
        return;
      }

      fetch(`/api/delivery-zones?pincode=${encodeURIComponent(trimmed)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!active) return;
          if (data?.zone?.is_serviceable) {
            setActiveDeliveryZone(data.zone);
            setDeliveryError(null);
          } else {
            setActiveDeliveryZone(null);
            setDeliveryError(
              data?.message ||
                `Sorry, delivery is currently not serviceable at ${trimmed}. You can select Shop Pickup!`
            );
          }
        })
        .catch(() => {
          if (!active) return;
          if (trimmed === '625531' || trimmed === '625512' || trimmed === '625534') {
            const fallbackZone: DeliveryZone = {
              id: 'dz-fallback',
              pincode: trimmed,
              area_name: trimmed === '625531' ? 'Theni Town' : 'Allinagaram / Periyakulam',
              delivery_charge_paise: trimmed === '625531' ? 4000 : 5000,
              minimum_order_paise: 30000,
              is_serviceable: true,
            };
            setActiveDeliveryZone(fallbackZone);
            setDeliveryError(null);
          } else {
            setDeliveryError(`Pincode ${trimmed} is outside configured delivery zones in Theni.`);
            setActiveDeliveryZone(null);
          }
        });
    } else {
      Promise.resolve().then(() => {
        if (!active) return;
        setActiveDeliveryZone(null);
        setDeliveryError(null);
      });
    }

    return () => {
      active = false;
    };
  }, [fulfilmentType, pincode]);

  // Real-time synchronization listeners (cross-tab + server updates)
  useRealtimeSubscription(
    ['CART_SYNC', 'DELIVERY_ZONE_UPDATED', 'COUPON_UPDATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED'],
    (event) => {
      if (event.type === 'CART_SYNC') {
        const payload = event.data as {
          items?: CartItem[];
          fulfilmentType?: FulfilmentType;
          pincode?: string;
          appliedCoupon?: Coupon | null;
        };

        if (payload) {
          isRemoteSyncRef.current = true;
          if (Array.isArray(payload.items)) {
            setItems(payload.items);
          }
          if (payload.fulfilmentType) {
            setFulfilmentTypeState(payload.fulfilmentType);
          }
          if (payload.pincode) {
            setPincodeState(payload.pincode);
          }
          if (payload.appliedCoupon !== undefined) {
            setAppliedCoupon(payload.appliedCoupon);
          }
        }
      } else if (event.type === 'DELIVERY_ZONE_UPDATED') {
        // Re-validate current delivery zone if altered on server
        if (fulfilmentType === 'delivery') {
          checkPincode(pincode);
        }
      } else if (event.type === 'COUPON_UPDATED') {
        // Refresh applied coupon if updated
        const updatedCoupon = event.data as Coupon;
        if (appliedCoupon && updatedCoupon?.code === appliedCoupon.code) {
          if (!updatedCoupon.is_active) {
            setAppliedCoupon(null);
            showToast(`Coupon ${appliedCoupon.code} is no longer active`, 'info');
          } else {
            setAppliedCoupon(updatedCoupon);
          }
        }
      } else if (event.type === 'PRODUCT_UPDATED' || event.type === 'PRODUCT_DELETED') {
        const prod = event.data as Product | { productId?: string };
        const prodId = 'id' in prod ? prod.id : prod.productId;
        if (prodId) {
          setItems((prev) => {
            const hasItem = prev.some((it) => it.product_id === prodId);
            if (!hasItem) return prev;
            if (event.type === 'PRODUCT_DELETED' || ('is_available' in prod && !prod.is_available)) {
              showToast(`Note: An item in your cart was updated or is currently out of stock`, 'info');
            }
            return prev.map((it) => {
              if (it.product_id === prodId && 'name' in prod) {
                const variant = prod.variants?.find((v) => v.weight_kg === it.weight_kg);
                const basePrice = variant ? variant.price_paise : it.base_price_paise;
                const unitPrice = basePrice + it.eggless_charge_paise;
                return {
                  ...it,
                  product_name: prod.name,
                  image_url: prod.image_url || it.image_url,
                  base_price_paise: basePrice,
                  unit_price_paise: unitPrice,
                  line_total_paise: unitPrice * it.quantity,
                };
              }
              return it;
            });
          });
        }
      }
    }
  );

  const setFulfilmentType = (type: FulfilmentType) => {
    setFulfilmentTypeState(type);
  };

  const setPincode = (code: string) => {
    setPincodeState(code);
  };

  const addItem = ({
    product,
    weightKg,
    eggless,
    quantity = 1,
    customMessage,
    specialInstructions,
  }: AddItemParams) => {
    const variant = product.variants.find((v) => v.weight_kg === weightKg);
    const basePricePaise = variant ? variant.price_paise : 30000;
    const egglessChargePaise = eggless ? product.eggless_extra_paise || 20000 : 0;
    const unitPricePaise = basePricePaise + egglessChargePaise;
    const cleanMessage = customMessage?.trim() || '';

    // Deterministic item id to group duplicates
    const itemId = `${product.id}-${weightKg}-${eggless ? 'eggless' : 'regular'}-${cleanMessage}`;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === itemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          line_total_paise: updated[existingIndex].unit_price_paise * newQty,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: itemId,
          product_id: product.id,
          product_name: product.name,
          product_slug: product.slug,
          image_url: product.image_url,
          category_name: product.category_name || 'Cakes',
          weight_kg: weightKg,
          eggless,
          base_price_paise: basePricePaise,
          eggless_charge_paise: egglessChargePaise,
          unit_price_paise: unitPricePaise,
          quantity,
          line_total_paise: unitPricePaise * quantity,
          custom_message: cleanMessage,
          special_instructions: specialInstructions,
          is_price_market_dependent: product.is_price_market_dependent,
        };
        return [...prev, newItem];
      }
    });

    showToast(`Added ${product.name} (${weightKg} Kg${eggless ? ', Eggless' : ''}) to cart!`, 'success');
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity,
            line_total_paise: item.unit_price_paise * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    showToast('Item removed from cart', 'info');
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // Subtotal in paise
  const subtotalPaise = useMemo(() => {
    return items.reduce((acc, item) => acc + item.line_total_paise, 0);
  }, [items]);

  // Delivery charge in paise (0 for pickup)
  const deliveryChargePaise = useMemo(() => {
    if (fulfilmentType === 'pickup') return 0;
    if (!activeDeliveryZone) return 0;
    return activeDeliveryZone.delivery_charge_paise || 0;
  }, [fulfilmentType, activeDeliveryZone]);

  // Discount calculation
  const discountPaise = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (subtotalPaise < appliedCoupon.minimum_order_paise) return 0;

    let discount = 0;
    if (appliedCoupon.discount_type === 'percentage') {
      discount = Math.round((subtotalPaise * appliedCoupon.discount_value) / 100);
    } else {
      discount = appliedCoupon.discount_value * 100; // Rupee to paise
    }

    if (appliedCoupon.maximum_discount_paise && discount > appliedCoupon.maximum_discount_paise) {
      discount = appliedCoupon.maximum_discount_paise;
    }

    return Math.min(discount, subtotalPaise);
  }, [appliedCoupon, subtotalPaise]);

  // Final Total in paise
  const totalPaise = useMemo(() => {
    return Math.max(0, subtotalPaise + deliveryChargePaise - discountPaise);
  }, [subtotalPaise, deliveryChargePaise, discountPaise]);

  // Total item count
  const totalItemsCount = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0);
  }, [items]);

  const applyCoupon = async (code: string): Promise<boolean> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setCouponError('Please enter a coupon code');
      return false;
    }

    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(trimmed)}&amount=${subtotalPaise}`);
      const data = await res.json();

      if (data.valid && data.coupon) {
        setAppliedCoupon(data.coupon);
        setCouponError(null);
        showToast(`Coupon ${trimmed} applied successfully!`, 'success');
        return true;
      } else {
        setCouponError(data.message || 'Invalid or expired coupon code');
        return false;
      }
    } catch {
      // Fallback local check
      if (trimmed === 'NILA100' && subtotalPaise >= 50000) {
        const fbCoupon: Coupon = {
          id: 'cp-fallback',
          code: 'NILA100',
          discount_type: 'fixed',
          discount_value: 100,
          minimum_order_paise: 50000,
          is_active: true,
        };
        setAppliedCoupon(fbCoupon);
        setCouponError(null);
        showToast('Coupon NILA100 applied! (₹100 off)', 'success');
        return true;
      }
      setCouponError('Coupon code could not be verified');
      return false;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    showToast('Coupon removed', 'info');
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        fulfilmentType,
        setFulfilmentType,
        pincode,
        setPincode,
        activeDeliveryZone,
        deliveryError,
        checkPincode,
        appliedCoupon,
        couponError,
        applyCoupon,
        removeCoupon,
        subtotalPaise,
        deliveryChargePaise,
        discountPaise,
        totalPaise,
        totalItemsCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
