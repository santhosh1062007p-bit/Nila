import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Info } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { Product } from '@/types';

interface FlavourSectionProps {
  title: string;
  subtitle?: string;
  categorySlug?: string;
  products: Product[];
  isFruitFlavour?: boolean;
}

export default function FlavourSection({
  title,
  subtitle,
  categorySlug,
  products,
  isFruitFlavour = false,
}: FlavourSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-12 w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#70132C]">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-sm text-[#8C485A] mt-1 max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>

          {categorySlug && (
            <Link
              href={`/cakes?category=${categorySlug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#990F35] hover:text-[#800A2A] hover:underline shrink-0"
            >
              <span>Explore All {title}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Fruit Market Rate Disclaimer Banner */}
        {isFruitFlavour && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center gap-3 shadow-xs">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Fresh Fruit Advisory: </span>
              <span className="text-amber-800">
                Fruit cake prices may vary depending on the fruit market rate at the time of purchase. Owner confirms any seasonal variance prior to dispatch.
              </span>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

