'use client';

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import {
  Search,
  ShoppingBag,
  RefreshCw,
  BellRing,
  X,
  Bike,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus, DeliveryPartner } from '@/types';
import { formatINR } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

// Helper sound notification when a new order arrives
function playNotificationChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch {
    // AudioContext blocked or not supported, ignore silently
  }
}

export default function AdminOrdersPage() {
  const { showToast } = useToast();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery/partners');
      if (res.ok) {
        const data = await res.json();
        setDeliveryPartners(data.partners || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAssignPartner = async (orderId: string, partnerId: string) => {
    try {
      const res = await fetch('/api/delivery/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, partner_id: partnerId }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        showToast(data.message || 'Delivery assigned successfully', 'success');
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
      } else {
        showToast(data.message || 'Failed to assign delivery', 'error');
      }
    } catch {
      showToast('Network error assigning partner', 'error');
    }
  };

  const prevOrderCountRef = useRef<number | null>(null);

  const loadOrders = useCallback(async (isSilent = false) => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          const fetchedOrders: Order[] = data.orders;

          // Detect new incoming orders
          if (
            !isSilent &&
            prevOrderCountRef.current !== null &&
            fetchedOrders.length > prevOrderCountRef.current
          ) {
            const newest = fetchedOrders[0];
            playNotificationChime();
            setNewOrderAlert(
              `New Order Received: #${newest.order_code} from ${newest.customer_name} (${formatINR(newest.total_paise)})`
            );
            showToast(`New order #${newest.order_code} received!`, 'success');
          }

          prevOrderCountRef.current = fetchedOrders.length;
          setOrders(fetchedOrders);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLastRefreshed(new Date());
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    fetch('/api/orders', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.orders) {
          setOrders(data.orders);
          prevOrderCountRef.current = data.orders.length;
        }
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (active) setLastRefreshed(new Date());
      });

    fetchPartners();
    const interval = setInterval(() => loadOrders(true), 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [loadOrders]);

  // Instant real-time order arrival & status synchronization
  useRealtimeSubscription(
    ['ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'ORDER_PAYMENT_STATUS_CHANGED'],
    (event) => {
      if (event.type === 'ORDER_CREATED') {
        const newOrder = event.data as Order;
        if (newOrder && newOrder.id) {
          playNotificationChime();
          setNewOrderAlert(
            `Instant New Order: #${newOrder.order_code} from ${newOrder.customer_name} (${formatINR(newOrder.total_paise)})`
          );
          showToast(`New order #${newOrder.order_code} received instantly!`, 'success');
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
          prevOrderCountRef.current = (prevOrderCountRef.current || 0) + 1;
        } else {
          loadOrders();
        }
      } else if (event.type === 'ORDER_STATUS_CHANGED' || event.type === 'ORDER_PAYMENT_STATUS_CHANGED') {
        const payload = event.data as {
          orderId?: string;
          status?: OrderStatus;
          paymentStatus?: PaymentStatus;
          order?: Order;
        };
        const orderId = payload?.orderId || payload?.order?.id;
        if (orderId) {
          setOrders((prev) =>
            prev.map((o) => {
              if (o.id !== orderId) return o;
              return {
                ...o,
                order_status: payload.status || payload.order?.order_status || o.order_status,
                payment_status:
                  payload.paymentStatus || payload.order?.payment_status || o.payment_status,
              };
            })
          );
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder((prev) =>
              prev
                ? {
                    ...prev,
                    order_status: payload.status || payload.order?.order_status || prev.order_status,
                    payment_status:
                      payload.paymentStatus ||
                      payload.order?.payment_status ||
                      prev.payment_status,
                  }
                : null
            );
          }
        } else {
          loadOrders(true);
        }
      }
    }
  );

  const formatExactDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getTimeAgo = (isoString: string) => {
    try {
      const diffMs = lastRefreshed.getTime() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 45) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${Math.floor(diffHr / 24)}d ago`;
    } catch {
      return '';
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Status updated to "${newStatus}"`, 'success');
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
        );
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, order_status: newStatus } : null));
        }
      }
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: paymentStatus }),
      });
      if (res.ok) {
        showToast(`Payment recorded as "${paymentStatus.toUpperCase()}"`, 'success');
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, payment_status: paymentStatus } : o))
        );
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, payment_status: paymentStatus } : null));
        }
      }
    } catch {
      showToast('Failed to record payment', 'error');
    }
  };

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.order_status === statusFilter;
    const matchSearch =
      !searchQuery.trim() ||
      o.order_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_phone.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#FFFDFB]">
      <AdminNav />

      <main className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 space-y-6">
        
        {/* Real-time Order Alert Banner */}
        {newOrderAlert && (
          <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <BellRing className="w-5 h-5 animate-bounce" />
              <span>{newOrderAlert}</span>
            </div>
            <button
              onClick={() => setNewOrderAlert(null)}
              className="p-1 hover:bg-white/20 rounded-lg text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header & Live Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#70132C]">
                Customer Orders
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live (2.5s)
              </span>
            </div>
            <p className="text-xs text-[#8C485A] mt-1">
              Customer orders appear instantly with exact time stamps and ordered cake details.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#8C485A]" suppressHydrationWarning>
              Live: {mounted ? lastRefreshed.toLocaleTimeString() : 'Connecting...'}
            </span>
            <button
              onClick={() => {
                loadOrders(false);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#F5D3DC] hover:border-[#8F1237] text-[#8F1237] rounded-xl text-xs font-bold shadow-xs active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-[#F5D3DC] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Search by code, customer or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#F5D3DC] text-[#33252A] focus:outline-none focus:border-[#8F1237]"
            />
            <Search className="w-3.5 h-3.5 text-[#8C485A] absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold no-scrollbar py-1">
            {[
              'all',
              'Order Placed',
              'Order Confirmed',
              'Baking in Progress',
              'Cake Ready',
              'Ready for Pickup',
              'Out for Delivery',
              'Delivered',
            ].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-[#8F1237] text-white shadow-xs'
                    : 'bg-[#FFFDFB] text-[#70132C] border border-[#F5D3DC] hover:border-[#8F1237]'
                }`}
              >
                {st === 'all' ? 'All Orders' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List Container */}
        <div className="bg-white rounded-3xl border border-[#F5D3DC] shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ShoppingBag className="w-8 h-8 text-[#8C485A] mx-auto opacity-50" />
              <p className="font-serif font-bold text-base text-[#70132C]">
                No orders match your filter
              </p>
              <p className="text-xs text-[#8C485A]">
                When customers place an order, it will appear here immediately with exact time details.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table (>=768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FFF6F0] border-b border-[#F5D3DC] text-[#70132C] font-bold">
                    <tr>
                      <th className="py-3.5 px-4">Order Code &amp; Time</th>
                      <th className="py-3.5 px-4">Customer Details</th>
                      <th className="py-3.5 px-4">Items Ordered</th>
                      <th className="py-3.5 px-4">Total Amount</th>
                      <th className="py-3.5 px-4">Payment</th>
                      <th className="py-3.5 px-4">Status &amp; Rider</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5D3DC]/60">
                    {filtered.map((order) => (
                      <tr key={order.id} className="hover:bg-[#FFFDFC] transition-colors">
                        
                        {/* Order Code & Timestamp */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#8F1237] block font-mono text-sm">
                            #{order.order_code}
                          </span>
                          <span className="block text-[11px] font-semibold text-[#33252A] mt-0.5">
                            {formatExactDateTime(order.created_at)}
                          </span>
                          <span className="inline-block text-[10px] text-[#8C485A] font-bold">
                            ({getTimeAgo(order.created_at)})
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#70132C] block">
                            {order.customer_name}
                          </span>
                          <span className="text-[#8C485A] font-mono text-[11px]">
                            {order.customer_phone}
                          </span>
                          <span className="block text-[10px] text-[#70132C]/70 capitalize">
                            {order.fulfilment_type === 'delivery'
                              ? `Delivery (${order.delivery_pincode || 'Theni'})`
                              : 'Shop Pickup'}
                          </span>
                        </td>

                        {/* Items Preview */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-xs">
                            {order.items?.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-[11px] leading-tight">
                                <span className="font-bold text-[#33252A]">{item.quantity}x {item.product_name}</span>
                                <span className="text-[#8C485A] text-[10px] ml-1">
                                  ({item.weight_kg} Kg{item.eggless ? ', Eggless' : ''})
                                </span>
                              </div>
                            ))}
                            {order.items?.length > 2 && (
                              <span className="text-[10px] text-[#8F1237] font-bold">
                                +{order.items.length - 2} more items
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-4 font-black text-sm text-[#70132C]">
                          {formatINR(order.total_paise)}
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-4">
                          <span className="capitalize block font-semibold text-[11px] text-[#33252A]">
                            {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'}
                          </span>
                          <button
                            onClick={() =>
                              handleUpdatePaymentStatus(
                                order.id,
                                order.payment_status === 'paid' ? 'pending' : 'paid'
                              )
                            }
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 transition-all ${
                              order.payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                            title="Click to toggle status"
                          >
                            {order.payment_status.toUpperCase()}
                          </button>
                        </td>

                        {/* Status Select & Delivery Partner */}
                        <td className="py-3.5 px-4 space-y-1.5 min-w-[190px]">
                          <select
                            value={order.order_status}
                            onChange={(e) =>
                              handleUpdateStatus(order.id, e.target.value as OrderStatus)
                            }
                            className="w-full bg-[#FFFDFB] text-xs font-bold text-[#8F1237] border border-[#F5D3DC] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#8F1237]"
                          >
                            <option value="Order Placed">Order Placed</option>
                            <option value="Payment Confirmed">Payment Confirmed</option>
                            <option value="Order Accepted">Order Accepted</option>
                            <option value="Baking in Progress">Baking in Progress</option>
                            <option value="Cake Ready">Cake Ready</option>
                            <option value="Ready for Pickup">Ready for Pickup</option>
                            <option value="Delivery Partner Assigned">Delivery Partner Assigned</option>
                            <option value="Picked Up">Picked Up</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Arriving Soon">Arriving Soon</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>

                          {order.fulfilment_type === 'delivery' && (
                            <div className="flex items-center gap-1">
                              <select
                                value={order.delivery_partner_id || ''}
                                onChange={(e) => handleAssignPartner(order.id, e.target.value)}
                                className="text-[11px] font-semibold text-gray-800 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 w-full"
                              >
                                <option value="">Assign Rider...</option>
                                {deliveryPartners.map((dp) => (
                                  <option key={dp.id} value={dp.id}>
                                    {dp.name} ({dp.vehicle_number})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>

                        {/* View Button */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1.5 bg-[#FFF6F0] hover:bg-[#8F1237] hover:text-white border border-[#F5D3DC] text-[#8F1237] rounded-lg font-bold text-xs transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards (<768px) */}
              <div className="md:hidden divide-y divide-[#F5D3DC]">
                {filtered.map((order) => (
                  <div key={order.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-sm text-[#8F1237]">
                          #{order.order_code}
                        </span>
                        <span className="block text-[11px] text-[#33252A]">
                          {formatExactDateTime(order.created_at)}
                        </span>
                      </div>
                      <span className="font-black text-sm text-[#70132C]">
                        {formatINR(order.total_paise)}
                      </span>
                    </div>

                    <div className="bg-[#FFF6F0] p-3 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-[#70132C]">{order.customer_name} • {order.customer_phone}</p>
                      <p className="text-[11px] text-[#8C485A]">
                        {order.fulfilment_type === 'delivery'
                          ? `Delivery to ${order.delivery_pincode || 'Theni'}`
                          : 'Shop Pickup'}
                      </p>
                      <div className="pt-1 border-t border-[#F5D3DC]/60 text-[11px] text-[#33252A]">
                        {order.items?.map((item, idx) => (
                          <div key={idx}>
                            • {item.quantity}x {item.product_name} ({item.weight_kg} Kg{item.eggless ? ', Eggless' : ''})
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={order.order_status}
                          onChange={(e) =>
                            handleUpdateStatus(order.id, e.target.value as OrderStatus)
                          }
                          className="flex-1 bg-[#FFFDFB] text-xs font-bold text-[#8F1237] border border-[#F5D3DC] rounded-lg px-2.5 py-1.5 focus:outline-none"
                        >
                          <option value="Order Placed">Order Placed</option>
                          <option value="Payment Confirmed">Payment Confirmed</option>
                          <option value="Order Accepted">Order Accepted</option>
                          <option value="Baking in Progress">Baking in Progress</option>
                          <option value="Cake Ready">Cake Ready</option>
                          <option value="Ready for Pickup">Ready for Pickup</option>
                          <option value="Delivery Partner Assigned">Delivery Partner Assigned</option>
                          <option value="Picked Up">Picked Up</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Arriving Soon">Arriving Soon</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>

                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3.5 py-1.5 bg-[#8F1237] text-white rounded-lg font-bold text-xs shrink-0"
                        >
                          Details
                        </button>
                      </div>

                      {order.fulfilment_type === 'delivery' && (
                        <select
                          value={order.delivery_partner_id || ''}
                          onChange={(e) => handleAssignPartner(order.id, e.target.value)}
                          className="w-full text-[11px] font-semibold text-gray-800 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1.5"
                        >
                          <option value="">Assign Delivery Rider...</option>
                          {deliveryPartners.map((dp) => (
                            <option key={dp.id} value={dp.id}>
                              {dp.name} ({dp.vehicle_number})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Detailed Order Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
              
              <div className="flex items-center justify-between border-b border-[#F5D3DC] pb-4">
                <div>
                  <span className="text-xs font-bold uppercase text-[#8F1237]">Order Details</span>
                  <h3 className="font-serif text-2xl font-bold text-[#70132C]">
                    #{selectedOrder.order_code}
                  </h3>
                  <p className="text-xs text-[#33252A] mt-0.5">
                    <strong>Placed At:</strong> {formatExactDateTime(selectedOrder.created_at)} ({getTimeAgo(selectedOrder.created_at)})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-full hover:bg-stone-100 text-[#8C485A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Customer and Fulfilment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#FFF6F0] p-4 rounded-2xl border border-[#F5D3DC]">
                <div>
                  <span className="font-bold text-[#8C485A] block uppercase text-[10px]">Customer</span>
                  <p className="font-bold text-sm text-[#70132C] mt-0.5">{selectedOrder.customer_name}</p>
                  <p className="font-mono text-[#70132C]">{selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && <p className="text-[#8C485A]">{selectedOrder.customer_email}</p>}
                </div>
                <div>
                  <span className="font-bold text-[#8C485A] block uppercase text-[10px]">Fulfilment &amp; Timing</span>
                  <p className="font-semibold text-[#70132C] capitalize mt-0.5">{selectedOrder.fulfilment_type}</p>
                  <p className="text-[#8C485A]">{selectedOrder.delivery_date}</p>
                  <p className="text-[#8C485A]">{selectedOrder.delivery_slot}</p>
                </div>
              </div>

              {/* Address snapshot if delivery */}
              {selectedOrder.delivery_address_snapshot && (
                <div className="text-xs bg-white p-4 rounded-2xl border border-[#F5D3DC]">
                  <span className="font-bold text-[#8C485A] block uppercase text-[10px]">Delivery Address</span>
                  <p className="font-bold text-[#70132C] mt-1">{selectedOrder.delivery_address_snapshot.recipient_name} ({selectedOrder.delivery_address_snapshot.phone})</p>
                  <p className="text-[#33252A]">{selectedOrder.delivery_address_snapshot.address_line1}</p>
                  {selectedOrder.delivery_address_snapshot.address_line2 && <p className="text-[#33252A]">{selectedOrder.delivery_address_snapshot.address_line2}</p>}
                  <p className="text-[#33252A]">{selectedOrder.delivery_address_snapshot.city}, {selectedOrder.delivery_address_snapshot.state} - {selectedOrder.delivery_address_snapshot.pincode}</p>
                </div>
              )}

              {/* Delivery Partner Assignment in Modal */}
              {selectedOrder.fulfilment_type === 'delivery' && (
                <div className="text-xs bg-rose-50/80 p-4 rounded-2xl border border-rose-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#8C485A] block uppercase text-[10px]">
                      Assigned Delivery Rider
                    </span>
                    <a
                      href={`/orders/${selectedOrder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8F1237] hover:underline"
                    >
                      <Navigation className="w-3 h-3" />
                      View Live GPS Route
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedOrder.delivery_partner_id || ''}
                      onChange={(e) => handleAssignPartner(selectedOrder.id, e.target.value)}
                      className="flex-1 bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900"
                    >
                      <option value="">Select Delivery Rider...</option>
                      {deliveryPartners.map((dp) => (
                        <option key={dp.id} value={dp.id}>
                          {dp.name} — {dp.vehicle_number} ({dp.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Ordered Items */}
              <div className="space-y-3">
                <span className="font-bold text-xs uppercase text-[#8C485A]">Ordered Cakes</span>
                <div className="divide-y divide-[#F5D3DC] border border-[#F5D3DC] rounded-2xl overflow-hidden">
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs bg-white">
                      <div>
                        <p className="font-bold text-[#70132C]">{it.quantity}x {it.product_name}</p>
                        <p className="text-[11px] text-[#8C485A]">
                          Size: <strong>{it.weight_kg} Kg</strong> • {it.eggless ? '100% Eggless (+₹200)' : 'Standard'}
                        </p>
                        {it.custom_message && (
                          <p className="text-[11px] text-amber-800 italic mt-0.5">
                            &ldquo;{it.custom_message}&rdquo;
                          </p>
                        )}
                      </div>
                      <span className="font-bold text-sm text-[#70132C]">
                        {formatINR(it.line_total_paise)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial summary */}
              <div className="pt-2 border-t border-[#F5D3DC] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#8C485A] block">Payment: <strong className="capitalize">{selectedOrder.payment_method}</strong> ({selectedOrder.payment_status.toUpperCase()})</span>
                  <span className="font-serif font-black text-2xl text-[#8F1237]">
                    {formatINR(selectedOrder.total_paise)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 border border-[#F5D3DC] text-[#70132C] rounded-xl text-xs font-bold hover:bg-[#FCE8ED]"
                  >
                    Print Bill
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 bg-[#8F1237] text-white rounded-xl text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
