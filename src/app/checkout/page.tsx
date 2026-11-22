'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import {
  ShieldCheck,
  MapPin,
  Sparkles,
  CreditCard,
  Banknote,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Tag,
  X,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRealtimeSubscription } from '@/context/RealtimeContext';
import { formatINR, getAvailableDates, AVAILABLE_TIME_SLOTS } from '@/lib/utils';
import { Address, Order } from '@/types';
import CelebrationModal from '@/components/ui/CelebrationModal';

interface RazorpayWindow {
  Razorpay?: new (opts: Record<string, unknown>) => {
    open: () => void;
    on: (event: string, cb: (res: { error?: { code?: string; description?: string } }) => void) => void;
  };
}

function generateClientIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `idem-${crypto.randomUUID()}`;
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, updateUserState } = useAuth();
  const { showToast } = useToast();
  const {
    items,
    clearCart,
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
  } = useCart();

  const dates = getAvailableDates();

  const isCustomer = Boolean(user && user.role === 'customer');
  const [customerName, setCustomerName] = useState(isCustomer ? user?.full_name || '' : '');
  const [customerPhone, setCustomerPhone] = useState(isCustomer ? user?.phone || '' : '');
  const [customerEmail, setCustomerEmail] = useState(isCustomer ? user?.email || '' : '');
  const [savedProfileName, setSavedProfileName] = useState(isCustomer ? user?.full_name || '' : '');
  const [savedProfileEmail, setSavedProfileEmail] = useState(isCustomer ? user?.email || '' : '');
  const [saveProfileChecked, setSaveProfileChecked] = useState(false);

  // Saved Addresses for logged-in customer
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveAddressChecked, setSaveAddressChecked] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isCustomer) {
      return;
    }

    fetch('/api/account/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.user) {
          setCustomerName(data.user.full_name || '');
          setCustomerPhone(data.user.phone || '');
          setCustomerEmail(data.user.email || '');
          setSavedProfileName(data.user.full_name || '');
          setSavedProfileEmail(data.user.email || '');
        } else if (user) {
          setCustomerName(user.full_name || '');
          setCustomerPhone(user.phone || '');
          setCustomerEmail(user.email || '');
          setSavedProfileName(user.full_name || '');
          setSavedProfileEmail(user.email || '');
        }

        if (Array.isArray(data?.addresses) && data.addresses.length > 0) {
          setSavedAddresses(data.addresses);
          const def = data.addresses.find((a: Address) => a.is_default) || data.addresses[0];
          if (def) applySavedAddress(def);
        } else {
          setSavedAddresses([]);
          setSelectedAddressId(null);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomer, user?.id]);

  const reloadAddresses = useCallback(() => {
    if (!isCustomer) return;
    fetch('/api/addresses', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.addresses)) {
          setSavedAddresses(d.addresses);
        }
      })
      .catch(() => {});
  }, [isCustomer]);

  useRealtimeSubscription(
    ['USER_ADDRESSES_UPDATED', 'USER_PROFILE_UPDATED'],
    () => {
      reloadAddresses();
    }
  );

  // Delivery Address State
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');

  // Date & Slot
  const [deliveryDate, setDeliveryDate] = useState(dates[0].value);
  const [deliverySlot, setDeliverySlot] = useState(AVAILABLE_TIME_SLOTS[0]);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Coupon box state
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Payment Selection & Retry State
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateClientIdempotencyKey);

  // Pending / failed Razorpay payment state for safe retry
  const [pendingPayment, setPendingPayment] = useState<{
    order: Order;
    guestToken?: string;
    failureReason: string;
  } | null>(null);

  // Celebration Animation State
  const [celebratingOrder, setCelebratingOrder] = useState<{
    order: Order;
    guestToken?: string;
  } | null>(null);
  const [orderedMessage, setOrderedMessage] = useState<string>('');

  function applySavedAddress(addr: Address) {
    setSelectedAddressId(addr.id);
    setAddressLine1(addr.house_no || addr.address_line1 || '');
    setAddressLine2(addr.street_name || addr.address_line2 || '');
    setArea(addr.area_locality || addr.city || 'Theni');
    setLandmark(addr.landmark || '');
    const t = addr.address_type || addr.label;
    setAddressLabel(t === 'Work' || t === 'Other' ? t : 'Home');
    setSaveAddressChecked(false);
    if (addr.pincode) {
      setPincode(addr.pincode);
      checkPincode(addr.pincode);
    }
  }

  function handleUseNewAddress() {
    setSelectedAddressId(null);
    setAddressLine1('');
    setAddressLine2('');
    setArea('');
    setLandmark('');
    setAddressLabel('Home');
    setSaveAddressChecked(false);
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    await applyCoupon(couponInput.trim());
    setIsApplyingCoupon(false);
  }

  async function launchRazorpayCheckout(order: Order, guestToken?: string) {
    const rzpRes = await fetch('/api/payments/razorpay/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(guestToken ? { 'x-guest-token': guestToken } : {}),
      },
      body: JSON.stringify({ orderId: order.id, guestToken }),
    });

    const rzpData = await rzpRes.json();

    if (!rzpRes.ok || !rzpData.razorpayOrderId) {
      const msg =
        rzpData.message || 'Unable to initiate Razorpay payment. You can retry or pay via Cash on Delivery.';
      setPendingPayment({ order, guestToken, failureReason: msg });
      showToast(msg, 'error');
      return;
    }

    const RazorpayConstructor = (window as unknown as RazorpayWindow).Razorpay;
    if (!RazorpayConstructor) {
      const msg = 'Payment gateway script did not load yet. Click "Retry Online Payment" below.';
      setPendingPayment({ order, guestToken, failureReason: msg });
      showToast(msg, 'error');
      return;
    }

    const rzpInstance = new RazorpayConstructor({
      key: rzpData.keyId,
      amount: rzpData.amount,
      currency: rzpData.currency || 'INR',
      name: "Nila's Treat Bakery",
      description: `Order ${order.order_code}`,
      order_id: rzpData.razorpayOrderId,
      modal: {
        ondismiss: async () => {
          await fetch('/api/payments/razorpay/failure', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(guestToken ? { 'x-guest-token': guestToken } : {}),
            },
            body: JSON.stringify({
              orderId: order.id,
              razorpayOrderId: rzpData.razorpayOrderId,
              errorCode: 'CHECKOUT_DISMISSED',
              errorDescription: 'Customer closed payment popup before completing payment',
              guestToken,
            }),
          }).catch(() => {});
          setPendingPayment({
            order,
            guestToken,
            failureReason: 'Payment popup closed before completion. Retry payment anytime below.',
          });
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        const verifyRes = await fetch('/api/payments/razorpay/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(guestToken ? { 'x-guest-token': guestToken } : {}),
          },
          body: JSON.stringify({
            orderId: order.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            guestToken,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyRes.ok && verifyData.success) {
          setPendingPayment(null);
          clearCart();
          setIdempotencyKey(generateClientIdempotencyKey());
          showToast('Payment verified & order confirmed!', 'success');
          setCelebratingOrder({ order, guestToken });
        } else {
          const reason = verifyData.message || 'Server payment verification failed.';
          setPendingPayment({ order, guestToken, failureReason: reason });
          showToast(reason, 'error');
        }
      },
      prefill: {
        name: order.customer_name,
        contact: order.customer_phone,
        email: order.customer_email || undefined,
      },
      theme: { color: '#8F1237' },
    });

    rzpInstance.on('payment.failed', async (res) => {
      const desc = res.error?.description || 'Payment authorization failed at gateway.';
      await fetch('/api/payments/razorpay/failure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(guestToken ? { 'x-guest-token': guestToken } : {}),
        },
        body: JSON.stringify({
          orderId: order.id,
          razorpayOrderId: rzpData.razorpayOrderId,
          errorCode: res.error?.code || 'PAYMENT_FAILED',
          errorDescription: desc,
          guestToken,
        }),
      }).catch(() => {});
      setPendingPayment({ order, guestToken, failureReason: desc });
      showToast(desc, 'error');
    });

    rzpInstance.open();
  }

  if (celebratingOrder) {
    const tokenQuery = celebratingOrder.guestToken
      ? `?token=${encodeURIComponent(celebratingOrder.guestToken)}`
      : '';
    return (
      <CelebrationModal
        orderCode={celebratingOrder.order.order_code}
        customerName={celebratingOrder.order.customer_name}
        customMessage={orderedMessage}
        onProceed={() => router.push(`/orders/${celebratingOrder.order.id}${tokenQuery}`)}
      />
    );
  }

  if (items.length === 0 && !pendingPayment) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-[#70132C]">Your cart is empty</h2>
        <p className="text-sm text-[#8C485A]">Please add cakes before proceeding to checkout.</p>
        <Link
          href="/cakes"
          className="inline-block px-6 py-2.5 bg-[#990F35] text-white rounded-full text-xs font-bold"
        >
          Browse Cakes
        </Link>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number for order updates');
      return;
    }

    const adminPhone = '9344597833';
    if (cleanPhone === adminPhone || customerName.trim().toLowerCase() === "nila's treat owner") {
      setErrorMessage(
        'Bakery Owner details cannot be used to place orders. Please enter your customer name and mobile phone number.'
      );
      return;
    }

    if (fulfilmentType === 'delivery') {
      if (!addressLine1.trim() || !pincode.trim()) {
        setErrorMessage('Please provide house/building details and pincode');
        return;
      }
      if (!activeDeliveryZone || !activeDeliveryZone.is_serviceable) {
        setErrorMessage('The entered pincode is outside configured delivery zones in Theni');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer_name: customerName.trim(),
        customer_phone: cleanPhone,
        customer_email: customerEmail.trim() || null,
        fulfilment_type: fulfilmentType,
        payment_method: paymentMethod,
        delivery_pincode: fulfilmentType === 'delivery' ? pincode.trim() : null,
        delivery_date: deliveryDate,
        delivery_slot: deliverySlot,
        special_instructions: specialInstructions.trim() || null,
        coupon_code: appliedCoupon?.code || null,
        idempotency_key: idempotencyKey,
        save_address: isCustomer && saveAddressChecked,
        update_address_id: isCustomer && saveAddressChecked ? selectedAddressId : null,
        address_label: addressLabel,
        address:
          fulfilmentType === 'delivery'
            ? {
                recipient_name: customerName.trim(),
                phone: cleanPhone,
                house_no: addressLine1.trim(),
                street_name: addressLine2.trim() || undefined,
                area_locality: area.trim() || 'Theni',
                address_line1: addressLine1.trim(),
                address_line2: `${addressLine2.trim()} ${area.trim()}`.trim() || undefined,
                city: area.trim() || 'Theni',
                district: 'Theni',
                state: 'Tamil Nadu',
                pincode: pincode.trim(),
                landmark: landmark.trim() || null,
                address_type: addressLabel,
              }
            : null,
        items: items.map((item) => ({
          product_id: item.product_id,
          weight_kg: item.weight_kg,
          eggless: item.eggless,
          custom_message: item.custom_message || null,
          quantity: item.quantity,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.order) {
        throw new Error(data.message || 'Failed to initialize order on server');
      }

      // Only update saved customer profile if customer explicitly opted in
      if (isCustomer && saveProfileChecked && user) {
        try {
          const profRes = await fetch('/api/account/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: customerName.trim(),
              phone: cleanPhone,
              email: customerEmail.trim() || null,
            }),
          });
          if (profRes.ok) {
            const profData = await profRes.json();
            if (profData.user) {
              updateUserState(profData.user);
              setSavedProfileName(profData.user.full_name || '');
              setSavedProfileEmail(profData.user.email || '');
              setSaveProfileChecked(false);
            }
          }
        } catch {
          // do not block placed order
        }
      }

      if (isCustomer && saveAddressChecked && fulfilmentType === 'delivery') {
        fetch('/api/addresses', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (Array.isArray(d?.addresses)) setSavedAddresses(d.addresses);
          })
          .catch(() => {});
      }

      const createdOrder: Order = data.order;
      const guestToken: string | undefined = data.guestAccessToken;
      const cakeMessage = items.find((i) => i.custom_message)?.custom_message || '';
      setOrderedMessage(cakeMessage);

      if (paymentMethod === 'cod') {
        clearCart();
        setIdempotencyKey(generateClientIdempotencyKey());
        showToast('Order placed successfully! Cash on Delivery confirmed.', 'success');
        setCelebratingOrder({ order: createdOrder, guestToken });
        return;
      }

      await launchRazorpayCheckout(createdOrder, guestToken);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during checkout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8 sm:py-10 bg-[#FFFDFB] w-full">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F5D3DC]">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#8F1237]/20 bg-[#FFF6F0] shrink-0">
              <Image
                src="/images/nilas-badge.png"
                alt="Nila's Treat"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-serif text-2xl font-extrabold text-[#33252A] block leading-tight">
                Nila&apos;s Treat
              </span>
              <span className="text-[11px] text-[#8F1237] font-semibold uppercase tracking-wider">
                The Home of Fresh Baking • Theni
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#70132C]/70">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Server-Verified Secure Checkout</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <span className="text-xs font-bold text-[#8F1237] uppercase tracking-wider">
            {isCustomer ? 'Saved Customer Checkout' : 'Fast Guest & Customer Checkout'}
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#33252A] mt-1">
            Complete Your Bakery Order
          </h1>
        </div>

        {/* Payment Retry Banner (Shown cleanly if online payment failed/cancelled) */}
        {pendingPayment && (
          <div
            role="alert"
            className="p-5 rounded-3xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">
                  Payment Incomplete for Order {pendingPayment.order.order_code} (
                  {formatINR(pendingPayment.order.total_paise)})
                </p>
                <p className="text-xs text-amber-900">{pendingPayment.failureReason}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pl-8">
              <button
                type="button"
                onClick={() =>
                  launchRazorpayCheckout(pendingPayment.order, pendingPayment.guestToken)
                }
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#990F35] hover:bg-[#800A2A] text-white rounded-full text-xs font-bold shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Online Payment</span>
              </button>
              <Link
                href={`/orders/${pendingPayment.order.id}${
                  pendingPayment.guestToken
                    ? `?token=${encodeURIComponent(pendingPayment.guestToken)}`
                    : ''
                }`}
                className="inline-flex items-center px-5 py-2.5 bg-white border border-amber-400 text-amber-950 rounded-full text-xs font-bold"
              >
                View Order Receipt
              </Link>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form: Details */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Contact Information */}
            <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-serif text-lg font-bold text-[#990F35] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#FCE8ED] text-[#990F35] text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  Customer Contact Details
                </h2>
                {!isCustomer && (
                  <Link
                    href="/login?redirect=/checkout"
                    className="text-xs font-bold text-[#990F35] hover:underline"
                  >
                    Have an account? Sign In for Saved Addresses →
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-[#70132C] mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karthik Raja"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#70132C] mb-1">
                    Mobile Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#70132C] mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="For invoice and receipt (optional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                  />
                </div>

                {isCustomer &&
                  (customerName.trim() !== savedProfileName ||
                    customerEmail.trim() !== savedProfileEmail) && (
                    <div className="sm:col-span-2 pt-1">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#8F1237] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveProfileChecked}
                          onChange={(e) => setSaveProfileChecked(e.target.checked)}
                          className="w-4 h-4 accent-[#8F1237]"
                        />
                        <span>Save updated name / email to my account profile</span>
                      </label>
                    </div>
                  )}
              </div>
            </div>

            {/* 2. Fulfilment Method */}
            <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#990F35] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FCE8ED] text-[#990F35] text-xs font-black flex items-center justify-center">
                  2
                </span>
                Fulfilment Method
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfilmentType('delivery')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    fulfilmentType === 'delivery'
                      ? 'border-[#990F35] bg-[#FCE8ED]/40 text-[#990F35] shadow-xs'
                      : 'border-[#F5D3DC] bg-white text-[#70132C]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <MapPin className="w-4 h-4 text-[#990F35]" />
                    Home Delivery
                  </div>
                  <p className="text-xs text-[#8C485A] mt-1">
                    Delivered to doorstep in Theni district
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfilmentType('pickup')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    fulfilmentType === 'pickup'
                      ? 'border-[#990F35] bg-[#FCE8ED]/40 text-[#990F35] shadow-xs'
                      : 'border-[#F5D3DC] bg-white text-[#70132C]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-[#990F35]" />
                    Store Pickup (Free)
                  </div>
                  <p className="text-xs text-[#8C485A] mt-1">
                    Pickup directly from our Theni bakery
                  </p>
                </button>
              </div>

              {fulfilmentType === 'delivery' ? (
                <div className="space-y-4 pt-2">
                  {/* Saved Addresses Picker */}
                  {isCustomer && savedAddresses.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="block text-xs font-bold text-[#70132C]">
                          Saved Delivery Addresses
                        </span>
                        <button
                          type="button"
                          onClick={handleUseNewAddress}
                          className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
                            selectedAddressId === null
                              ? 'bg-[#990F35] text-white border-[#990F35]'
                              : 'border-[#F5D3DC] text-[#990F35] hover:bg-[#FCE8ED]'
                          }`}
                        >
                          + Use New Address
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {savedAddresses.map((addr) => {
                          const isSelected = selectedAddressId === addr.id;
                          return (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => applySavedAddress(addr)}
                              className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                                isSelected
                                  ? 'border-[#990F35] bg-[#FCE8ED]/45 ring-1 ring-[#990F35] shadow-xs'
                                  : 'border-[#F5D3DC] hover:border-[#990F35] bg-[#FFFDFB]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-[#990F35]">
                                  {addr.address_type || addr.label || 'Saved Address'} — {addr.pincode}
                                </span>
                                {addr.is_default && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    Default
                                  </span>
                                )}
                              </div>
                              <span className="text-[#70132C] line-clamp-1 mt-0.5 block">
                                {addr.house_no || addr.address_line1}, {addr.area_locality || addr.city}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#70132C] mb-1">
                        Flat / Door No. / Building Details *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Door No. 14/2, Anandha Illam"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#70132C] mb-1">
                        Street / Cross *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Gandhi Nagar 2nd Street"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#70132C] mb-1">
                        Area / Locality *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Near Collectorate, Allinagaram"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#70132C] mb-1">
                        Delivery Pincode *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 625531"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                        />
                        <button
                          type="button"
                          onClick={() => checkPincode(pincode)}
                          className="px-4 py-2 bg-[#990F35] text-white rounded-xl text-xs font-bold"
                        >
                          Verify
                        </button>
                      </div>
                      {deliveryError && (
                        <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {deliveryError}
                        </p>
                      )}
                      {activeDeliveryZone && (
                        <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {activeDeliveryZone.area_name} (
                          {formatINR(activeDeliveryZone.delivery_charge_paise)} delivery)
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#70132C] mb-1">
                        Prominent Landmark (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Opp. Sub-Registrar Office"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                      />
                    </div>
                  </div>

                  {isCustomer && (
                    <div className="space-y-2 pt-1">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#70132C] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAddressChecked}
                          onChange={(e) => setSaveAddressChecked(e.target.checked)}
                          className="w-4 h-4 accent-[#990F35]"
                        />
                        <span>
                          {selectedAddressId
                            ? 'Save edits to this saved address in my profile'
                            : 'Save this new delivery address to my profile'}
                        </span>
                      </label>

                      {saveAddressChecked && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-[11px] font-bold text-[#8C485A]">Save as:</span>
                          {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() => setAddressLabel(lbl)}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                                addressLabel === lbl
                                  ? 'bg-[#990F35] text-white border-[#990F35]'
                                  : 'bg-white text-[#70132C] border-[#F5D3DC]'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-[#FCE8ED]/50 rounded-2xl border border-[#F5D3DC] space-y-2 text-sm text-[#70132C]">
                  <p className="font-bold text-[#990F35] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Pickup Address:
                  </p>
                  <p className="text-xs font-semibold">
                    Nila&apos;s Treat Bakery, Periyakulam Main Road, Near Old Bus Stand, Theni,
                    Tamil Nadu - 625531
                  </p>
                  <p className="text-xs text-[#8C485A]">
                    Contact: +91 93445 97833 / +91 89398 00225
                  </p>
                  <p className="text-xs text-emerald-700 font-bold">
                    ✓ Zero delivery charges for store pickup!
                  </p>
                </div>
              )}
            </div>

            {/* 3. Date, Time Slot & Instructions */}
            <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#990F35] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FCE8ED] text-[#990F35] text-xs font-black flex items-center justify-center">
                  3
                </span>
                Date &amp; Time Slot
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-[#70132C] mb-1">
                    Delivery / Pickup Date *
                  </label>
                  <select
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] bg-[#FFFDFB] text-[#70132C] text-xs font-bold focus:outline-none focus:border-[#990F35]"
                  >
                    {dates.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#70132C] mb-1">
                    Preferred Time Slot *
                  </label>
                  <select
                    value={deliverySlot}
                    onChange={(e) => setDeliverySlot(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] bg-[#FFFDFB] text-[#70132C] text-xs font-bold focus:outline-none focus:border-[#990F35]"
                  >
                    {AVAILABLE_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#70132C] mb-1">
                    Special Delivery Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ring the bell twice, surprise delivery..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] text-xs focus:outline-none focus:border-[#990F35]"
                  />
                </div>
              </div>
            </div>

            {/* 4. Payment Selection */}
            <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#990F35] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FCE8ED] text-[#990F35] text-xs font-black flex items-center justify-center">
                  4
                </span>
                Payment Method
              </h2>

              <div className="space-y-3">
                <label
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'razorpay'
                      ? 'border-[#990F35] bg-[#FCE8ED]/40 text-[#70132C]'
                      : 'border-[#F5D3DC] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={() => setPaymentMethod('razorpay')}
                      className="w-4 h-4 text-[#990F35] accent-[#990F35]"
                    />
                    <CreditCard className="w-5 h-5 text-[#990F35]" />
                    <div>
                      <span className="font-bold text-sm block">
                        Online Payment (UPI, GPay, PhonePe, Cards, Net Banking)
                      </span>
                      <span className="text-xs text-[#8C485A]">
                        Verified securely via Razorpay Standard Checkout
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
                    Fast &amp; Secure
                  </span>
                </label>

                <label
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-[#990F35] bg-[#FCE8ED]/40 text-[#70132C]'
                      : 'border-[#F5D3DC] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="w-4 h-4 text-[#990F35] accent-[#990F35]"
                    />
                    <Banknote className="w-5 h-5 text-[#990F35]" />
                    <div>
                      <span className="font-bold text-sm block">
                        Cash on Delivery / Pay at Store
                      </span>
                      <span className="text-xs text-[#8C485A]">
                        Pay in cash upon doorstep delivery or at pickup counter
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Summary Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-sm space-y-4 sticky top-28">
              <h3 className="font-serif font-bold text-lg text-[#990F35]">Order Summary</h3>

              {/* Items preview list */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-bold text-[#70132C]">
                        {item.quantity} × {item.product_name}
                      </span>
                      <span className="text-[#8C485A] block">
                        {item.weight_kg} Kg {item.eggless ? '(Eggless)' : ''}
                      </span>
                    </div>
                    <span className="font-semibold text-[#70132C] shrink-0">
                      {formatINR(item.line_total_paise)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Input inside single-page Checkout */}
              <div className="pt-3 border-t border-[#F5D3DC] space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs text-emerald-800">
                    <span className="font-bold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      {appliedCoupon.code} Applied
                    </span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon code (e.g. NILAS10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#F5D3DC] text-xs text-[#70132C] uppercase focus:outline-none focus:border-[#990F35]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon}
                      className="px-3.5 py-2 bg-[#FFF6F0] border border-[#F5D3DC] text-[#990F35] hover:bg-[#990F35] hover:text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponError && <p className="text-[11px] text-rose-600">{couponError}</p>}
              </div>

              {/* Bill Details */}
              <div className="pt-3 border-t border-[#F5D3DC] space-y-2 text-sm">
                <div className="flex justify-between text-[#8C485A]">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-[#70132C]">{formatINR(subtotalPaise)}</span>
                </div>
                <div className="flex justify-between text-[#8C485A]">
                  <span>Delivery Charge</span>
                  <span>
                    {fulfilmentType === 'pickup' ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      formatINR(deliveryChargePaise)
                    )}
                  </span>
                </div>
                {discountPaise > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span>-{formatINR(discountPaise)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-[#990F35] border-t border-[#F5D3DC] pt-3">
                  <span>Grand Total</span>
                  <span className="text-xl">{formatINR(totalPaise)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#990F35] hover:bg-[#800A2A] text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span>Processing Order...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Place Order ({formatINR(totalPaise)})</span>
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-[#8C485A] flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Prices &amp; Discounts Verified Server-Side</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
