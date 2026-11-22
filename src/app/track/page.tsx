'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, ArrowRight, Phone, AlertCircle } from 'lucide-react';

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderQuery, setOrderQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleTrackByCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmed = orderQuery.trim().toUpperCase();

    if (!trimmed) {
      setErrorMessage('Please enter your order number or code (e.g. NT-1001)');
      return;
    }

    router.push(`/orders/${trimmed}`);
  };

  const handleTrackByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanPhone = phoneQuery.replace(/[^0-9]/g, '');

    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/orders?phone=${cleanPhone}`);
      const data = await res.json();

      if (data.orders && data.orders.length > 0) {
        // Redirect to latest order
        router.push(`/orders/${data.orders[0].id}`);
      } else {
        setErrorMessage(`No orders found associated with phone number ${cleanPhone}.`);
      }
    } catch {
      setErrorMessage('Failed to look up orders. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="py-16 bg-[#FFFDFB]">
      <div className="max-w-xl mx-auto px-4 space-y-8">
        
        {/* Header with Authentic Mascot */}
        <div className="text-center space-y-3">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#8F1237]/25 shadow-sm mx-auto bg-[#FFF6F0]">
            <Image
              src="/images/nilas-badge.png"
              alt="Nila's Treat"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-extrabold text-[#33252A]">
              Track Your Fresh Cake Order
            </h1>
            <p className="text-xs text-[#8F1237] font-semibold uppercase tracking-wider mt-1">
              Nila&apos;s Treat — The Home of Fresh Baking • Theni
            </p>
          </div>
          <p className="text-xs text-[#70132C]/75">
            Enter your order tracking code (e.g. NT-1001) or 10-digit mobile number.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Option 1: Track by Order Code */}
        <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4">
          <h2 className="font-serif text-base font-bold text-[#990F35]">
            Option 1: Search by Order Code
          </h2>
          <form onSubmit={handleTrackByCode} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. NT-1001 or Order ID"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#F5D3DC] text-sm text-[#70132C] focus:outline-none focus:border-[#990F35]"
              />
              <Search className="w-4 h-4 text-[#8C485A] absolute left-3.5 top-3.5" />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#990F35] hover:bg-[#800A2A] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>Track Order Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Option 2: Track by Mobile Number */}
        <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-4">
          <h2 className="font-serif text-base font-bold text-[#990F35]">
            Option 2: Search by Mobile Number
          </h2>
          <form onSubmit={handleTrackByPhone} className="space-y-3">
            <div className="relative">
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#F5D3DC] text-sm text-[#70132C] focus:outline-none focus:border-[#990F35]"
              />
              <Phone className="w-4 h-4 text-[#8C485A] absolute left-3.5 top-3.5" />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3 bg-[#70132C] hover:bg-[#580B20] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>{isSearching ? 'Looking up orders...' : 'Find My Orders'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

