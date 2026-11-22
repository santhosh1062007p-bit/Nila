import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { INITIAL_CATEGORIES } from '@/data/initial-data';
import CakeImage from '@/components/products/CakeImage';

const CATEGORY_META: Record<string, { bg: string; count: string; startingPrice: string; sampleImage: string }> = {
  'regular-flavours': {
    bg: '#80504C',
    count: '7 Classic Cakes',
    startingPrice: 'From ₹300',
    sampleImage: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80',
  },
  'fruit-flavours': {
    bg: '#75494A',
    count: '6 Fresh Fruit Cakes',
    startingPrice: 'From ₹350',
    sampleImage: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&auto=format&fit=crop&q=80',
  },
  'special-flavours': {
    bg: '#56343D',
    count: '17 Gourmet & Fusion Specials',
    startingPrice: 'From ₹450',
    sampleImage: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=800&auto=format&fit=crop&q=80',
  },
};

export default function CategoryShowcase() {
  return (
    <section className="py-14 bg-white border-y border-[#F5D3DC] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#990F35] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Menu Poster Categories
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#70132C]">
              Explore Our Authentic Cake Collections
            </h2>
          </div>
          <Link
            href="/cakes"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#990F35] hover:text-[#800A2A] hover:underline"
          >
            <span>View All 30 Cakes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Categories Grid (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {INITIAL_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat.slug] || {
              bg: '#80504C',
              count: 'Authentic Cakes',
              startingPrice: 'Best Price',
              sampleImage: '/images/hero-cake.svg',
            };

            return (
              <Link
                key={cat.id}
                href={`/cakes?category=${cat.slug}`}
                className="group relative rounded-3xl overflow-hidden border border-[#F5D3DC] aspect-[16/10] sm:aspect-[4/3] md:aspect-[4/3] shadow-sm hover:shadow-xl transition-all duration-300"
                style={{ backgroundColor: meta.bg }}
              >
                <CakeImage
                  src={meta.sampleImage}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold">
                    {meta.count}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#990F35]/90 text-white text-xs font-extrabold">
                    {meta.startingPrice}
                  </span>
                </div>

                <div className="absolute inset-x-5 bottom-5 text-white">
                  <h3 className="font-serif font-extrabold text-xl sm:text-2xl group-hover:text-[#FCE8ED] transition-colors leading-snug">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-2 mt-1">
                    {cat.description}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#FCE8ED] group-hover:translate-x-1 transition-transform">
                    <span>Order From {cat.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
