'use client';

import React, { useState } from 'react';
import { X, Home, Briefcase, MapPin } from 'lucide-react';
import { Address, AddressType } from '@/types';

interface AddressFormModalProps {
  open: boolean;
  initialAddress?: Address | null;
  defaultRecipientName?: string;
  defaultPhone?: string;
  onClose: () => void;
  onSaved: (saved: Address, isEdit: boolean) => void;
}

export default function AddressFormModal({
  open,
  initialAddress,
  defaultRecipientName = '',
  defaultPhone = '',
  onClose,
  onSaved,
}: AddressFormModalProps) {
  const isEdit = Boolean(initialAddress?.id);

  const [addressType, setAddressType] = useState<AddressType>(
    initialAddress?.address_type ||
      (initialAddress?.label === 'Work' || initialAddress?.label === 'Other'
        ? initialAddress.label
        : 'Home')
  );
  const [recipientName, setRecipientName] = useState(
    initialAddress?.recipient_name || defaultRecipientName
  );
  const [phone, setPhone] = useState(initialAddress?.phone || defaultPhone);
  const [alternatePhone, setAlternatePhone] = useState(initialAddress?.alternate_phone || '');
  const [houseNo, setHouseNo] = useState(
    initialAddress?.house_no || initialAddress?.address_line1 || ''
  );
  const [streetName, setStreetName] = useState(
    initialAddress?.street_name || initialAddress?.address_line2 || ''
  );
  const [areaLocality, setAreaLocality] = useState(
    initialAddress?.area_locality || initialAddress?.city || ''
  );
  const [landmark, setLandmark] = useState(initialAddress?.landmark || '');
  const [city, setCity] = useState(initialAddress?.city || 'Theni');
  const [district, setDistrict] = useState(initialAddress?.district || 'Theni');
  const [state, setState] = useState(initialAddress?.state || 'Tamil Nadu');
  const [pincode, setPincode] = useState(initialAddress?.pincode || '');
  const [isDefault, setIsDefault] = useState(Boolean(initialAddress?.is_default));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const normalizeDigits = (val: string) => {
    const d = val.replace(/[^0-9]/g, '');
    if (d.length === 12 && d.startsWith('91')) return d.slice(2);
    return d;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanPhone = normalizeDigits(phone);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    const cleanAlt = alternatePhone.trim() ? normalizeDigits(alternatePhone) : '';
    if (cleanAlt && !/^[6-9]\d{9}$/.test(cleanAlt)) {
      setError('Alternate mobile number must be a valid 10-digit Indian number.');
      return;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      setError('Enter a valid 6-digit PIN code.');
      return;
    }

    if (houseNo.trim().length < 1 || streetName.trim().length < 2) {
      setError('House / Flat number and Street name are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        address_type: addressType,
        label: addressType,
        recipient_name: recipientName.trim(),
        phone: cleanPhone,
        alternate_phone: cleanAlt || null,
        house_no: houseNo.trim(),
        street_name: streetName.trim(),
        area_locality: areaLocality.trim() || city.trim(),
        address_line1: `${houseNo.trim()}, ${streetName.trim()}`,
        address_line2: areaLocality.trim() || undefined,
        city: city.trim() || 'Theni',
        district: district.trim() || city.trim() || 'Theni',
        state: state.trim() || 'Tamil Nadu',
        pincode: pincode.trim(),
        landmark: landmark.trim() || undefined,
        is_default: isDefault,
      };

      const url = isEdit && initialAddress ? `/api/addresses/${initialAddress.id}` : '/api/addresses';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.address) {
        setError(data.message || 'Could not save address.');
        return;
      }

      onSaved(data.address as Address, isEdit);
    } catch {
      setError('Network error while saving address.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white border border-[#F5D3DC] shadow-2xl p-5 sm:p-7 my-auto max-h-[92vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between border-b border-[#F5D3DC]/70 pb-3.5">
          <div>
            <h3 id="address-modal-title" className="font-serif text-xl font-extrabold text-[#70132C]">
              {isEdit ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </h3>
            <p className="text-xs text-[#8C485A] mt-0.5">
              Used for fast checkout auto-fill across Theni &amp; serviceable areas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close address form"
            className="p-2 rounded-full text-[#8C485A] hover:bg-[#FFF6F0]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Address Type */}
          <div>
            <span className="block text-xs font-bold text-[#70132C] mb-1.5">Address Type *</span>
            <div className="flex flex-wrap gap-2">
              {(['Home', 'Work', 'Other'] as AddressType[]).map((typeOption) => {
                const Icon =
                  typeOption === 'Home' ? Home : typeOption === 'Work' ? Briefcase : MapPin;
                const active = addressType === typeOption;
                return (
                  <button
                    key={typeOption}
                    type="button"
                    onClick={() => setAddressType(typeOption)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                      active
                        ? 'bg-[#8F1237] text-white border-[#8F1237] shadow-xs'
                        : 'bg-[#FFFDFB] text-[#70132C] border-[#F5D3DC] hover:border-[#8F1237]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{typeOption}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="addr-name" className="block text-xs font-bold text-[#70132C] mb-1">
                Full Name *
              </label>
              <input
                id="addr-name"
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Recipient full name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div>
              <label htmlFor="addr-phone" className="block text-xs font-bold text-[#70132C] mb-1">
                Mobile Number (10 digits) *
              </label>
              <input
                id="addr-phone"
                type="tel"
                required
                maxLength={13}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div>
              <label htmlFor="addr-alt-phone" className="block text-xs font-bold text-[#70132C] mb-1">
                Alternate Mobile Number (Optional)
              </label>
              <input
                id="addr-alt-phone"
                type="tel"
                maxLength={13}
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                placeholder="Optional backup number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div>
              <label htmlFor="addr-pincode" className="block text-xs font-bold text-[#70132C] mb-1">
                PIN Code (6 digits) *
              </label>
              <input
                id="addr-pincode"
                type="text"
                required
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 625531"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div>
              <label htmlFor="addr-house" className="block text-xs font-bold text-[#70132C] mb-1">
                House / Flat / Building No. *
              </label>
              <input
                id="addr-house"
                type="text"
                required
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
                placeholder="e.g. Door No. 14/2, Sri Nilayam"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div>
              <label htmlFor="addr-street" className="block text-xs font-bold text-[#70132C] mb-1">
                Street Name *
              </label>
              <input
                id="addr-street"
                type="text"
                required
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                placeholder="e.g. Gandhi Nagar 2nd Cross"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div>
              <label htmlFor="addr-area" className="block text-xs font-bold text-[#70132C] mb-1">
                Area / Locality *
              </label>
              <input
                id="addr-area"
                type="text"
                required
                value={areaLocality}
                onChange={(e) => setAreaLocality(e.target.value)}
                placeholder="e.g. Allinagaram"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div>
              <label htmlFor="addr-landmark" className="block text-xs font-bold text-[#70132C] mb-1">
                Landmark (Optional)
              </label>
              <input
                id="addr-landmark"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Collectorate"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div>
              <label htmlFor="addr-city" className="block text-xs font-bold text-[#70132C] mb-1">
                City *
              </label>
              <input
                id="addr-city"
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Theni"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div>
              <label htmlFor="addr-district" className="block text-xs font-bold text-[#70132C] mb-1">
                District *
              </label>
              <input
                id="addr-district"
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Theni"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="addr-state" className="block text-xs font-bold text-[#70132C] mb-1">
                State *
              </label>
              <input
                id="addr-state"
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Tamil Nadu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#70132C] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 accent-[#8F1237]"
            />
            <span>Set as default delivery address</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F5D3DC]/70">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[#F5D3DC] text-xs font-bold text-[#70132C] hover:bg-[#FFF6F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-full bg-[#8F1237] hover:bg-[#750E2D] text-white text-xs font-bold shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEdit ? 'Update Address' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
