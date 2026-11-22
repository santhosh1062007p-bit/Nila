'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';

interface BrandLoadingScreenProps {
  targetUrl: string;
}

export default function BrandLoadingScreen({
  targetUrl,
}: BrandLoadingScreenProps) {
  useEffect(() => {
    // Within 5 seconds (exactly 3.2 seconds) animation completes and enters portal
    const timer = setTimeout(() => {
      window.location.href = targetUrl;
    }, 3200);

    return () => clearTimeout(timer);
  }, [targetUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFDFC] select-none overflow-hidden">
      
      {/* Soft Ambient Bakery Aura Glow */}
      <div className="absolute w-72 h-72 rounded-full bg-[#8F1237]/10 blur-3xl pointer-events-none animate-pulse"></div>

      {/* ONLY Logo Animation - Absolute Zero Text */}
      <div className="relative flex items-center justify-center">
        
        {/* Subtle Expanding Ripple Rings */}
        <div className="absolute w-48 h-48 rounded-full border border-[#8F1237]/20 animate-ping opacity-20"></div>
        <div className="absolute w-40 h-40 rounded-full border border-[#E0A96D]/30 animate-pulse"></div>

        {/* Orbiting Golden-Burgundy Radiant Halo */}
        <div
          className="absolute w-40 h-40 rounded-full opacity-60 blur-xs animate-spin"
          style={{
            background: 'conic-gradient(from 0deg, #8F1237, #E0A96D, transparent, #8F1237)',
            animationDuration: '2.4s',
          }}
        ></div>

        {/* Central Authentic Logo Badge with Breathing & Floating Animation */}
        <div
          className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-[#FFF6F0] z-10"
          style={{
            animation: 'logoBreathe 3.2s ease-in-out infinite',
          }}
        >
          <Image
            src="/images/nilas-badge.png"
            alt="Nila's Treat"
            fill
            priority
            className="object-cover"
          />
        </div>

      </div>

      {/* Pure Logo Keyframes */}
      <style jsx>{`
        @keyframes logoBreathe {
          0% {
            transform: scale(0.95) translateY(0px);
            box-shadow: 0 10px 25px -5px rgba(143, 18, 55, 0.2);
          }
          50% {
            transform: scale(1.08) translateY(-6px);
            box-shadow: 0 25px 45px -5px rgba(143, 18, 55, 0.35);
          }
          100% {
            transform: scale(0.95) translateY(0px);
            box-shadow: 0 10px 25px -5px rgba(143, 18, 55, 0.2);
          }
        }
      `}</style>
    </div>
  );
}
