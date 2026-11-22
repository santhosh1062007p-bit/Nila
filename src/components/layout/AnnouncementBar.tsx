'use client';

import React from 'react';
import { Phone, MapPin, Clock } from 'lucide-react';

function InstagramIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
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

export default function AnnouncementBar() {
  return (
    <aside aria-label="Store Announcement" className="w-full bg-[#70132C] text-white text-xs py-2 px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 border-b border-[#8C1B3B]">
      <div className="w-full flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium text-[#FCE8ED]">
            <MapPin className="w-3.5 h-3.5 text-[#FCE8ED]" />
            Fresh Baking in Theni, Tamil Nadu
          </span>
          <span className="hidden sm:inline text-white/40">|</span>
          <span className="hidden sm:flex items-center gap-1 text-white/90">
            <Clock className="w-3.5 h-3.5" />
            09:00 AM – 09:30 PM Daily
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[#FCE8ED]" />
            <a href="tel:9344597833" className="hover:underline font-semibold tracking-wide">
              93445 97833
            </a>
            <span className="text-white/40">/</span>
            <a href="tel:8939800225" className="hover:underline font-semibold tracking-wide">
              89398 00225
            </a>
          </div>
          <span className="hidden sm:inline text-white/40">|</span>
          <a
            href="https://instagram.com/NILAS_TREAT"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#FCE8ED] hover:text-white transition-colors"
          >
            <InstagramIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">@NILAS_TREAT</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
