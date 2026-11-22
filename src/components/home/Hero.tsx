'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Phone, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import CakeImage from '@/components/products/CakeImage';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#FFFDFC] pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-[#FCE8EC] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Text Presentation */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Authentic Brand Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#FFF6F0] border border-[#F5D3DC] shadow-xs">
              <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0">
                <Image
                  src="/images/nilas-badge.png"
                  alt="Nila's Treat"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-xs font-bold text-[#8F1237] tracking-wide">
                Nila&apos;s Treat • The Home of Fresh Baking • Theni
              </span>
            </div>

            {/* Main Brand-Focused Heading */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#33252A] leading-[1.12] tracking-tight">
              Made with Love.{' '}
              <span className="text-[#8F1237] block sm:inline font-normal italic">
                Baked for Your Moments.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-[#70132C]/80 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Discover freshly baked cakes for birthdays, celebrations and life&apos;s sweetest moments. Baked fresh to order in Theni with pure ingredients and rich flavours.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/cakes"
                className="w-full sm:w-auto px-8 py-4 bg-[#8F1237] hover:bg-[#720E2C] text-white rounded-full font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-95"
              >
                <span>Explore Cakes</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/cakes?category=special-flavours"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-[#FFF6F0] text-[#33252A] border border-[#8F1237]/30 hover:border-[#8F1237] rounded-full font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Order Now</span>
              </Link>
            </div>

            {/* Direct Phone Assistance */}
            <div className="pt-2 flex items-center justify-center lg:justify-start gap-3 text-xs text-[#70132C]/75">
              <span className="w-7 h-7 rounded-full bg-[#FFF6F0] text-[#8F1237] flex items-center justify-center shrink-0 border border-[#F5D3DC]">
                <Phone className="w-3.5 h-3.5" />
              </span>
              <span>
                Call directly for quick orders:{' '}
                <a href="tel:9344597833" className="font-bold text-[#8F1237] hover:underline">
                  93445 97833
                </a>{' '}
                / {' '}
                <a href="tel:8939800225" className="font-bold text-[#8F1237] hover:underline">
                  89398 00225
                </a>
              </span>
            </div>

            {/* Editorial Features Strip */}
            <div className="pt-5 border-t border-[#F5D3DC]/70 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div>
                <p className="font-serif font-black text-xl text-[#8F1237]">30</p>
                <p className="text-xs text-[#70132C]/70 font-medium">Authentic Recipes</p>
              </div>
              <div>
                <p className="font-serif font-black text-xl text-[#8F1237]">₹200</p>
                <p className="text-xs text-[#70132C]/70 font-medium">Eggless Option</p>
              </div>
              <div>
                <p className="font-serif font-black text-xl text-[#8F1237]">Theni</p>
                <p className="text-xs text-[#70132C]/70 font-medium">Doorstep &amp; Pickup</p>
              </div>
            </div>
          </div>

          {/* Right Presentation Hero Cake Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] w-full max-w-md mx-auto rounded-3xl overflow-hidden shadow-xl border border-[#F5D3DC] bg-[#FFF6F0]">
              <CakeImage
                src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&auto=format&fit=crop&q=85"
                alt="Handcrafted Nila's Treat chocolate truffle cake"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

              {/* Top Authentic Logo Badge */}
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#F5D3DC] shadow-sm flex items-center gap-2">
                <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0">
                  <Image
                    src="/images/nilas-badge.png"
                    alt="Mascot"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-[11px] font-bold text-[#8F1237]">
                  Freshly Baked Today
                </span>
              </div>

              {/* Bottom Card */}
              <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#F5D3DC] shadow-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF6F0] text-[#8F1237] flex items-center justify-center shrink-0 font-serif font-bold text-lg border border-[#F5D3DC]">
                  ★
                </div>
                <div>
                  <div className="flex items-center gap-1 text-amber-500 text-xs">
                    ★★★★★
                  </div>
                  <p className="text-xs font-bold text-[#33252A]">
                    &ldquo;Best cake taste &amp; finish in Theni!&rdquo;
                  </p>
                  <p className="text-[10px] text-[#70132C]/70">
                    Verified Customer from Theni Town
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
