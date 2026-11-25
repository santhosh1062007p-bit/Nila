'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import { Plus, X, Users, Sparkles, Phone } from 'lucide-react';
import { Coupon } from '@/types';
import { formatINR } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

export default function AdminCouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState('100');
  const [minOrder, setMinOrder] = useState('500');
  const [targetType, setTargetType] = useState<'all' | 'specific_customers' | 'first_order_only'>('all');
  const [allowedPhonesInput, setAllowedPhonesInput] = useState('');
  const [description, setDescription] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/coupons', { cache: 'no-store' });
      const data = await res.json();
      if (data.coupons) setCoupons(data.coupons);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/coupons', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.coupons) setCoupons(data.coupons);
      })
      .catch((e) => console.error(e));

    return () => {
      active = false;
    };
  }, []);

  useRealtimeSubscription('COUPON_UPDATED', () => {
    loadCoupons();
  });

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedPhones =
        targetType === 'specific_customers'
          ? allowedPhonesInput
              .split(/[\n,]+/)
              .map((p) => p.replace(/[^0-9]/g, ''))
              .filter((p) => p.length >= 10)
          : [];

      if (targetType === 'specific_customers' && parsedPhones.length === 0) {
        showToast('Please enter at least one valid 10-digit mobile number for specific customers', 'error');
        return;
      }

      const payload: Coupon = {
        id: `cp-${Date.now()}`,
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: parseInt(discountValue, 10),
        minimum_order_paise: parseInt(minOrder, 10) * 100,
        is_active: true,
        target_type: targetType,
        allowed_phones: parsedPhones,
        description: description.trim() || undefined,
      };

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`Coupon ${code.toUpperCase()} created successfully!`, 'success');
        setIsModalOpen(false);
        setCode('');
        setAllowedPhonesInput('');
        setDescription('');
        loadCoupons();
      }
    } catch {
      showToast('Failed to create coupon', 'error');
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const updated = { ...coupon, is_active: !coupon.is_active };
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        showToast(`Coupon status changed to ${updated.is_active ? 'Active' : 'Inactive'}`, 'success');
        setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? updated : c)));
      }
    } catch {
      showToast('Failed to toggle coupon status', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB]">
      <AdminNav />

      <main className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#70132C]">
              Coupon Management &amp; Customer Targeting
            </h1>
            <p className="text-xs text-[#8C485A] mt-1">
              Decide which coupon is given to which customer: all customers, specific mobile numbers, or first-time orders.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#8F1237] text-white rounded-xl text-xs font-bold hover:bg-[#750E2D] flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Coupon</span>
          </button>
        </div>

        {/* Coupons List Table */}
        <div className="bg-white rounded-3xl border border-[#F5D3DC] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF6F0] border-b border-[#F5D3DC] text-[#70132C] font-bold">
                <tr>
                  <th className="py-3.5 px-5">Coupon Code</th>
                  <th className="py-3.5 px-5">Discount</th>
                  <th className="py-3.5 px-5">Min Order</th>
                  <th className="py-3.5 px-5">Who Gets This Coupon? (Targeting)</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5D3DC]/60 text-[#33252A]">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-stone-400">
                      No coupons created yet. Click &quot;Create New Coupon&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FFFDFC] transition-colors">
                      <td className="py-4 px-5">
                        <span className="font-mono font-bold text-sm text-[#8F1237] block">
                          {c.code}
                        </span>
                        {c.description && (
                          <span className="text-[11px] text-[#8C485A] block mt-0.5">
                            {c.description}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 font-bold text-[#70132C]">
                        {c.discount_type === 'percentage'
                          ? `${c.discount_value}% OFF`
                          : `₹${c.discount_value} FLAT OFF`}
                      </td>

                      <td className="py-4 px-5 font-medium">
                        {formatINR(c.minimum_order_paise)}
                      </td>

                      {/* Who Gets This Coupon */}
                      <td className="py-4 px-5">
                        {c.target_type === 'specific_customers' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                              <Phone className="w-3 h-3" />
                              Specific Customers ({c.allowed_phones?.length || 0})
                            </span>
                            <span className="block text-[10px] font-mono text-[#8C485A] mt-1 max-w-xs truncate">
                              {c.allowed_phones?.join(', ')}
                            </span>
                          </div>
                        ) : c.target_type === 'first_order_only' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Sparkles className="w-3 h-3" />
                            First-Time Orders Only
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <Users className="w-3 h-3" />
                            All Customers (Public)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleToggleCoupon(c)}
                          className="px-3 py-1 border border-[#F5D3DC] hover:border-[#8F1237] text-[#8F1237] text-xs font-bold rounded-lg transition-colors"
                        >
                          {c.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Create Coupon */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl border border-[#F5D3DC] max-w-lg w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95">
              
              <div className="flex items-center justify-between border-b border-[#F5D3DC] pb-3">
                <h3 className="font-serif font-bold text-xl text-[#70132C]">
                  Create Coupon &amp; Assign to Customers
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-[#8F1237]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
                
                {/* Coupon Code */}
                <div>
                  <label className="block font-bold text-[#33252A] mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP50, WELCOME100, DIWALI10"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] font-mono font-bold text-sm uppercase focus:outline-none focus:border-[#8F1237]"
                  />
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#33252A] mb-1">
                      Discount Type
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percentage')}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] font-bold focus:outline-none"
                    >
                      <option value="fixed">Flat Cash (₹ Discount)</option>
                      <option value="percentage">Percentage (% OFF)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#33252A] mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder={discountType === 'fixed' ? 'e.g. 100 (₹100 off)' : 'e.g. 15 (15% off)'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] font-bold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Minimum Order */}
                <div>
                  <label className="block font-bold text-[#33252A] mb-1">
                    Minimum Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] font-bold focus:outline-none"
                  />
                  <p className="text-[10px] text-[#8C485A] mt-1">Customer must order at least this much to apply coupon</p>
                </div>

                {/* Who Gets This Coupon? (Target Audience Selection) */}
                <div className="pt-2 border-t border-[#F5D3DC] space-y-2">
                  <label className="block font-bold text-[#70132C] text-sm">
                    Target Audience (Eligible Customers)
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#F5D3DC] cursor-pointer hover:bg-[#FFF6F0]">
                      <input
                        type="radio"
                        name="targetType"
                        value="all"
                        checked={targetType === 'all'}
                        onChange={() => setTargetType('all')}
                        className="text-[#8F1237] accent-[#8F1237]"
                      />
                      <div>
                        <span className="font-bold text-[#33252A] block">All Customers (Public)</span>
                        <span className="text-[11px] text-[#8C485A]">Any customer can use this coupon at checkout</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#F5D3DC] cursor-pointer hover:bg-[#FFF6F0]">
                      <input
                        type="radio"
                        name="targetType"
                        value="specific_customers"
                        checked={targetType === 'specific_customers'}
                        onChange={() => setTargetType('specific_customers')}
                        className="text-[#8F1237] accent-[#8F1237]"
                      />
                      <div>
                        <span className="font-bold text-[#33252A] block">Specific Customers (By Mobile Number)</span>
                        <span className="text-[11px] text-[#8C485A]">Only designated customer phone numbers can use this</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#F5D3DC] cursor-pointer hover:bg-[#FFF6F0]">
                      <input
                        type="radio"
                        name="targetType"
                        value="first_order_only"
                        checked={targetType === 'first_order_only'}
                        onChange={() => setTargetType('first_order_only')}
                        className="text-[#8F1237] accent-[#8F1237]"
                      />
                      <div>
                        <span className="font-bold text-[#33252A] block">First-Time Customers Only</span>
                        <span className="text-[11px] text-[#8C485A]">Valid only on a customer&apos;s very first order</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* If specific customers selected: input phone numbers */}
                {targetType === 'specific_customers' && (
                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-1.5 animate-in fade-in">
                    <label className="block font-bold text-purple-900 text-xs">
                      Enter Allowed 10-Digit Mobile Numbers:
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. 9840123456, 9344597833, 9876543210 (separated by comma or newline)"
                      value={allowedPhonesInput}
                      onChange={(e) => setAllowedPhonesInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs font-mono text-[#33252A] bg-white focus:outline-none focus:border-purple-600"
                    />
                    <p className="text-[10px] text-purple-700">
                      Only customers ordering with these exact phone numbers will be permitted to apply this coupon.
                    </p>
                  </div>
                )}

                {/* Optional description */}
                <div>
                  <label className="block font-bold text-[#33252A] mb-1">
                    Description / Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special birthday gift coupon for regular customer"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F5D3DC]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 border border-[#F5D3DC] text-[#70132C] rounded-full font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#8F1237] text-white rounded-full font-bold text-xs hover:bg-[#750E2D] shadow-sm"
                  >
                    Save &amp; Activate Coupon
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
