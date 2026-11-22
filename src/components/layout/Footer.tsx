import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, MapPin, Clock, ShieldCheck, Heart } from 'lucide-react';

function InstagramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-[#33252A] text-[#FFFDFC] pt-16 pb-12 border-t border-[#4A373E]">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#8F1237]/40 shadow-md shrink-0 bg-[#FFF6F0]">
                <Image
                  src="/images/nilas-badge.png"
                  alt="Nila's Treat"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <span className="font-serif text-2xl font-extrabold text-white tracking-tight">
                  Nila&apos;s Treat
                </span>
                <span className="text-[10px] font-medium tracking-widest uppercase text-[#FCE8EC] block mt-0.5">
                  The Home of Fresh Baking
                </span>
              </div>
            </div>

            <p className="text-sm text-white/80 leading-relaxed">
              Authentic artisanal bakery in Theni, crafting freshly baked celebration cakes, fruit infusions, and rich chocolate ganaches with pure ingredients.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://instagram.com/NILAS_TREAT"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#8F1237] flex items-center justify-center text-white transition-colors"
                title="Follow @NILAS_TREAT on Instagram"
              >
                <InstagramIcon className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#8F1237] flex items-center justify-center text-white transition-colors"
                title="Follow Nila's Treat on Facebook"
              >
                <FacebookIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Contact & Hours */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-bold text-white tracking-wide">
              Bakery &amp; Contact
            </h4>
            <ul className="space-y-3 text-sm text-white/85">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-5 h-5 text-[#FCE8EC] shrink-0 mt-0.5" />
                <span>
                  Nila&apos;s Treat Bakery, Theni, Tamil Nadu - 625531, India
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#FCE8EC] shrink-0" />
                <div className="flex flex-col">
                  <a href="tel:9344597833" className="hover:underline font-semibold">
                    +91 93445 97833
                  </a>
                  <a href="tel:8939800225" className="hover:underline font-semibold">
                    +91 89398 00225
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#FCE8EC] shrink-0" />
                <span>09:00 AM – 09:30 PM (All 7 Days)</span>
              </li>
            </ul>
          </div>

          {/* Quick Categories */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-bold text-white tracking-wide">
              Cake Collections
            </h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/cakes" className="hover:text-white hover:underline font-semibold text-[#FCE8EC]">
                  All Cakes (30 Varieties)
                </Link>
              </li>
              <li>
                <Link href="/cakes?category=regular-flavours" className="hover:text-white hover:underline">
                  Regular Flavours (7 Cakes)
                </Link>
              </li>
              <li>
                <Link href="/cakes?category=fruit-flavours" className="hover:text-white hover:underline">
                  Fruit Flavours (6 Cakes)
                </Link>
              </li>
              <li>
                <Link href="/cakes?category=special-flavours" className="hover:text-white hover:underline">
                  Special Flavours (17 Cakes)
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-white hover:underline">
                  Track Live Order Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Service Area & Freshness Notice */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg font-bold text-white tracking-wide">
              Theni Service Zones
            </h4>
            <p className="text-xs text-white/80 leading-relaxed">
              Doorstep home delivery and store pickup available across: Theni Town, Allinagaram, Periyakulam, Bodinayakanur, Chinnamanur, Cumbum &amp; Uthamapalayam.
            </p>
            <div className="p-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white/90 space-y-1">
              <p className="font-semibold text-[#FCE8EC]">Seasonal Fruit Note:</p>
              <p className="text-[11px] leading-tight text-white/70">
                Fruit cake prices may vary depending on the seasonal fruit market rate at the time of purchase.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/70">
          <p>© {new Date().getFullYear()} Nila&apos;s Treat — The Home of Fresh Baking. Handcrafted in Theni, Tamil Nadu.</p>
          <div className="flex items-center gap-6">
            <Link href="/track" className="hover:text-white">
              Order Tracking
            </Link>
            <Link href="/admin/products" className="hover:text-white flex items-center gap-1 text-[#FCE8EC]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Owner Admin Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
