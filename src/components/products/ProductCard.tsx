'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Sparkles, Check, Info } from 'lucide-react';
import { Product } from '@/types';
import { formatINR } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import CakeImage from '@/components/products/CakeImage';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addItem, setIsCartOpen } = useCart();
  const [selectedWeight, setSelectedWeight] = useState<0.5 | 1.0>(0.5);
  const [isEggless, setIsEggless] = useState<boolean>(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Variant lookup
  const variant = product.variants.find((v) => v.weight_kg === selectedWeight);
  const basePricePaise = variant ? variant.price_paise : 30000;
  const egglessChargePaise = isEggless ? (product.eggless_extra_paise || 20000) : 0;
  const currentPricePaise = basePricePaise + egglessChargePaise;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      product,
      weightKg: selectedWeight,
      eggless: isEggless,
      quantity: 1,
    });

    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Direct Buy: Add to order, close cart drawer, and go straight to checkout!
    addItem({
      product,
      weightKg: selectedWeight,
      eggless: isEggless,
      quantity: 1,
    });
    setIsCartOpen(false);
    router.push('/checkout');
  };

  return (
    <div className="bakery-card group flex flex-col justify-between overflow-hidden relative">
      <div>
        {/* Cake Image with Badge */}
        <Link href={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-stone-100">
          <CakeImage
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Bestseller Badge */}
          {product.is_bestseller && (
            <div className="absolute top-3 left-3 bg-[#990F35] text-white text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Bestseller
            </div>
          )}

          {/* Market Rate Tag for Fruit Cakes */}
          {product.is_price_market_dependent && (
            <div className="absolute bottom-3 left-3 right-3 bg-amber-950/80 backdrop-blur-md text-amber-100 text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
              <Info className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Fresh fruit rates may vary</span>
            </div>
          )}
        </Link>

        {/* Cake Content Details */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8C485A] font-semibold mb-1">
            <span>{product.category_name || 'Artisan Cake'}</span>
            <span className="text-emerald-700 font-bold">● Freshly Baked</span>
          </div>

          <Link href={`/product/${product.slug}`}>
            <h3 className="font-serif font-bold text-lg text-[#990F35] group-hover:text-[#800A2A] transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs text-[#8C485A] line-clamp-2 mt-1.5 leading-relaxed">
            {product.description}
          </p>

          {/* Quick Selectors (Weight & Eggless) */}
          <div className="mt-4 pt-3 border-t border-[#F5D3DC]/60 space-y-2.5">
            {/* Weight Switcher */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#70132C]">Size:</span>
              <div className="flex items-center gap-1.5 bg-[#FFFDFB] p-0.5 rounded-lg border border-[#F5D3DC]">
                <button
                  type="button"
                  onClick={() => setSelectedWeight(0.5)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    selectedWeight === 0.5
                      ? 'bg-[#990F35] text-white shadow-xs'
                      : 'text-[#70132C] hover:bg-[#FCE8ED]'
                  }`}
                >
                  ½ Kg
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeight(1.0)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    selectedWeight === 1.0
                      ? 'bg-[#990F35] text-white shadow-xs'
                      : 'text-[#70132C] hover:bg-[#FCE8ED]'
                  }`}
                >
                  1 Kg
                </button>
              </div>
            </div>

            {/* Eggless Option Switcher */}
            {product.is_eggless_available && (
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="font-medium text-[#70132C] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                  Make Eggless (+₹200)
                </span>
                <input
                  type="checkbox"
                  checked={isEggless}
                  onChange={(e) => setIsEggless(e.target.checked)}
                  className="w-4 h-4 text-[#990F35] rounded focus:ring-[#990F35] border-[#F5D3DC] accent-[#990F35]"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Footer Price and Direct Actions (Flipkart Style) */}
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 space-y-2.5 border-t border-[#F5D3DC]/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#8C485A]">
            Total ({selectedWeight === 0.5 ? '½ Kg' : '1 Kg'}{isEggless ? ', Eggless' : ''}):
          </span>
          <span className="text-lg font-black text-[#70132C]">
            {formatINR(currentPricePaise)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Add to Cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 ${
              addedAnimation
                ? 'bg-emerald-600 text-white'
                : 'bg-[#FF9F00] hover:bg-[#e68e00] text-white'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {addedAnimation ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Added!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Add to Cart</span>
              </>
            )}
          </button>

          {/* Flipkart Direct Buy Now */}
          <button
            type="button"
            onClick={handleBuyNow}
            className="py-2 px-2 sm:px-3 rounded-xl text-xs font-black bg-[#FB641B] hover:bg-[#e05510] text-white shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            aria-label={`Buy ${product.name} now`}
          >
            <span className="truncate">BUY NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
}
