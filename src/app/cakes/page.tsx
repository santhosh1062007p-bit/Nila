'use client';

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/products/ProductCard';
import ProductFilters from '@/components/products/ProductFilters';
import { Product, Category } from '@/types';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '@/data/initial-data';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

function CakesCatalogContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [egglessOnly, setEgglessOnly] = useState<boolean>(false);

  // Sync with searchParams
  useEffect(() => {
    const cat = searchParams.get('category');
    const q = searchParams.get('search');
    Promise.resolve().then(() => {
      if (cat) setSelectedCategory(cat);
      if (q !== null) setSearchQuery(q);
    });
  }, [searchParams]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        }
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      }
    } catch (err) {
      console.warn('Using local catalog fallback:', err);
    }
  }, []);

  // Fetch updated products from backend API
  useEffect(() => {
    let active = true;
    fetch('/api/products', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (Array.isArray(data.products)) setProducts(data.products);
        if (Array.isArray(data.categories)) setCategories(data.categories);
      })
      .catch((err) => {
        console.warn('Using local catalog fallback:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Real-time catalog synchronization: live updates when admin alters cakes
  useRealtimeSubscription(
    ['PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED'],
    (event) => {
      if (event.type === 'PRODUCT_UPDATED') {
        const updated = event.data as Product;
        if (updated?.id) {
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
          );
        } else {
          loadData();
        }
      } else if (event.type === 'PRODUCT_CREATED') {
        const created = event.data as Product;
        if (created?.id) {
          setProducts((prev) => {
            if (prev.some((p) => p.id === created.id)) {
              return prev.map((p) => (p.id === created.id ? created : p));
            }
            return [created, ...prev];
          });
        } else {
          loadData();
        }
      } else if (event.type === 'PRODUCT_DELETED') {
        const payload = event.data as { productId?: string };
        if (payload?.productId) {
          setProducts((prev) => prev.filter((p) => p.id !== payload.productId));
        } else {
          loadData();
        }
      }
    }
  );

  // Filter logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(
        (p) =>
          p.category_slug === selectedCategory ||
          p.category_name?.toLowerCase().includes(selectedCategory.replace(/-/g, ' '))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q)
      );
    }

    // Filter by Eggless available
    if (egglessOnly) {
      result = result.filter((p) => p.is_eggless_available);
    }

    return result;
  }, [products, selectedCategory, searchQuery, egglessOnly]);

  return (
    <div className="py-6 sm:py-8 bg-[#FFFDFB] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-6">
        
        {/* Simple Category Chips & Eggless Toggle */}
        <ProductFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          egglessOnly={egglessOnly}
          onToggleEgglessOnly={setEgglessOnly}
        />

        {/* Search Results Notice (if searching) */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-xs text-[#70132C] bg-[#FFF6F0] p-3 rounded-xl border border-[#F5D3DC]">
            <span>Search results for: <strong>&ldquo;{searchQuery}&rdquo;</strong> ({filteredProducts.length} cakes found)</span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#8F1237] font-bold hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Products Grid (View & Buy Cakes) */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#F5D3DC] p-8 space-y-3">
            <h3 className="font-serif font-bold text-lg text-[#70132C]">
              No cakes found
            </h3>
            <p className="text-xs text-[#70132C]/70">
              Try a different search keyword or category.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setEgglessOnly(false);
              }}
              className="px-5 py-2 bg-[#8F1237] text-white rounded-full text-xs font-bold"
            >
              Show All 30 Cakes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(265px,1fr))] gap-4 sm:gap-5 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default function CakesPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-xs text-[#8F1237]">Loading Cakes...</div>}>
      <CakesCatalogContent />
    </Suspense>
  );
}
