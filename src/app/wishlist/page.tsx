'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { Product } from '@/types';
import { INITIAL_PRODUCTS } from '@/data/initial-data';

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);

  useEffect(() => {
    // Show top curated featured favorites as starter wishlist
    setWishlistItems(INITIAL_PRODUCTS.filter((p) => p.is_featured).slice(0, 4));
  }, []);

  return (
    <div className="py-8 sm:py-12 bg-[#FFFDFB] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#990F35] uppercase tracking-wider mb-1">
            <Heart className="w-3.5 h-3.5 fill-[#990F35]" />
            Saved Favourites
          </div>
          <h1 className="font-serif text-3xl font-extrabold text-[#70132C]">
            Your Cake Wishlist
          </h1>
          <p className="text-xs text-[#8C485A] mt-1">
            Keep track of flavours you love for upcoming birthdays, family treats and anniversaries.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(265px,1fr))] gap-4 sm:gap-5 lg:gap-6">
          {wishlistItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

