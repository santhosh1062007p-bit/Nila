'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatINR } from '@/lib/utils';
import CakeImage from '@/components/products/CakeImage';

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
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

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [checkingPincode, setCheckingPincode] = useState(false);

  if (!isCartOpen) return null;

  const handlePincodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingPincode(true);
    await checkPincode(pincode);
    setCheckingPincode(false);
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    const success = await applyCoupon(couponCodeInput);
    if (success) setCouponCodeInput('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-[#F5D3DC]">
          
          {/* Header */}
          <div className="p-5 border-b border-[#F5D3DC] flex items-center justify-between bg-[#FFFDFB]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FCE8ED] flex items-center justify-center text-[#990F35]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#990F35]">Your Cart</h3>
                <p className="text-xs text-[#8C485A]">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} selected
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-stone-400 hover:text-[#990F35] rounded-full hover:bg-[#FCE8ED] transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fulfilment Toggle */}
          <div className="px-5 py-3 bg-[#FFFDFB] border-b border-[#F5D3DC]">
            <div className="grid grid-cols-2 p-1 bg-[#FCE8ED] rounded-xl border border-[#F5D3DC]">
              <button
                onClick={() => setFulfilmentType('delivery')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  fulfilmentType === 'delivery'
                    ? 'bg-[#990F35] text-white shadow-sm'
                    : 'text-[#70132C] hover:text-[#990F35]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Home Delivery
              </button>
              <button
                onClick={() => setFulfilmentType('pickup')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  fulfilmentType === 'pickup'
                    ? 'bg-[#990F35] text-white shadow-sm'
                    : 'text-[#70132C] hover:text-[#990F35]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Shop Pickup (Free)
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#FCE8ED] text-[#990F35] flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8 opacity-60" />
                </div>
                <h4 className="font-serif font-bold text-lg text-[#70132C]">Your cart is empty</h4>
                <p className="text-sm text-[#8C485A] max-w-xs mx-auto">
                  Explore our freshly baked regular, fruit, and special signature flavours.
                </p>
                <Link
                  href="/cakes"
                  onClick={() => setIsCartOpen(false)}
                  className="inline-flex items-center gap-2 bg-[#990F35] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md hover:bg-[#800A2A] transition-colors"
                >
                  Explore Cakes
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#FFFDFB] border border-[#F5D3DC] flex gap-3 shadow-sm hover:border-[#E8B4C0] transition-colors"
                >
                  {/* Image */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-[#F5D3DC]">
                    <CakeImage
                      src={item.image_url}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif font-bold text-[#990F35] text-base truncate">
                          {item.product_name}
                        </h4>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Variant and Eggless Pill */}
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FCE8ED] text-[#70132C]">
                          {item.weight_kg} Kg
                        </span>
                        {item.eggless ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Eggless (+₹200)
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                            Regular
                          </span>
                        )}
                      </div>

                      {item.custom_message && (
                        <p className="text-[11px] text-[#8C485A] italic truncate mt-1">
                          Message: &ldquo;{item.custom_message}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Price and Quantity Controller */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F5D3DC]/60">
                      <div>
                        <span className="text-sm font-extrabold text-[#70132C]">
                          {formatINR(item.line_total_paise)}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[11px] text-[#8C485A] ml-1">
                            ({formatINR(item.unit_price_paise)} each)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 bg-white rounded-full border border-[#F5D3DC] px-2 py-1 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[#70132C] hover:bg-[#FCE8ED]"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-[#70132C] px-1">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[#70132C] hover:bg-[#FCE8ED]"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Calculations */}
          {items.length > 0 && (
            <div className="p-5 border-t border-[#F5D3DC] bg-[#FFFDFB] space-y-4">
              
              {/* Delivery Zone Check (when Home Delivery is selected) */}
              {fulfilmentType === 'delivery' ? (
                <div className="p-3 bg-white rounded-xl border border-[#F5D3DC] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#70132C]">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#990F35]" />
                      Delivery Pincode
                    </span>
                    {activeDeliveryZone && (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {activeDeliveryZone.area_name}
                      </span>
                    )}
                  </div>

                  <form onSubmit={handlePincodeSubmit} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 625531"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                    />
                    <button
                      type="submit"
                      disabled={checkingPincode}
                      className="px-3 py-1.5 bg-[#990F35] text-white rounded-lg text-xs font-bold hover:bg-[#800A2A]"
                    >
                      {checkingPincode ? 'Checking...' : 'Apply'}
                    </button>
                  </form>

                  {deliveryError && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {deliveryError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-[#FCE8ED]/50 rounded-xl border border-[#F5D3DC] text-xs text-[#70132C] space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-[#990F35]">
                    <MapPin className="w-3.5 h-3.5" />
                    Pickup from Nila&apos;s Treat Bakery:
                  </p>
                  <p className="text-[11px] text-[#8C485A]">
                    Periyakulam Main Road, Near Old Bus Stand, Theni - 625531
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold">
                    ✓ Zero delivery fee on store pickups!
                  </p>
                </div>
              )}

              {/* Coupon Box */}
              <div className="space-y-1.5">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-emerald-900">
                        {appliedCoupon.code} applied! (-{formatINR(discountPaise)})
                      </span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon code (e.g. NILA100)"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#FCE8ED] hover:bg-[#F5D3DC] text-[#990F35] font-bold text-xs rounded-xl border border-[#F5D3DC] transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {couponError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {couponError}
                  </p>
                )}
              </div>

              {/* Bill Details */}
              <div className="space-y-2 text-xs border-t border-[#F5D3DC]/60 pt-3">
                <div className="flex justify-between text-[#8C485A]">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-[#70132C]">{formatINR(subtotalPaise)}</span>
                </div>

                <div className="flex justify-between text-[#8C485A]">
                  <span>Delivery Charge</span>
                  <span>
                    {fulfilmentType === 'pickup' ? (
                      <span className="text-emerald-600 font-bold">FREE (Shop Pickup)</span>
                    ) : deliveryChargePaise > 0 ? (
                      <span className="font-semibold text-[#70132C]">
                        {formatINR(deliveryChargePaise)}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Verify Pincode</span>
                    )}
                  </span>
                </div>

                {discountPaise > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount</span>
                    <span>-{formatINR(discountPaise)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-extrabold text-[#990F35] border-t border-[#F5D3DC] pt-2">
                  <span>To Pay</span>
                  <span className="text-base">{formatINR(totalPaise)}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-3.5 bg-[#990F35] hover:bg-[#800A2A] text-white rounded-xl font-bold text-center block shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 text-sm"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
