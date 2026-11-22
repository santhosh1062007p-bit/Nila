import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import ProductDetailView from '@/components/products/ProductDetailView';
import ProductCard from '@/components/products/ProductCard';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ slug: string }>;
}


export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await db.getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Related products from the same category
  const allProducts = await db.getProducts();
  const relatedProducts = allProducts
    .filter((p) => p.category_id === product.category_id && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="py-6 sm:py-8 bg-[#FFFDFB] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-8">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-[#8C485A]">
          <Link href="/" className="hover:text-[#990F35]">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <Link href="/cakes" className="hover:text-[#990F35]">
            Cakes
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <Link
            href={`/cakes?category=${product.category_slug}`}
            className="hover:text-[#990F35]"
          >
            {product.category_name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-[#990F35] truncate">{product.name}</span>
        </nav>

        {/* Back Link */}
        <div>
          <Link
            href="/cakes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#990F35] hover:text-[#800A2A] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Cakes</span>
          </Link>
        </div>

        {/* Product Interactive View */}
        <div className="bg-white rounded-3xl border border-[#F5D3DC] p-6 sm:p-10 shadow-sm">
          <ProductDetailView product={product} />
        </div>

        {/* Related Products from same category */}
        {relatedProducts.length > 0 && (
          <div className="pt-8 space-y-6">
            <h2 className="font-serif text-2xl font-extrabold text-[#70132C]">
              More From {product.category_name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

