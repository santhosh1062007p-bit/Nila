'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bike,
  Navigation,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Radio,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Package,
  Layers,
} from 'lucide-react';
import { DeliveryPartner, Order } from '@/types';
import { formatINR } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

export default function DeliveryPartnerPortal() {
  const { showToast } = useToast();

  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // GPS Streaming State
  const [isGpsStreaming, setIsGpsStreaming] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number; speed?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Load saved rider session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nilas_delivery_rider');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) setPartner(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch assigned deliveries
  const fetchAssignedOrders = useCallback(async (partnerId: string) => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/delivery/partner/orders?partner_id=${partnerId}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      showToast('Error loading assigned deliveries', 'error');
    } finally {
      setOrdersLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (partner?.id) {
      fetchAssignedOrders(partner.id);
      const interval = setInterval(() => fetchAssignedOrders(partner.id), 12000);
      return () => clearInterval(interval);
    }
  }, [partner?.id, fetchAssignedOrders]);

  // Handle Rider Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput || phoneInput.length < 10) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch('/api/delivery/partner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await res.json();
      if (res.ok && data.partner) {
        setPartner(data.partner);
        localStorage.setItem('nilas_delivery_rider', JSON.stringify(data.partner));
        showToast(`Welcome back, ${data.partner.name}!`, 'success');
      } else {
        showToast(data.message || 'Rider account not found', 'error');
      }
    } catch {
      showToast('Failed to connect to bakery server', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    stopGpsTracking();
    localStorage.removeItem('nilas_delivery_rider');
    setPartner(null);
    setOrders([]);
    showToast('Logged out from Delivery Partner Portal', 'info');
  };

  // Start real-time browser Geolocation watchPosition
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsError(null);
    setIsGpsStreaming(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        setGpsCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy), speed: speed ? Math.round(speed * 3.6) : 0 });

        // Broadcast to server for each active assigned order
        if (orders.length > 0 && partner?.id) {
          for (const ord of orders) {
            try {
              await fetch('/api/delivery/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order_id: ord.id,
                  partner_id: partner.id,
                  lat: latitude,
                  lng: longitude,
                  accuracy: accuracy || null,
                  speed: speed || null,
                  heading: heading || null,
                }),
              });
            } catch {
              // ignore transient errors
            }
          }
        }
      },
      (err) => {
        console.warn('[GPS Watch Error]:', err);
        setGpsError('GPS permission was denied or signal is weak. Please enable location.');
        setIsGpsStreaming(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
      }
    );
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsStreaming(false);
    setGpsCoords(null);
  };

  // Update Status Handler
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!partner?.id) return;
    try {
      const res = await fetch('/api/delivery/partner/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          partner_id: partner.id,
          new_status: newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Order status updated to: ${newStatus}`, 'success');
        fetchAssignedOrders(partner.id);
      } else {
        showToast(data.message || 'Failed to update order status', 'error');
      }
    } catch {
      showToast('Network error updating status', 'error');
    }
  };

  // 1. LOGIN SCREEN
  if (!partner) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-rose-100 p-6 sm:p-8">
          <div className="w-16 h-16 bg-rose-50 text-rose-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <Bike className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-black text-rose-950 text-center tracking-tight">
            Nila&apos;s Treat Delivery Partner
          </h1>
          <p className="text-sm text-gray-700 text-center mt-1 mb-6">
            Enter your registered rider mobile number to view assigned cake deliveries and broadcast live GPS.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Rider Mobile Number
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. 9842100111"
                maxLength={10}
                required
                className="w-full px-4 py-3 bg-stone-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white text-base tracking-wide"
              />
              <span className="text-[11px] text-gray-700 mt-1 block">
                Test Accounts: 9842100111 (Suresh Kumar) or 9842200222 (Muthu Pandi)
              </span>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {loginLoading ? 'Verifying Rider...' : 'Login to Rider Portal'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authorized Nila&apos;s Treat Delivery Fleet</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. RIDER DASHBOARD
  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* Rider Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-rose-950 text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-rose-800/80 rounded-xl flex items-center justify-center text-rose-200 border border-rose-700">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight">{partner.name}</div>
              <div className="text-[11px] text-rose-300 font-medium">
                {partner.vehicle_number} • {partner.vehicle_type.toUpperCase()}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-rose-300 hover:text-white hover:bg-rose-900/60 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* GPS Broadcast Controller Banner */}
        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isGpsStreaming ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="h-3 w-3 rounded-full bg-gray-300"></span>
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Live GPS Broadcast
              </span>
            </div>

            <button
              onClick={isGpsStreaming ? stopGpsTracking : startGpsTracking}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                isGpsStreaming
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              {isGpsStreaming ? 'Pause GPS' : 'Start Live GPS'}
            </button>
          </div>

          {gpsError ? (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{gpsError}</span>
            </div>
          ) : isGpsStreaming && gpsCoords ? (
            <div className="grid grid-cols-3 gap-2 text-center bg-stone-50 rounded-xl p-2.5 border border-stone-200 text-xs">
              <div>
                <div className="text-[10px] text-gray-700 font-bold uppercase">Accuracy</div>
                <div className="font-bold text-gray-800">±{gpsCoords.accuracy || 10} m</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-700 font-bold uppercase">Speed</div>
                <div className="font-bold text-gray-800">{gpsCoords.speed || 0} km/h</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-700 font-bold uppercase">Status</div>
                <div className="font-bold text-emerald-600">Broadcasting</div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-700">
              Turn on Live GPS when leaving the bakery kitchen so customers can watch your vehicle move live on their map.
            </p>
          )}
        </div>

        {/* Assigned Orders Section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-1.5">
              <Package className="w-4 h-4 text-rose-600" />
              Assigned Cake Deliveries ({orders.length})
            </h2>
            <button
              onClick={() => partner?.id && fetchAssignedOrders(partner.id)}
              className="text-xs text-rose-700 font-semibold hover:underline"
            >
              Refresh
            </button>
          </div>

          {ordersLoading && orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-rose-50 text-xs text-gray-700">
              Checking assigned orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-rose-50 p-6 shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h3 className="text-sm font-bold text-gray-900">All Deliveries Complete!</h3>
              <p className="text-xs text-gray-700 mt-1">
                You have no pending deliveries right now. New assignments from the owner will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const addr = ord.delivery_address_snapshot;
                const fullAddressString = `${addr?.address_line1 || ''}, ${addr?.address_line2 || ''}, ${addr?.city || 'Theni'} ${addr?.pincode || ''}`;
                const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddressString)}`;

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 sm:p-5 space-y-4 transition-all hover:shadow-md"
                  >
                    {/* Order Code & Status Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-rose-50 pb-3">
                      <div>
                        <div className="text-xs font-bold text-rose-800 tracking-wider">ORDER CODE</div>
                        <div className="text-base font-black text-gray-900">{ord.order_code}</div>
                        <div className="text-[11px] text-gray-700 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          Delivery Slot: {ord.delivery_slot || 'Standard'}
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {ord.order_status}
                      </span>
                    </div>

                    {/* Customer & Destination Card */}
                    <div className="bg-stone-50 rounded-xl p-3 border border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-gray-900">{ord.customer_name}</div>
                        <a
                          href={`tel:${ord.customer_phone}`}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100"
                        >
                          <Phone className="w-3 h-3" />
                          Call Customer
                        </a>
                      </div>

                      <div className="flex items-start gap-1.5 text-xs text-gray-700">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{fullAddressString}</span>
                      </div>

                      <a
                        href={gmapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline pt-1"
                      >
                        <Navigation className="w-3 h-3" />
                        Open in Google Maps Navigation
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    {/* Cake Items & Bill Summary */}
                    <div className="space-y-1.5 text-xs text-gray-700">
                      <div className="font-bold text-gray-800 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-rose-600" />
                        Cake Items:
                      </div>
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between pl-4">
                          <span>
                            {it.quantity}x {it.product_name} ({it.weight_kg} Kg{it.eggless ? ', Eggless' : ''})
                          </span>
                          <span className="font-semibold text-gray-900">{formatINR(it.line_total_paise)}</span>
                        </div>
                      ))}

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="font-bold text-gray-900">Total Collectible:</span>
                        <div className="text-right">
                          <span className="font-black text-sm text-rose-950">{formatINR(ord.total_paise)}</span>
                          <span className={`block text-[10px] font-bold ${ord.payment_method === 'cod' ? 'text-amber-800' : 'text-emerald-700'}`}>
                            {ord.payment_method === 'cod' ? 'Collect Cash on Delivery (COD)' : 'Paid Online (Razorpay)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rider Status Action Buttons */}
                    <div className="pt-2 border-t border-rose-50 grid grid-cols-2 gap-2">
                      {ord.order_status !== 'Picked Up' && ord.order_status !== 'Out for Delivery' && ord.order_status !== 'Arriving Soon' && (
                        <button
                          onClick={() => handleUpdateStatus(ord.id, 'Picked Up')}
                          className="py-2.5 px-3 bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                        >
                          1. Picked Up from Bakery
                        </button>
                      )}

                      {ord.order_status !== 'Out for Delivery' && ord.order_status !== 'Arriving Soon' && (
                        <button
                          onClick={() => {
                            handleUpdateStatus(ord.id, 'Out for Delivery');
                            if (!isGpsStreaming) startGpsTracking();
                          }}
                          className="py-2.5 px-3 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          2. Out for Delivery
                        </button>
                      )}

                      {ord.order_status === 'Out for Delivery' && (
                        <button
                          onClick={() => handleUpdateStatus(ord.id, 'Arriving Soon')}
                          className="py-2.5 px-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          3. Nearby / Arriving Soon
                        </button>
                      )}

                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'Delivered')}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm col-span-2"
                      >
                        ✓ Mark Cake Delivered
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
