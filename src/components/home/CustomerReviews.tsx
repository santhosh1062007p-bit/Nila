import React from 'react';
import { Star, Quote, CheckCircle2 } from 'lucide-react';
import { INITIAL_REVIEWS } from '@/data/initial-data';

export default function CustomerReviews() {
  return (
    <section className="py-16 bg-white border-t border-[#F5D3DC] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#990F35]">
            Customer Love
          </span>
          <h2 className="font-serif text-3xl font-extrabold text-[#70132C] mt-1">
            Loved By Families Across Theni
          </h2>
          <p className="text-sm text-[#8C485A] mt-2">
            Read what our wonderful customers say about our cakes and doorstep delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {INITIAL_REVIEWS.map((rev) => (
            <div
              key={rev.id}
              className="p-6 rounded-2xl bg-[#FFFDFB] border border-[#F5D3DC] flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-3">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-xs text-[#70132C] leading-relaxed italic mb-4">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-[#F5D3DC]/60 flex items-center justify-between">
                <div>
                  <p className="font-serif font-bold text-sm text-[#990F35]">
                    {rev.customer_name}
                  </p>
                  <p className="text-[11px] text-[#8C485A] font-medium">
                    {rev.product_name}
                  </p>
                </div>
                <span className="text-emerald-700 font-semibold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

