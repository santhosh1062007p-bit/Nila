'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import { Save } from 'lucide-react';
import { StoreSettings } from '@/types';
import { useToast } from '@/context/ToastContext';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.settings) setSettings(data.settings);
      })
      .catch((e) => console.error(e));

    return () => {
      active = false;
    };
  }, []);

  useRealtimeSubscription('STORE_SETTINGS_UPDATED', (event) => {
    const updated = event.data as StoreSettings;
    if (updated) {
      setSettings(updated);
    } else {
      loadSettings();
    }
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        showToast('Store settings updated and synchronized across website!', 'success');
      } else {
        showToast('Failed to update store settings', 'error');
      }
    } catch {
      showToast('Error saving settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#FFFDFB]">
        <AdminNav />
        <div className="py-20 text-center text-xs font-semibold text-[#8C485A]">
          Loading store settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDFB]">
      <AdminNav />

      <main className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 space-y-6">
        
        <div>
          <h1 className="font-serif text-3xl font-extrabold text-[#70132C]">
            Store Brand &amp; Operational Settings
          </h1>
          <p className="text-xs text-[#8C485A] mt-1">
            Configure contact numbers, verified shop address, eggless surcharge, and payment options.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-[#F5D3DC] p-6 sm:p-10 shadow-sm space-y-6">
          
          {/* Brand Identity */}
          <div className="space-y-4">
            <h2 className="font-serif text-base font-bold text-[#990F35] border-b border-[#F5D3DC] pb-2">
              Brand Identity &amp; Location
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#70132C] mb-1">Business Name</label>
                <input
                  type="text"
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#70132C] mb-1">Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#70132C] mb-1">
                  Verified Bakery Shop Address
                </label>
                <input
                  type="text"
                  value={settings.shop_address}
                  onChange={(e) => setSettings({ ...settings, shop_address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
                <p className="text-[10px] text-[#8C485A] mt-1">
                  This address is shown to customers selecting &ldquo;Store Pickup&rdquo;. Never invented!
                </p>
              </div>
            </div>
          </div>

          {/* Contact Numbers & Socials */}
          <div className="space-y-4 pt-2">
            <h2 className="font-serif text-base font-bold text-[#990F35] border-b border-[#F5D3DC] pb-2">
              Contact Numbers &amp; Social Links
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#70132C] mb-1">
                  Primary Mobile Number
                </label>
                <input
                  type="text"
                  value={settings.primary_phone}
                  onChange={(e) => setSettings({ ...settings, primary_phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#70132C] mb-1">
                  Secondary Mobile Number
                </label>
                <input
                  type="text"
                  value={settings.secondary_phone}
                  onChange={(e) => setSettings({ ...settings, secondary_phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#70132C] mb-1">Instagram Handle</label>
                <input
                  type="text"
                  value={settings.instagram_handle}
                  onChange={(e) => setSettings({ ...settings, instagram_handle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#70132C] mb-1">Facebook Page</label>
                <input
                  type="text"
                  value={settings.facebook_page}
                  onChange={(e) => setSettings({ ...settings, facebook_page: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C]"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Operations Policy */}
          <div className="space-y-4 pt-2">
            <h2 className="font-serif text-base font-bold text-[#990F35] border-b border-[#F5D3DC] pb-2">
              Bakery Operational Controls
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#70132C] mb-1">
                  Global Eggless Extra Surcharge (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settings.global_eggless_surcharge_paise / 100}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      global_eggless_surcharge_paise: parseInt(e.target.value, 10) * 100 || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#F5D3DC] text-[#70132C] font-bold"
                />
                <p className="text-[10px] text-[#8C485A] mt-1">Default is ₹200</p>
              </div>

              <div className="flex flex-col justify-center space-y-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#70132C]">
                  <input
                    type="checkbox"
                    checked={settings.is_pickup_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, is_pickup_enabled: e.target.checked })
                    }
                    className="rounded text-[#990F35]"
                  />
                  <span>Enable &ldquo;Shop Pickup&rdquo; Checkout Option</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#70132C]">
                  <input
                    type="checkbox"
                    checked={settings.is_cod_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, is_cod_enabled: e.target.checked })
                    }
                    className="rounded text-[#990F35]"
                  />
                  <span>Enable &ldquo;Cash on Delivery&rdquo; (COD)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F5D3DC] flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-[#990F35] hover:bg-[#800A2A] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Settings...' : 'Save & Synchronize Settings'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

