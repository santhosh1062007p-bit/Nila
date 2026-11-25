'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  MapPin,
  Sparkles,
  Tag,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/utils';
import CakeImage from '@/components/products/CakeImage';

export default function CartPage() {
  const {
    items,
    updateQuantity,
    updateItemWeight,
    removeItem,
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
    totalItemsCount,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [checkingPincode, setCheckingPincode] = useState(false);

  const handlePincodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingPincode(true);
    await checkPincode(pincode);
    setCheckingPincode(false);
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const ok = await applyCoupon(couponInput);
    if (ok) setCouponInput('');
  };

  if (items.length === 0) {
    return (
      <div className="py-24 bg-[#FFFDFB]">
        <div className="max-w-xl mx-auto px-4 text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-[#FCE8ED] text-[#990F35] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h1 className="font-serif text-3xl font-extrabold text-[#70132C]">
            Your shopping cart is empty
          </h1>
          <p className="text-sm text-[#8C485A]">
            Explore our delicious range of fresh regular, fruit, and artisan signature cakes.
          </p>
          <div className="pt-2">
            <Link
              href="/cakes"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#990F35] text-white rounded-full font-bold text-sm shadow-md hover:bg-[#800A2A] transition-all"
            >
              <span>Explore Cakes Menu</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-10 bg-[#FFFDFB] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-8">
        
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-extrabold text-[#70132C]">
              Review Your Cart
            </h1>
            <p className="text-xs text-[#8C485A] mt-1">
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Clear Entire Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Items Table */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-5 bg-white rounded-2xl border border-[#F5D3DC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 border border-[#F5D3DC] shrink-0">
                    <CakeImage
                      src={item.image_url}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#990F35]">
                      {item.product_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <div className="inline-flex items-center bg-[#FFF6F0] p-0.5 rounded-lg border border-[#F5D3DC]">
                        <button
                          type="button"
                          onClick={() => updateItemWeight(item.id, 0.5)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                            item.weight_kg === 0.5
                              ? 'bg-[#8F1237] text-white shadow-xs'
                              : 'text-[#70132C] hover:bg-[#FCE8ED]'
                          }`}
                        >
                          ½ Kg
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItemWeight(item.id, 1.0)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${
                            item.weight_kg === 1.0
                              ? 'bg-[#8F1237] text-white shadow-xs'
                              : 'text-[#70132C] hover:bg-[#FCE8ED]'
                          }`}
                        >
                          1 Kg
                        </button>
                      </div>

                      {item.eggless ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Eggless (+₹200)
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                          Regular
                        </span>
                      )}
                    </div>
                    {item.custom_message && (
                      <p className="text-xs text-[#8C485A] italic mt-1">
                        Message: &ldquo;{item.custom_message}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Price and Counter */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F5D3DC]">
                  <div className="flex items-center bg-[#FFFDFB] border border-[#F5D3DC] rounded-full px-2.5 py-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[#70132C] hover:bg-[#FCE8ED]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs text-[#70132C]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[#70132C] hover:bg-[#FCE8ED]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-base text-[#70132C] block">
                      {formatINR(item.line_total_paise)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-stone-400 hover:text-rose-600 text-xs font-medium flex items-center gap-1 mt-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Checkout Summary */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Fulfilment Mode */}
            <div className="p-5 bg-white rounded-2xl border border-[#F5D3DC] space-y-3">
              <span className="text-xs font-bold text-[#70132C] uppercase tracking-wider block">
                Fulfilment Mode
              </span>
              <div className="grid grid-cols-2 p-1 bg-[#FCE8ED] rounded-xl border border-[#F5D3DC]">
                <button
                  onClick={() => setFulfilmentType('delivery')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                    fulfilmentType === 'delivery'
                      ? 'bg-[#990F35] text-white shadow-xs'
                      : 'text-[#70132C]'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Delivery
                </button>
                <button
                  onClick={() => setFulfilmentType('pickup')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                    fulfilmentType === 'pickup'
                      ? 'bg-[#990F35] text-white shadow-xs'
                      : 'text-[#70132C]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Store Pickup
                </button>
              </div>

              {fulfilmentType === 'delivery' ? (
                <div className="pt-2 space-y-2">
                  <form onSubmit={handlePincodeSubmit} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Delivery Pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#F5D3DC] text-[#70132C]"
                    />
                    <button
                      type="submit"
                      disabled={checkingPincode}
                      className="px-4 py-2 bg-[#990F35] text-white rounded-xl text-xs font-bold"
                    >
                      {checkingPincode ? 'Checking...' : 'Check'}
                    </button>
                  </form>
                  {deliveryError && (
                    <p className="text-xs text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {deliveryError}
                    </p>
                  )}
                  {activeDeliveryZone && (
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      Serviceable in {activeDeliveryZone.area_name}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-[#FCE8ED]/40 rounded-xl text-xs text-[#70132C] space-y-1">
                  <p className="font-bold text-[#990F35]">Store Address:</p>
                  <p className="text-[11px] text-[#8C485A]">
                    Nila&apos;s Treat Bakery, Periyakulam Road, Theni - 625531
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold">
                    ✓ No delivery charge for store pickups!
                  </p>
                </div>
              )}
            </div>

            {/* Bill Summary */}
            <div className="p-5 bg-white rounded-2xl border border-[#F5D3DC] space-y-4">
              <span className="text-xs font-bold text-[#70132C] uppercase tracking-wider block">
                Payment Breakdown
              </span>

              {/* Coupon Box */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span>{appliedCoupon.code} applied!</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs font-bold text-rose-600 underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCouponSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon (e.g. NILA100)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#F5D3DC] text-[#70132C]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FCE8ED] text-[#990F35] font-bold text-xs rounded-xl border border-[#F5D3DC]"
                  >
                    Apply
                  </button>
                </form>
              )}

              {couponError && (
                <p className="text-xs text-rose-600">{couponError}</p>
              )}

              <div className="space-y-2 text-sm border-t border-[#F5D3DC] pt-3">
                <div className="flex justify-between text-[#8C485A]">
                  <span>Subtotal</span>
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
                  <span className="text-lg">{formatINR(totalPaise)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full py-3.5 bg-[#990F35] hover:bg-[#800A2A] text-white rounded-xl font-bold text-center block shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
