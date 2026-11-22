import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, Heart, Clock, Award, ShieldCheck, MapPin, Phone, ArrowRight } from 'lucide-react';

export const metadata = {
  title: "About Us | Nila's Treat — The Home of Fresh Baking",
  description: "Discover the story of Nila's Treat in Theni, Tamil Nadu. Handcrafting fresh, premium celebration cakes with love and honest ingredients.",
};

export default function AboutPage() {
  return (
    <div className="bg-[#FFFDFC] text-[#33252A] py-12 lg:py-20">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-16">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF6F0] border border-[#F5D3DC] text-xs font-bold text-[#8F1237]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Our Bakery Story • Theni, Tamil Nadu</span>
          </div>
          
          <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-[#33252A] leading-tight">
            The Story of <span className="text-[#8F1237] italic">Nila&apos;s Treat</span>
          </h1>
          
          <p className="text-base sm:text-lg text-[#70132C]/80 leading-relaxed font-normal">
            Rooted in Theni, our bakery was founded with a singular promise: to bring authentic freshness back to celebrations through honest, heartfelt home-baking.
          </p>
        </div>

        {/* Mascot & Mission Spotlight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center bg-[#FFF6F0] rounded-3xl p-8 sm:p-12 border border-[#F5D3DC]">
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-48 h-48 sm:w-60 sm:h-60 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white shrink-0">
              <Image
                src="/images/nilas-badge.png"
                alt="Nila's Treat Chef Mascot"
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8F1237]">
              The Home of Fresh Baking
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#33252A]">
              Never Frozen. Always Baked Fresh to Order.
            </h2>
            <p className="text-sm sm:text-base text-[#70132C]/85 leading-relaxed font-normal">
              Commercial bakeries often rely on cold storage sponge and preservatives to survive days in display cases. At Nila&apos;s Treat, our philosophy is the complete opposite: when you order a cake for your loved one&apos;s birthday or celebration, the sponge is whisked, baked, layered, and frosted freshly for that exact moment.
            </p>
            <p className="text-sm sm:text-base text-[#70132C]/85 leading-relaxed font-normal">
              Every cream swirl, dark chocolate ganache, and seasonal fruit purée is prepared with warmth, patience, and meticulous craftsmanship.
            </p>
          </div>
        </div>

        {/* 3 Core Editorial Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF6F0] text-[#8F1237] flex items-center justify-center border border-[#F5D3DC]">
              <Heart className="w-6 h-6 text-[#8F1237]" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#33252A]">
              100% Eggless Mastery
            </h3>
            <p className="text-xs sm:text-sm text-[#70132C]/75 leading-relaxed">
              We respect family dietary preferences. Every single one of our 30 authentic flavours can be prepared completely vegetarian / eggless (+₹200) without compromising on cloud-soft texture or taste.
            </p>
          </div>

          <div className="p-8 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF6F0] text-[#8F1237] flex items-center justify-center border border-[#F5D3DC]">
              <Award className="w-6 h-6 text-[#8F1237]" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#33252A]">
              Real Seasonal Fruit Purées
            </h3>
            <p className="text-xs sm:text-sm text-[#70132C]/75 leading-relaxed">
              From honeyed Theni jackfruit and sweet Alphonso mangoes to lush hill strawberries, we use real fruit pulp rather than synthetic flavor syrups.
            </p>
          </div>

          <div className="p-8 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF6F0] text-[#8F1237] flex items-center justify-center border border-[#F5D3DC]">
              <ShieldCheck className="w-6 h-6 text-[#8F1237]" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#33252A]">
              Dedicated Theni Delivery
            </h3>
            <p className="text-xs sm:text-sm text-[#70132C]/75 leading-relaxed">
              Cake transport requires delicate hands. We hand-deliver orders across Theni, Allinagaram, Periyakulam, Bodinayakanur, and nearby valleys with customized temperature care.
            </p>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="text-center bg-gradient-to-r from-[#8F1237] to-[#70132C] rounded-3xl p-10 text-white space-y-5 shadow-lg">
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold">
            Ready to Taste the Difference?
          </h2>
          <p className="text-sm text-white/85 max-w-xl mx-auto">
            Explore our curated menu of 30 classic, fruit, and gourmet special flavours available in ½ Kg and 1 Kg sizes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/cakes"
              className="px-8 py-3.5 bg-white text-[#8F1237] hover:bg-[#FFF6F0] rounded-full font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <span>Explore All Cakes</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:9344597833"
              className="px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full font-bold text-sm transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>Call 93445 97833</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
