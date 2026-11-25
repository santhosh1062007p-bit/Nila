'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';

interface BrandLoadingScreenProps {
  targetUrl?: string;
  durationMs?: number;
  fullScreen?: boolean;
}

export default function BrandLoadingScreen({
  targetUrl,
  durationMs = 2800,
  fullScreen = true,
}: BrandLoadingScreenProps) {
  useEffect(() => {
    if (!targetUrl) return;
    const timer = setTimeout(() => {
      window.location.href = targetUrl;
    }, durationMs);

    return () => clearTimeout(timer);
  }, [targetUrl, durationMs]);

  return (
    <div
      role="status"
      aria-label="Loading Nila's Treat"
      className={`${
        fullScreen ? 'fixed inset-0 z-50' : 'relative w-full min-h-[420px]'
      } flex flex-col items-center justify-center bg-gradient-to-b from-[#FFFDFC] via-[#FFF6F8] to-[#FFF0F4] select-none overflow-hidden`}
    >
      {/* ======================================================== */}
      {/* 1. BACKGROUND BAKERY ILLUSTRATIONS & FLOATING HEARTS     */}
      {/* ======================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Ambient Bakery Aura Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-tr from-[#8F1237]/10 via-[#F5D3DC]/40 to-transparent blur-3xl pointer-events-none animate-aura" />

        {/* Floating Heart 1 (Top Left) */}
        <svg
          className="absolute top-[18%] left-[15%] w-6 h-6 text-[#8F1237]/15 animate-float-slow"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>

        {/* Floating Heart 2 (Top Right) */}
        <svg
          className="absolute top-[22%] right-[16%] w-7 h-7 text-[#8F1237]/15 animate-float-reverse"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>

        {/* Floating Heart 3 (Bottom Left) */}
        <svg
          className="absolute bottom-[24%] left-[20%] w-5 h-5 text-[#8F1237]/12 animate-float-medium"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>

        {/* Floating Heart 4 (Bottom Right) */}
        <svg
          className="absolute bottom-[28%] right-[18%] w-5 h-5 text-[#8F1237]/12 animate-float-slow"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>

        {/* Cupcake Outline Illustration (Left Ambient) */}
        <svg
          className="absolute top-[38%] left-[8%] sm:left-[12%] w-12 h-12 sm:w-16 sm:h-16 text-[#8F1237]/10 animate-float-slow"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Cupcake Base */}
          <path d="M16 36 L22 56 L42 56 L48 36 Z" />
          <path d="M25 36 L27 56" />
          <path d="M32 36 L32 56" />
          <path d="M39 36 L37 56" />
          {/* Frosting Swirl */}
          <path d="M14 36 C14 30, 20 28, 24 28 C26 22, 38 22, 40 28 C44 28, 50 30, 50 36 Z" />
          {/* Cherry */}
          <circle cx="32" cy="18" r="4" fill="currentColor" opacity="0.3" />
          <path d="M33 14 C35 10, 39 8, 42 9" />
        </svg>

        {/* Tiered Cake Outline Illustration (Right Ambient) */}
        <svg
          className="absolute top-[36%] right-[8%] sm:right-[12%] w-12 h-12 sm:w-16 sm:h-16 text-[#8F1237]/10 animate-float-reverse"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Bottom Tier */}
          <rect x="12" y="38" width="40" height="18" rx="3" />
          <path d="M12 44 Q 22 48, 32 44 Q 42 48, 52 44" />
          {/* Top Tier */}
          <rect x="20" y="24" width="24" height="14" rx="2" />
          <path d="M20 29 Q 26 32, 32 29 Q 38 32, 44 29" />
          {/* Candle */}
          <line x1="32" y1="24" x2="32" y2="16" />
          <path d="M32 16 C31 14, 31 11, 32 9 C33 11, 33 14, 32 16 Z" fill="currentColor" opacity="0.3" />
        </svg>

        {/* Decorative Waves at the Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-28 sm:h-36 pointer-events-none">
          {/* Back Wave */}
          <svg
            className="absolute bottom-0 w-full h-full text-[#FDE8ED] opacity-60 preserve-3d"
            viewBox="0 0 1440 180"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,96L48,106.7C96,117,192,139,288,138.7C384,139,480,117,576,96C672,75,768,53,864,64C960,75,1056,117,1152,122.7C1248,128,1344,96,1392,80L1440,64L1440,180L1392,180C1344,180,1248,180,1152,180C1056,180,960,180,864,180C768,180,672,180,576,180C480,180,384,180,288,180C192,180,96,180,48,180L0,180Z" />
          </svg>
          {/* Front Wave */}
          <svg
            className="absolute bottom-0 w-full h-full text-[#F9D7DF] opacity-40 preserve-3d"
            viewBox="0 0 1440 180"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,64L48,80C96,96,192,128,288,133.3C384,139,480,117,576,112C672,107,768,117,864,128C960,139,1056,149,1152,138.7C1248,128,1344,96,1392,80L1440,64L1440,180L1392,180C1344,180,1248,180,1152,180C1056,180,960,180,864,180C768,180,672,180,576,180C480,180,384,180,288,180C192,180,96,180,48,180L0,180Z" />
          </svg>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. LOGO BADGE & DRAWING RINGS ANIMATION                   */}
      {/* ======================================================== */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo and Concentric Drawing Rings Container */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
          
          {/* Subtle Outer Rotating Highlights */}
          <div
            className="absolute inset-0 rounded-full opacity-40 blur-xs animate-orbit"
            style={{
              background:
                'conic-gradient(from 0deg, #8F1237, #E0A96D 20%, transparent 60%, #8F1237 90%)',
            }}
          />

          {/* SVG Animated Drawing Rings */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            viewBox="0 0 192 192"
          >
            {/* Outer Soft Ring Track */}
            <circle
              cx="96"
              cy="96"
              r="84"
              fill="none"
              stroke="#F5D3DC"
              strokeWidth="2"
              opacity="0.5"
            />

            {/* Animated Outer Burgundy Stroke Reveal */}
            <circle
              cx="96"
              cy="96"
              r="84"
              fill="none"
              stroke="#8F1237"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-draw-ring-outer"
            />

            {/* Middle Delicate Dotted Ring */}
            <circle
              cx="96"
              cy="96"
              r="76"
              fill="none"
              stroke="#E8B4C0"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="animate-spin-slow"
              opacity="0.7"
            />
          </svg>

          {/* Central Authentic Mascot Badge (Gentle Scale-up & Breathing) */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-[4.5px] border-white shadow-2xl bg-[#FFF6F0] z-10 animate-badge-entrance">
            <Image
              src="/images/nilas-badge.png"
              alt="Nila's Treat Mascot Logo"
              fill
              priority
              className="object-cover animate-logo-breathe"
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. BRAND NAME, FLOURISH & LOADING DOTS                  */}
        {/* ======================================================== */}
        <div className="mt-5 space-y-1.5 flex flex-col items-center">
          {/* Nila's Treat Brand Name */}
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-[#8F1237] leading-none animate-title-fade">
            Nila&apos;s Treat
          </h1>

          {/* Pink Underline Flourish (Expands from center) */}
          <div className="w-24 sm:w-28 h-1 relative flex items-center justify-center animate-flourish-expand">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#8F1237] to-transparent rounded-full" />
            <div className="w-1.5 h-1.5 bg-[#8F1237] rotate-45 rounded-xs absolute" />
          </div>

          {/* Tagline */}
          <p className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-[#70132C]/75 pt-0.5 animate-title-fade">
            The Home of Fresh Baking
          </p>

          {/* Sequential Pulsing Loading Dots */}
          <div className="flex items-center gap-1.5 pt-3" aria-hidden="true">
            <span
              className="w-2 h-2 rounded-full bg-[#8F1237] animate-dot-pulse"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-[#8F1237] animate-dot-pulse"
              style={{ animationDelay: '200ms' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-[#8F1237] animate-dot-pulse"
              style={{ animationDelay: '400ms' }}
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. TAILWIND & CSS KEYFRAMES FOR EXACT RECREATION         */}
      {/* ======================================================== */}
      <style jsx>{`
        /* Step 2: Gentle Scale-Up of Mascot Badge */
        .animate-badge-entrance {
          animation: badgeEntrance 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes badgeEntrance {
          0% {
            opacity: 0;
            transform: scale(0.82);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Step 3: Circular Drawing Animation */
        .animate-draw-ring-outer {
          stroke-dasharray: 528;
          stroke-dashoffset: 528;
          animation: drawRing 1.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards;
        }
        @keyframes drawRing {
          0% {
            stroke-dashoffset: 528;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        /* Step 4: Orbiting Shimmer Highlights */
        .animate-orbit {
          animation: orbitRotate 4.5s linear infinite;
        }
        @keyframes orbitRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spinSlow 18s linear infinite;
        }
        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Step 5: Reveal Brand Name */
        .animate-title-fade {
          opacity: 0;
          animation: titleFadeIn 0.8s ease-out 0.6s forwards;
        }
        @keyframes titleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Step 6: Pink Flourish Underline Expand */
        .animate-flourish-expand {
          opacity: 0;
          animation: flourishExpand 0.7s ease-out 0.8s forwards;
        }
        @keyframes flourishExpand {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        /* Step 7: Sequential Pulsing Loading Dots */
        .animate-dot-pulse {
          animation: dotPulse 1.2s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%,
          100% {
            transform: scale(0.75);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.25);
            opacity: 1;
          }
        }

        /* Step 8: Continuous Subtle Logo Breathing */
        .animate-logo-breathe {
          animation: logoBreathe 3.6s ease-in-out 1s infinite alternate;
        }
        @keyframes logoBreathe {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.035);
          }
        }

        /* Ambient Aura Breathing */
        .animate-aura {
          animation: auraGlow 4s ease-in-out infinite alternate;
        }
        @keyframes auraGlow {
          0% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.15);
            opacity: 0.85;
          }
        }

        /* Floating Background Decorations */
        .animate-float-slow {
          animation: floatSlow 5s ease-in-out infinite alternate;
        }
        @keyframes floatSlow {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          100% {
            transform: translateY(-8px) rotate(4deg);
          }
        }

        .animate-float-medium {
          animation: floatMed 4s ease-in-out 0.5s infinite alternate;
        }
        @keyframes floatMed {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          100% {
            transform: translateY(-10px) rotate(-5deg);
          }
        }

        .animate-float-reverse {
          animation: floatRev 4.5s ease-in-out 1s infinite alternate;
        }
        @keyframes floatRev {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          100% {
            transform: translateY(8px) rotate(-4deg);
          }
        }

        /* Accessibility: Prefers Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .animate-badge-entrance,
          .animate-draw-ring-outer,
          .animate-orbit,
          .animate-spin-slow,
          .animate-title-fade,
          .animate-flourish-expand,
          .animate-dot-pulse,
          .animate-logo-breathe,
          .animate-aura,
          .animate-float-slow,
          .animate-float-medium,
          .animate-float-reverse {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
