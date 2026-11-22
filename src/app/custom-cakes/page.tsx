'use client';

import React, { useState } from 'react';
import { Sparkles, Phone, CheckCircle2, Upload, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function CustomCakesPage() {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cakeTheme, setCakeTheme] = useState('');
  const [weightKg, setWeightKg] = useState('1.5');
  const [flavorPreference, setFlavorPreference] = useState('Chocolate Truffle');
  const [eggless, setEggless] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !cakeTheme || !eventDate) {
      showToast('Please fill out all required customisation fields', 'error');
      return;
    }

    setIsSubmitted(true);
    showToast('Your custom theme cake inquiry has been received! Our owner will contact you with a bespoke quote.', 'success');
  };

  return (
    <div className="py-12 bg-[#FFFDFB]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCE8ED] text-[#990F35] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Bespoke Celebration Theme Cakes
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#70132C]">
            Design Your Dream Custom Cake
          </h1>
          <p className="text-sm text-[#8C485A] max-w-xl mx-auto">
            From two-tier wedding centerpieces to character birthday themes, share your ideas and we will bake your vision to perfection.
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-8 bg-white rounded-3xl border border-[#F5D3DC] text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#70132C]">
              Request Received With Gratitude!
            </h2>
            <p className="text-sm text-[#8C485A] max-w-md mx-auto">
              We have received your custom requirements for &ldquo;{cakeTheme}&rdquo;. Our head baker in Theni will review the details and call you on{' '}
              <span className="font-bold text-[#990F35]">{customerPhone}</span> with quotation and decoration options.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsSubmitted(false)}
                className="px-6 py-2.5 bg-[#990F35] text-white rounded-full text-xs font-bold"
              >
                Submit Another Inquiry
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#F5D3DC] p-6 sm:p-10 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-[#70132C] mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meenakshi Sundaram"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#70132C] mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#70132C] mb-1">
                  Cake Theme / Occasion *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jungle Safari 1st Birthday, 50th Golden Jubilee, Engagement Floral Cake"
                  value={cakeTheme}
                  onChange={(e) => setCakeTheme(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#70132C] mb-1">
                  Estimated Weight (Kg) *
                </label>
                <select
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] bg-[#FFFDFB] focus:outline-none focus:border-[#990F35]"
                >
                  <option value="1.0">1.0 Kg (Single tier)</option>
                  <option value="1.5">1.5 Kg (Medium celebration)</option>
                  <option value="2.0">2.0 Kg (2 Tiers)</option>
                  <option value="3.0">3.0 Kg (Grand 2-3 Tiers)</option>
                  <option value="5.0">5.0+ Kg (Wedding extravaganza)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#70132C] mb-1">
                  Preferred Flavour
                </label>
                <select
                  value={flavorPreference}
                  onChange={(e) => setFlavorPreference(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] bg-[#FFFDFB] focus:outline-none focus:border-[#990F35]"
                >
                  <option value="Chocolate Truffle">Chocolate Truffle</option>
                  <option value="Rose Milk">Rose Milk Special</option>
                  <option value="Rasamalai">Rasamalai Gourmet</option>
                  <option value="Lotus Biscoff">Lotus Biscoff</option>
                  <option value="Butterscotch">Butterscotch Praline</option>
                  <option value="Fresh Mango">Fresh Alphonso Mango</option>
                  <option value="Blackforest">Classic Blackforest</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#70132C] mb-1">
                  Event / Celebration Date *
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] bg-[#FFFDFB] focus:outline-none focus:border-[#990F35]"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#70132C]">
                  <input
                    type="checkbox"
                    checked={eggless}
                    onChange={(e) => setEggless(e.target.checked)}
                    className="w-4 h-4 text-[#990F35] rounded border-[#F5D3DC] accent-[#990F35]"
                  />
                  <span>100% Pure Vegetarian Eggless Recipe (+₹200)</span>
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#70132C] mb-1">
                  Design Specifications, Inscriptions &amp; Motifs
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your desired color palette, message on cake, toppers or figurines..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] focus:outline-none focus:border-[#990F35]"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FCE8ED]/50 border border-[#F5D3DC] text-xs text-[#8C485A] space-y-1">
              <p className="font-bold text-[#990F35]">Transparency Note:</p>
              <p>
                Customisation charges and fondants are calculated and confirmed by the owner based on artwork complexity. No invented charges!
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-[#990F35] hover:bg-[#800A2A] text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Submit Custom Cake Inquiry</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

