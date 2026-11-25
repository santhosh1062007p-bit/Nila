'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import { Plus, X, Edit2, Bike, ExternalLink, ShieldCheck } from 'lucide-react';
import { DeliveryZone, DeliveryPartner } from '@/types';
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

  // Delivery Fleet State
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerVehicle, setPartnerVehicle] = useState('');
  const [vehicleType, setVehicleType] = useState<'bike' | 'scooter' | 'van'>('bike');

  const loadPartners = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery/partners', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPartners(data.partners || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

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
    loadPartners();
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

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim() || !partnerPhone.trim() || !partnerVehicle.trim()) {
      showToast('All rider details are required', 'error');
      return;
    }
    try {
      const res = await fetch('/api/delivery/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: partnerName,
          phone: partnerPhone,
          vehicle_number: partnerVehicle,
          vehicle_type: vehicleType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Rider ${partnerName} registered successfully!`, 'success');
        setIsPartnerModalOpen(false);
        setPartnerName('');
        setPartnerPhone('');
        setPartnerVehicle('');
        loadPartners();
      } else {
        showToast(data.message || 'Failed to add rider', 'error');
      }
    } catch {
      showToast('Network error saving rider', 'error');
    }
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
    loadPartners();
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

        {/* Delivery Fleet Section */}
        <div className="bg-white rounded-3xl border border-[#F5D3DC] p-6 sm:p-8 space-y-6 shadow-xs mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#70132C] flex items-center gap-2">
                <Bike className="w-5 h-5 text-[#8F1237]" />
                Delivery Fleet &amp; Live Riders ({partners.length})
              </h2>
              <p className="text-xs text-[#8C485A] mt-1">
                Authorized riders who receive assigned cake deliveries and broadcast live GPS location to customers.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href="/delivery"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 rounded-xl font-bold text-xs shadow-xs"
              >
                <span>Open Rider App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setIsPartnerModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#8F1237] hover:bg-[#70132C] text-white rounded-xl font-bold text-xs shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Delivery Rider</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF6F0] border-b border-[#F5D3DC] text-[#70132C] font-bold">
                <tr>
                  <th className="py-3 px-4">Rider Name</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Vehicle Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last GPS Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5D3DC]/60">
                {partners.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FFFDFB]/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#70132C]">
                      {p.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#990F35]">
                      {p.phone}
                    </td>
                    <td className="py-3 px-4 text-[#70132C]">
                      <span className="font-semibold">{p.vehicle_number}</span> ({p.vehicle_type.toUpperCase()})
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        Active Fleet
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#8C485A]">
                      {p.last_location_updated_at
                        ? new Date(p.last_location_updated_at).toLocaleTimeString()
                        : 'Active'}
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

      {/* Add Delivery Rider Modal */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#F5D3DC] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F5D3DC] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#990F35]">
                Register Delivery Rider
              </h3>
              <button onClick={() => setIsPartnerModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#70132C] mb-1">Rider Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anandha Kumar"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#70132C] mb-1">Mobile Number (Rider Login) *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9842100333"
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] font-mono font-bold"
                />
                <p className="text-[10px] text-stone-500 mt-1">The rider logs in to /delivery using this 10-digit number.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#70132C] mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TN-60-AZ-1234"
                    value={partnerVehicle}
                    onChange={(e) => setPartnerVehicle(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#70132C] mb-1">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#70132C] font-bold bg-white"
                  >
                    <option value="bike">Motorcycle (Bike)</option>
                    <option value="scooter">Scooter</option>
                    <option value="van">Van / Mini Truck</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#F5D3DC]">
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
                  className="px-4 py-2 border border-[#F5D3DC] rounded-xl text-[#70132C] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#990F35] text-white font-bold rounded-xl shadow-md hover:bg-[#800A2A]"
                >
                  Register Rider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

