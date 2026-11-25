'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Share2,
  Check,
} from 'lucide-react';
import { Product } from '@/types';
import { formatINR, getAvailableDates, AVAILABLE_TIME_SLOTS } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useRealtimeSubscription } from '@/context/RealtimeContext';
import CakeImage from '@/components/products/CakeImage';

interface ProductDetailViewProps {
  product: Product;
}

export default function ProductDetailView({ product: initialProduct }: ProductDetailViewProps) {
  const router = useRouter();
  const { addItem, setIsCartOpen, setFulfilmentType } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product>(initialProduct);

  useRealtimeSubscription('PRODUCT_UPDATED', (event) => {
    const updated = event.data as Product;
    if (updated?.id === initialProduct.id) {
      setProduct((prev) => ({ ...prev, ...updated }));
    }
  });

  const [selectedWeight, setSelectedWeight] = useState<0.5 | 1.0>(0.5);
  const [isEggless, setIsEggless] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [fulfilmentMode, setFulfilmentMode] = useState<'delivery' | 'pickup'>('delivery');
  
  const dates = getAvailableDates();
  const [selectedDate, setSelectedDate] = useState<string>(dates[0].value);
  const [selectedSlot, setSelectedSlot] = useState<string>(AVAILABLE_TIME_SLOTS[0]);
  const [added, setAdded] = useState(false);

  // Price calculations in paise
  const variant = product.variants.find((v) => v.weight_kg === selectedWeight);
  const basePricePaise = variant ? variant.price_paise : 30000;
  const egglessChargePaise = isEggless ? (product.eggless_extra_paise || 20000) : 0;
  const unitPricePaise = basePricePaise + egglessChargePaise;
  const totalPricePaise = unitPricePaise * quantity;

  const handleAddToCart = () => {
    addItem({
      product,
      weightKg: selectedWeight,
      eggless: isEggless,
      quantity,
      customMessage,
      specialInstructions,
    });
    setFulfilmentType(fulfilmentMode);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    addItem({
      product,
      weightKg: selectedWeight,
      eggless: isEggless,
      quantity,
      customMessage,
      specialInstructions,
    });
    setFulfilmentType(fulfilmentMode);
    setIsCartOpen(false);
    router.push('/checkout');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${product.name} | Nila's Treat Theni`,
        text: `Check out ${product.name} freshly baked at Nila's Treat!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!', 'info');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
      
      {/* Left Column: Image Presentation */}
      <div className="lg:col-span-6 space-y-4">
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-stone-100 border border-[#F5D3DC] shadow-sm">
          <CakeImage
            src={product.image_url}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />

          {product.is_bestseller && (
            <div className="absolute top-4 left-4 bg-[#990F35] text-white text-xs font-black uppercase px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Bestseller
            </div>
          )}

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md text-[#70132C] hover:bg-white flex items-center justify-center shadow-md transition-transform active:scale-95"
              title="Share Cake"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Badges & Guarantees */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-3 bg-white rounded-2xl border border-[#F5D3DC] space-y-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
            <p className="font-bold text-[#70132C]">Freshly Baked</p>
            <p className="text-[10px] text-[#8C485A]">Prepared to order</p>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#F5D3DC] space-y-1">
            <Sparkles className="w-5 h-5 text-amber-500 mx-auto" />
            <p className="font-bold text-[#70132C]">Pure Butter</p>
            <p className="text-[10px] text-[#8C485A]">Zero preservatives</p>
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#F5D3DC] space-y-1">
            <ShieldCheck className="w-5 h-5 text-[#990F35] mx-auto" />
            <p className="font-bold text-[#70132C]">Theni Verified</p>
            <p className="text-[10px] text-[#8C485A]">Local bakery</p>
          </div>
        </div>
      </div>

      {/* Right Column: Customization & Ordering Form */}
      <div className="lg:col-span-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#8C485A] uppercase tracking-wider">
            <span>{product.category_name}</span>
            <span>•</span>
            <span className="text-emerald-700">In Stock</span>
          </div>
          
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#990F35] mt-1">
            {product.name}
          </h1>

          <p className="text-sm text-[#8C485A] mt-2.5 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Dynamic Price Display */}
        <div className="p-4 bg-[#FCE8ED]/60 rounded-2xl border border-[#F5D3DC] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#8C485A] block uppercase">
              Calculated Total Price
            </span>
            <span className="text-3xl font-black text-[#70132C]">
              {formatINR(totalPricePaise)}
            </span>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-[#70132C]">
              {selectedWeight} Kg {isEggless ? '• Eggless' : '• Regular'}
            </p>
            {quantity > 1 && (
              <p className="text-[#8C485A]">({formatINR(unitPricePaise)} each)</p>
            )}
          </div>
        </div>

        {/* Weight Selector */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-[#70132C] block">
            Select Cake Weight:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedWeight(0.5)}
              className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                selectedWeight === 0.5
                  ? 'border-[#990F35] bg-[#990F35] text-white shadow-md'
                  : 'border-[#F5D3DC] bg-white text-[#70132C] hover:border-[#990F35]'
              }`}
            >
              <span className="font-serif font-bold text-base">½ Kg</span>
              <span className={`text-xs mt-0.5 ${selectedWeight === 0.5 ? 'text-white/90' : 'text-[#8C485A]'}`}>
                {formatINR(product.variants.find((v) => v.weight_kg === 0.5)?.price_paise || 30000)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedWeight(1.0)}
              className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                selectedWeight === 1.0
                  ? 'border-[#990F35] bg-[#990F35] text-white shadow-md'
                  : 'border-[#F5D3DC] bg-white text-[#70132C] hover:border-[#990F35]'
              }`}
            >
              <span className="font-serif font-bold text-base">1 Kg</span>
              <span className={`text-xs mt-0.5 ${selectedWeight === 1.0 ? 'text-white/90' : 'text-[#8C485A]'}`}>
                {formatINR(product.variants.find((v) => v.weight_kg === 1.0)?.price_paise || 50000)}
              </span>
            </button>
          </div>
        </div>

        {/* Eggless Toggle */}
        {product.is_eggless_available && (
          <div className="p-4 bg-white rounded-2xl border border-[#F5D3DC] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              </span>
              <div>
                <span className="font-bold text-sm text-[#70132C] block">
                  100% Eggless Preparation
                </span>
                <span className="text-xs text-[#8C485A]">
                  Additional ₹200 charge applies
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEggless(!isEggless)}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${
                isEggless ? 'bg-[#990F35]' : 'bg-stone-200'
              }`}
              aria-label="Toggle eggless option"
            >
              <div
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${
                  isEggless ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* Fruit Market Rate Notice if applicable */}
        {product.is_price_market_dependent && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Fresh Fruit Seasonal Note</p>
              <p className="text-amber-800/90 text-[11px] leading-tight mt-0.5">
                Fruit cake prices may vary depending on the fruit market rate at the time of purchase.
              </p>
            </div>
          </div>
        )}

        {/* Quick Occasion Chips */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#33252A] block">
            Select Occasion:
          </label>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { label: 'Birthday', text: 'Happy Birthday!' },
              { label: 'Anniversary', text: 'Happy Anniversary!' },
              { label: 'Celebration', text: 'Congratulations!' },
              { label: 'Special Love', text: 'With All My Love' },
            ].map((occ) => (
              <button
                key={occ.label}
                type="button"
                onClick={() => {
                  setCustomMessage(occ.text);
                  showToast(`${occ.label} theme selected!`, 'info');
                }}
                className={`px-3 py-1.5 rounded-full border transition-all ${
                  customMessage.includes(occ.text.replace('!', ''))
                    ? 'bg-[#8F1237] text-white border-[#8F1237] shadow-xs'
                    : 'bg-[#FFF6F0] text-[#70132C] border-[#F5D3DC] hover:border-[#8F1237]'
                }`}
              >
                {occ.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cake Inscription Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#70132C] block">
            Message Piped on Cake (Optional):
          </label>
          <input
            type="text"
            maxLength={35}
            placeholder="e.g. Happy Birthday Diya!"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full bg-white px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-sm text-[#70132C] focus:outline-none focus:border-[#990F35]"
          />
          <p className="text-[10px] text-[#8C485A] text-right">Max 35 characters</p>
        </div>

        {/* Special Instructions */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#70132C] block">
            Special Baking Instructions (Optional):
          </label>
          <textarea
            rows={2}
            placeholder="Less sugar, extra cherries, candles request..."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full bg-white px-4 py-2 rounded-xl border border-[#F5D3DC] text-sm text-[#70132C] focus:outline-none focus:border-[#990F35]"
          />
        </div>

        {/* Delivery / Pickup Slot Selection */}
        <div className="p-4 bg-white rounded-2xl border border-[#F5D3DC] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#70132C]">Fulfilment Method:</span>
            <div className="flex items-center gap-1 bg-[#FCE8ED] p-0.5 rounded-lg border border-[#F5D3DC]">
              <button
                type="button"
                onClick={() => setFulfilmentMode('delivery')}
                className={`px-3 py-1 text-xs font-bold rounded-md ${
                  fulfilmentMode === 'delivery' ? 'bg-[#990F35] text-white' : 'text-[#70132C]'
                }`}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => setFulfilmentMode('pickup')}
                className={`px-3 py-1 text-xs font-bold rounded-md ${
                  fulfilmentMode === 'pickup' ? 'bg-[#990F35] text-white' : 'text-[#70132C]'
                }`}
              >
                Pickup
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#8C485A] block mb-1">
                Preferred Date:
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs font-bold bg-[#FFFDFB] border border-[#F5D3DC] rounded-xl px-3 py-2 text-[#70132C] focus:outline-none focus:border-[#990F35]"
              >
                {dates.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#8C485A] block mb-1">
                Time Slot:
              </label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full text-xs font-bold bg-[#FFFDFB] border border-[#F5D3DC] rounded-xl px-3 py-2 text-[#70132C] focus:outline-none focus:border-[#990F35]"
              >
                {AVAILABLE_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quantity and Actions */}
        <div className="flex items-center gap-4 pt-2">
          {/* Quantity Counter */}
          <div className="flex items-center bg-white border border-[#F5D3DC] rounded-full px-3 py-2 shadow-xs">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#70132C] hover:bg-[#FCE8ED] font-bold"
            >
              -
            </button>
            <span className="w-8 text-center font-bold text-sm text-[#70132C]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#70132C] hover:bg-[#FCE8ED] font-bold"
            >
              +
            </button>
          </div>

          {/* Add to Cart CTA (Flipkart Style) */}
          <button
            type="button"
            onClick={handleAddToCart}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 ${
              added ? 'bg-emerald-600 text-white' : 'bg-[#FF9F00] hover:bg-[#e68e00] text-white'
            }`}
          >
            {added ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added to Cart!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </>
            )}
          </button>

          {/* Flipkart Direct Buy Now CTA */}
          <button
            type="button"
            onClick={handleBuyNow}
            className="flex-1 py-3.5 px-6 rounded-2xl font-black text-sm bg-[#FB641B] hover:bg-[#e05510] text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <span>BUY NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
}
