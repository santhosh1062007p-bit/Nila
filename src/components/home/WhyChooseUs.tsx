import React from 'react';
import { Sparkles, Heart, ShieldCheck, Clock, MapPin, Truck } from 'lucide-react';

export default function WhyChooseUs() {
  const features = [
    {
      icon: Sparkles,
      title: 'Baked Fresh to Order',
      description: 'Zero stale inventory. Every cake sponge is whipped, baked, and finished only after your order is confirmed.',
    },
    {
      icon: Heart,
      title: 'Eggless Mastery (+₹200)',
      description: 'Dedicated pure vegetarian baking crafted with cloud-soft sponge and velvety dairy cream across all 30 flavours.',
    },
    {
      icon: Truck,
      title: 'Theni Doorstep Delivery',
      description: 'Hand-delivered with temperature and shape care across Theni, Allinagaram, Periyakulam, Bodinayakanur & Cumbum.',
    },
    {
      icon: ShieldCheck,
      title: 'Pure Honest Ingredients',
      description: 'Real seasonal fruit purées, European dark cocoa, and fresh dairy cream without synthetic fillers.',
    },
  ];

  return (
    <section className="py-16 bg-[#FFFDFC] border-t border-[#F5D3DC] w-full">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8F1237]">
            The Nila&apos;s Treat Standard
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#33252A]">
            Baking With Love &amp; Perfection
          </h2>
          <p className="text-sm text-[#70132C]/75 font-normal">
            Every celebration deserves genuine quality. Here is why families across Theni trust our home-baking for their most cherished milestones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white border border-[#F5D3DC] shadow-xs hover:border-[#8F1237] transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#FFF6F0] text-[#8F1237] flex items-center justify-center mb-4 border border-[#F5D3DC] group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-lg text-[#33252A] mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs text-[#70132C]/75 leading-relaxed font-normal">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

