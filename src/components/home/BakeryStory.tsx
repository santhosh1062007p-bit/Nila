import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles, Heart } from 'lucide-react';

export default function BakeryStory() {
  return (
    <section className="py-16 lg:py-20 bg-[#FFFDFC] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column: Mascot & Imagery */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-md aspect-[4/5] rounded-3xl overflow-hidden border border-[#F5D3DC] shadow-lg bg-[#FFF6F0]">
              <Image
                src="https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=1000&auto=format&fit=crop&q=80"
                alt="Baker layering fresh cream cake at Nila's Treat"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Mascot Floating Badge */}
              <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#F5D3DC] shadow-lg flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#8F1237]/20 bg-[#FFF6F0] shrink-0">
                  <Image
                    src="/images/nilas-badge.png"
                    alt="Nila's Treat Mascot"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#33252A]">
                    Handcrafted in Theni
                  </h4>
                  <p className="text-[11px] text-[#8F1237] font-semibold">
                    The Home of Fresh Baking
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Story Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF6F0] border border-[#F5D3DC] text-xs font-bold text-[#8F1237]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Our Passion &amp; Philosophy</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#33252A] leading-tight">
              Baking Fresh For The Moments That Matter Most
            </h2>

            <p className="text-sm sm:text-base text-[#70132C]/80 leading-relaxed font-normal">
              At Nila&apos;s Treat, we believe that a celebration cake should never come from a cold display fridge where it has sat for days. We bake each cake to order — whisking soft sponges, boiling real fruit compotes, and whipping fresh dairy creams right here in Theni.
            </p>

            <p className="text-sm sm:text-base text-[#70132C]/80 leading-relaxed font-normal">
              Whether it&apos;s our classic Vanilla and rich Blackforest, seasonal Alphonso Mango and organic hill Jackfruit, or our luxurious Kunafa Truffle and Lotus Biscoff, you receive honest baking made with love.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFF6F0] hover:bg-[#FCE8ED] text-[#8F1237] border border-[#F5D3DC] font-bold text-xs sm:text-sm transition-all"
              >
                <span>Read Full Bakery Story</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/cakes"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8F1237] hover:bg-[#720E2C] text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
              >
                <span>Browse Menu</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
