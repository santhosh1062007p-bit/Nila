import React from 'react';
import Link from 'next/link';
import { Cake, Sparkles, MapPin, Smile, ArrowRight } from 'lucide-react';

export default function OrderingProcess() {
  const steps = [
    {
      num: '01',
      icon: Cake,
      title: 'Choose Flavour & Size',
      desc: 'Browse our 30 authentic flavours from classic Vanilla and Alphonso Mango to Kunafa Truffle, available in ½ Kg and 1 Kg.',
    },
    {
      num: '02',
      icon: Sparkles,
      title: 'Custom Message & Eggless',
      desc: 'Type your birthday or celebration message to be piped on the cake, and toggle 100% pure vegetarian Eggless (+₹200) if needed.',
    },
    {
      num: '03',
      icon: MapPin,
      title: 'Delivery Slot or Pickup',
      desc: 'Choose doorstep delivery across Theni district zones (Theni, Bodi, Periyakulam, Cumbum) or hassle-free shop pickup.',
    },
    {
      num: '04',
      icon: Smile,
      title: 'Celebration Made Sweeter',
      desc: 'Your cake is whisked and baked fresh on your delivery day, arriving safely packaged and ready to bring smiles.',
    },
  ];

  return (
    <section className="py-16 bg-[#FFF6F0] border-y border-[#F5D3DC] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8F1237]">
            How It Works
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#33252A]">
            Simple, Fresh Cake Ordering
          </h2>
          <p className="text-sm text-[#70132C]/75 font-normal">
            Four easy steps from our oven to your family celebration table in Theni.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative p-6 rounded-3xl bg-white border border-[#F5D3DC] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-[#FFF6F0] text-[#8F1237] flex items-center justify-center border border-[#F5D3DC]">
                      <Icon className="w-5 h-5 text-[#8F1237]" />
                    </div>
                    <span className="font-serif font-black text-2xl text-[#8F1237]/20">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-base text-[#33252A] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#70132C]/75 leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/cakes"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#8F1237] hover:bg-[#720E2C] text-white rounded-full font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <span>Explore All 30 Flavours</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
