'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import { Plus, X, Edit2 } from 'lucide-react';
import { DeliveryZone } from '@/types';
import { formatINR } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

export default function AdminDeliveryPage() {
  const { showToast } = useToast();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  const [pincode, setPincode] = useState('');
  const [areaName, setAreaName] = useState('');
  const [deliveryChargeRupees, setDeliveryChargeRupees] = useState('40');
  const [minimumOrderRupees, setMinimumOrderRupees] = useState('300');
  const [isServiceable, setIsServiceable] = useState(true);

  const loadZones = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery-zones', { cache: 'no-store' });
      const data = await res.json();
      if (data.zones) setZones(data.zones);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/delivery-zones', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.zones) setZones(data.zones);
      })
      .catch((e) => console.error(e));

    return () => {
      active = false;
    };
  }, []);

  useRealtimeSubscription('DELIVERY_ZONE_UPDATED', () => {
    loadZones();
  });

  const handleOpenEdit = (z: DeliveryZone) => {
    setEditingZone(z);
    setPincode(z.pincode);
    setAreaName(z.area_name);
    setDeliveryChargeRupees(String(z.delivery_charge_paise / 100));
    setMinimumOrderRupees(String(z.minimum_order_paise / 100));
    setIsServiceable(z.is_serviceable);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingZone(null);
    setPincode('');
    setAreaName('');
    setDeliveryChargeRupees('50');
    setMinimumOrderRupees('300');
    setIsServiceable(true);
    setIsModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: DeliveryZone = {
        id: editingZone?.id || `dz-${Date.now()}`,
        pincode: pincode.trim(),
        area_name: areaName.trim(),
        delivery_charge_paise: parseInt(deliveryChargeRupees, 10) * 100,
        minimum_order_paise: parseInt(minimumOrderRupees, 10) * 100,
        is_serviceable: isServiceable,
      };

      const res = await fetch('/api/delivery-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`Saved delivery zone ${areaName}!`, 'success');
        setIsModalOpen(false);
        loadZones();
      } else {
        showToast('Failed to save delivery zone', 'error');
      }
    } catch {
      showToast('Error saving delivery zone', 'error');
    }
  };

  const handleToggleServiceable = async (zone: DeliveryZone) => {
    try {
      const updated: DeliveryZone = { ...zone, is_serviceable: !zone.is_serviceable };
      const res = await fetch('/api/delivery-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        showToast(`Updated status for ${zone.pincode}`, 'success');
        setZones((prev) => prev.map((z) => (z.pincode === zone.pincode ? updated : z)));
      }
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB]">
      <AdminNav />

      <main className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-extrabold text-[#70132C]">
              Theni District Delivery Zones &amp; Rates
            </h1>
            <p className="text-xs text-[#8C485A] mt-1">
              Configure serviceable delivery pincodes, delivery charges, and minimum order values.
            </p>
          </div>

          <button
            onClick={handleOpenNew}
            className="px-5 py-2.5 bg-[#990F35] text-white rounded-xl text-xs font-bold hover:bg-[#800A2A] flex items-center justify-center gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Delivery Pincode</span>
          </button>
        </div>

        {/* Zones Table */}
        <div className="bg-white rounded-3xl border border-[#F5D3DC] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFFDFB] border-b border-[#F5D3DC] text-[#8C485A] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Pincode</th>
                  <th className="py-3 px-4">Area / Locality in Theni</th>
                  <th className="py-3 px-4">Delivery Charge</th>
                  <th className="py-3 px-4">Minimum Order</th>
                  <th className="py-3 px-4">Service Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5D3DC]/60">
                {zones.map((zone) => (
                  <tr key={zone.pincode} className="hover:bg-[#FFFDFB]/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sm text-[#990F35]">
                      {zone.pincode}
                    </td>

                    <td className="py-3 px-4 font-bold text-[#70132C]">
                      {zone.area_name}
                    </td>

                    <td className="py-3 px-4 font-extrabold text-[#70132C]">
                      {formatINR(zone.delivery_charge_paise)}
                    </td>

                    <td className="py-3 px-4 text-[#8C485A]">
                      {formatINR(zone.minimum_order_paise)}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleServiceable(zone)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                          zone.is_serviceable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {zone.is_serviceable ? 'Serviceable' : 'Disabled'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(zone)}
                        className="p-1.5 rounded-lg border border-[#F5D3DC] text-[#70132C] hover:bg-[#FCE8ED]"
                        title="Edit Zone"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#F5D3DC] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F5D3DC] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#990F35]">
                {editingZone ? `Edit Zone ${editingZone.pincode}` : 'Add New Delivery Zone'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#70132C] mb-1">Pincode *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 625531"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-[#70132C] mb-1">
                  Area / Locality Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Theni Town & Main Bazaar"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#70132C] mb-1">
                    Delivery Charge (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={deliveryChargeRupees}
                    onChange={(e) => setDeliveryChargeRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#70132C] mb-1">
                    Min. Order Value (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={minimumOrderRupees}
                    onChange={(e) => setMinimumOrderRupees(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#70132C]">
                  <input
                    type="checkbox"
                    checked={isServiceable}
                    onChange={(e) => setIsServiceable(e.target.checked)}
                    className="rounded text-[#990F35]"
                  />
                  <span>Active &amp; Serviceable for Home Delivery</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F5D3DC]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#F5D3DC] rounded-xl text-[#70132C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#990F35] text-white font-bold rounded-xl shadow-md hover:bg-[#800A2A]"
                >
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

