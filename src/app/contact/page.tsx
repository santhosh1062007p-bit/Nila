import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Phone, MapPin, Clock, Mail, MessageSquare, Sparkles, Send } from 'lucide-react';

export const metadata = {
  title: "Contact Us | Nila's Treat — The Home of Fresh Baking",
  description: "Get in touch with Nila's Treat Bakery in Theni, Tamil Nadu. Call 93445 97833 or 89398 00225 for fresh celebration cake orders.",
};

export default function ContactPage() {
  return (
    <div className="bg-[#FFFDFC] text-[#33252A] py-12 lg:py-20">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF6F0] border border-[#F5D3DC] text-xs font-bold text-[#8F1237]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>We&apos;d Love to Hear From You</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#33252A]">
            Contact <span className="text-[#8F1237] italic">Nila&apos;s Treat</span>
          </h1>
          <p className="text-sm sm:text-base text-[#70132C]/80 font-normal">
            Whether you have a question about our cake flavours, custom celebration cakes, or delivery zones in Theni, we are here to assist.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left: Contact Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Mascot Banner Card */}
            <div className="p-6 bg-[#FFF6F0] rounded-3xl border border-[#F5D3DC] flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#8F1237]/25 shadow-sm bg-white shrink-0">
                <Image
                  src="/images/nilas-badge.png"
                  alt="Nila's Treat"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#33252A]">
                  Nila&apos;s Treat
                </h3>
                <p className="text-xs text-[#8F1237] font-semibold uppercase tracking-wider">
                  The Home of Fresh Baking
                </p>
                <p className="text-[11px] text-[#70132C]/70 mt-0.5">
                  Theni, Tamil Nadu, India
                </p>
              </div>
            </div>

            {/* Direct Phone Numbers */}
            <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4">
              <div className="flex items-center gap-3 text-[#8F1237]">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF6F0] flex items-center justify-center border border-[#F5D3DC]">
                  <Phone className="w-5 h-5 text-[#8F1237]" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-[#33252A]">Direct Phone Numbers</h4>
                  <p className="text-xs text-[#70132C]/70">Available for calls and WhatsApp</p>
                </div>
              </div>
              <div className="space-y-2 pt-1 text-sm font-semibold">
                <a
                  href="tel:9344597833"
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#FFFDFC] border border-[#F5D3DC] hover:border-[#8F1237] text-[#8F1237] transition-all"
                >
                  <span>Primary: 93445 97833</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Call Now</span>
                </a>
                <a
                  href="tel:8939800225"
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#FFFDFC] border border-[#F5D3DC] hover:border-[#8F1237] text-[#8F1237] transition-all"
                >
                  <span>Secondary: 89398 00225</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Call Now</span>
                </a>
              </div>
            </div>

            {/* Location & Hours */}
            <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4 text-xs text-[#70132C]/80">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#8F1237] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#33252A] text-sm">Bakery Location</p>
                  <p className="mt-0.5">Nila&apos;s Treat Bakery, Periyakulam Main Road, Theni, Tamil Nadu - 625531</p>
                </div>
              </div>
              <div className="flex items-start gap-3 pt-2 border-t border-[#F5D3DC]/60">
                <Clock className="w-5 h-5 text-[#8F1237] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#33252A] text-sm">Baking &amp; Delivery Hours</p>
                  <p className="mt-0.5">09:00 AM – 09:30 PM (Open all 7 days for fresh cake orders)</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right: Interactive Message / Quick Order Inquiry */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#F5D3DC] p-8 sm:p-10 shadow-sm space-y-6">
            <div>
              <h3 className="font-serif text-2xl font-extrabold text-[#33252A]">
                Send an Inquiry or Custom Request
              </h3>
              <p className="text-xs text-[#70132C]/75 mt-1">
                Have a special flavour combination in mind or a custom party date? Send us a message and our head baker will assist you.
              </p>
            </div>

            <form
              action="https://wa.me/919344597833"
              target="_blank"
              method="GET"
              className="space-y-4 text-xs font-semibold text-[#70132C]"
            >
              <div>
                <label className="block mb-1 text-[#33252A]">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-xs text-[#33252A] focus:outline-none focus:border-[#8F1237]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-[#33252A]">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-xs text-[#33252A] focus:outline-none focus:border-[#8F1237]"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[#33252A]">Celebration Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-xs text-[#33252A] focus:outline-none focus:border-[#8F1237]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[#33252A]">Message or Cake Flavour Inquired</label>
                <textarea
                  rows={4}
                  placeholder="Tell us what flavours you are interested in (e.g. Rasamalai 1 Kg, Eggless, Lotus Biscoff, etc.)"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-xs text-[#33252A] focus:outline-none focus:border-[#8F1237]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#8F1237] hover:bg-[#720E2C] text-white rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Submit Cake Inquiry via WhatsApp / Call</span>
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
