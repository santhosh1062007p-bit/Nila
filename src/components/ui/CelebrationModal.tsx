'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, Heart, CheckCircle2, ArrowRight, Cake } from 'lucide-react';
import { triggerBirthdayCelebration, triggerOrderSuccessConfetti } from '@/lib/animations/confetti';

interface CelebrationModalProps {
  orderCode: string;
  customerName: string;
  customMessage?: string;
  isBirthday?: boolean;
  onProceed: () => void;
}

export default function CelebrationModal({
  orderCode,
  customerName,
  customMessage = '',
  isBirthday = false,
  onProceed,
}: CelebrationModalProps) {
  const detectBirthday =
    isBirthday ||
    customMessage.toLowerCase().includes('birthday') ||
    customMessage.toLowerCase().includes('bday') ||
    customMessage.toLowerCase().includes('hbd');

  useEffect(() => {
    if (detectBirthday) {
      triggerBirthdayCelebration();
    } else {
      triggerOrderSuccessConfetti();
    }
  }, [detectBirthday]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 border border-[#F5D3DC] shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* Soft Background Radial Light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FCE8EC] rounded-full blur-3xl opacity-70 -z-10 pointer-events-none" />

        {/* Mascot Badge & Festive Cake Animation */}
        <div className="relative flex justify-center items-center">
          {detectBirthday ? (
            <div className="relative">
              {/* Animated Glowing Birthday Cake Illustration */}
              <div className="w-24 h-24 rounded-full bg-[#FFF6F0] border-2 border-[#8F1237]/20 flex items-center justify-center text-[#8F1237] shadow-lg animate-bounce">
                <Cake className="w-12 h-12 text-[#8F1237]" />
              </div>
              <div className="absolute -top-2 -right-2 px-2.5 py-1 bg-[#8F1237] text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Birthday Special!</span>
              </div>
            </div>
          ) : (
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#8F1237]/30 shadow-md mx-auto bg-[#FFF6F0]">
              <Image
                src="/images/nilas-badge.png"
                alt="Nila's Treat"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>

        {/* Celebration Heading */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8F1237] uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Order Successfully Placed</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#33252A] leading-tight">
            {detectBirthday
              ? `Happy Birthday Celebration!`
              : `Baking Fresh for Your Moments!`}
          </h2>

          <p className="text-xs sm:text-sm text-[#70132C]/80 max-w-md mx-auto leading-relaxed">
            {detectBirthday ? (
              <>
                Thank you, <strong>{customerName}</strong>! We are baking your special birthday cake with love, freshly whisked sponge, and pure cream in Theni.
              </>
            ) : (
              <>
                Thank you, <strong>{customerName}</strong>! Your artisanal cake order has been received and our bakers are preparing it fresh.
              </>
            )}
          </p>

          {customMessage && (
            <div className="p-3 bg-[#FFF6F0] rounded-2xl border border-[#F5D3DC] text-xs font-serif italic text-[#8F1237] mt-3">
              &ldquo;{customMessage}&rdquo;
            </div>
          )}
        </div>

        {/* Order Code Card */}
        <div className="py-3 px-4 bg-[#FFFDFC] rounded-2xl border border-[#F5D3DC] flex items-center justify-between text-xs">
          <span className="text-[#70132C]/70 font-medium">Tracking Code:</span>
          <span className="font-black text-[#8F1237] bg-[#FCE8EC] px-3 py-1 rounded-full border border-[#F5D3DC]">
            {orderCode}
          </span>
        </div>

        {/* Proceed Action Button */}
        <div>
          <button
            onClick={onProceed}
            className="w-full py-4 bg-[#8F1237] hover:bg-[#720E2C] text-white rounded-full font-bold text-sm shadow-lg shadow-[#8F1237]/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 group"
          >
            <span>View Live Order Receipt &amp; Status</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
}
