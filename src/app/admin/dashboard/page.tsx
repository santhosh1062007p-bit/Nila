'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import {
  CheckCircle2,
  Cake,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Order, Product } from '@/types';
import { formatINR } from '@/lib/utils';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [, setProducts] = useState<Product[]>([]);
  const [, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/orders', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/products', { cache: 'no-store' }).then((r) => r.json()),
      ]);

      if (ordersRes && ordersRes.orders) setOrders(ordersRes.orders);
      if (productsRes && productsRes.products) setProducts(productsRes.products);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/orders', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/products', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([ordersRes, productsRes]) => {
        if (!active) return;
        if (ordersRes && ordersRes.orders) setOrders(ordersRes.orders);
        if (productsRes && productsRes.products) setProducts(productsRes.products);
      })
      .catch((err) => {
        console.error('Failed to load dashboard metrics', err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Real-time synchronization for operational counters
  useRealtimeSubscription(
    [
      'ORDER_CREATED',
      'ORDER_STATUS_CHANGED',
      'ORDER_PAYMENT_STATUS_CHANGED',
      'PRODUCT_CREATED',
      'PRODUCT_UPDATED',
      'PRODUCT_DELETED',
    ],
    () => {
      loadData();
    }
  );

  // Compute analytics metrics
  const totalRevenuePaise = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((acc, o) => acc + o.total_paise, 0);

  const pendingCodPaise = orders
    .filter((o) => o.payment_method === 'cod' && o.payment_status === 'pending')
    .reduce((acc, o) => acc + o.total_paise, 0);

  const pendingOrdersCount = orders.filter(
    (o) => o.order_status !== 'Delivered' && o.order_status !== 'Picked Up' && o.order_status !== 'Cancelled'
  ).length;

  const completedOrdersCount = orders.filter(
    (o) => o.order_status === 'Delivered' || o.order_status === 'Picked Up'
  ).length;

  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, order_status: data.order.order_status } : o))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB]">
      <AdminNav />

      <main className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-extrabold text-[#70132C]">
              Business Analytics &amp; Control
            </h1>
            <p className="text-xs text-[#8C485A] mt-1">
              Live operational metrics for Nila&apos;s Treat Bakery, Theni
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="px-4 py-2 bg-white border border-[#F5D3DC] text-[#990F35] rounded-xl text-xs font-bold hover:bg-[#FCE8ED]"
            >
              Manage Cakes
            </Link>
            <Link
              href="/admin/orders"
              className="px-4 py-2 bg-[#990F35] text-white rounded-xl text-xs font-bold hover:bg-[#800A2A]"
            >
              Process Orders
            </Link>
          </div>
        </div>

        {/* Analytics KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Paid Revenue */}
          <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#8C485A]">
              <span className="text-xs font-bold uppercase tracking-wider">Paid Revenue</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                ₹
              </div>
            </div>
            <p className="font-serif text-3xl font-extrabold text-[#70132C]">
              {formatINR(totalRevenuePaise)}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium">
              ✓ Verified collected &amp; online settlements
            </p>
          </div>

          {/* Pending COD Collections */}
          <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#8C485A]">
              <span className="text-xs font-bold uppercase tracking-wider">Uncollected COD</span>
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="font-serif text-3xl font-extrabold text-amber-800">
              {formatINR(pendingCodPaise)}
            </p>
            <p className="text-[11px] text-[#8C485A]">
              Payable upon delivery or pickup
            </p>
          </div>

          {/* Active Orders */}
          <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#8C485A]">
              <span className="text-xs font-bold uppercase tracking-wider">Active In-Flight</span>
              <div className="w-9 h-9 rounded-xl bg-[#FCE8ED] text-[#990F35] flex items-center justify-center">
                <Cake className="w-5 h-5" />
              </div>
            </div>
            <p className="font-serif text-3xl font-extrabold text-[#990F35]">
              {pendingOrdersCount}
            </p>
            <p className="text-[11px] text-[#8C485A]">
              Baking or scheduled for dispatch
            </p>
          </div>

          {/* Completed Orders */}
          <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#8C485A]">
              <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
              <div className="w-9 h-9 rounded-xl bg-stone-100 text-[#70132C] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="font-serif text-3xl font-extrabold text-[#70132C]">
              {completedOrdersCount}
            </p>
            <p className="text-[11px] text-[#8C485A]">
              Successfully delivered or picked up
            </p>
          </div>
        </div>

        {/* Incoming Orders Section */}
        <div className="bg-white rounded-3xl border border-[#F5D3DC] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-[#990F35]">
              Recent Orders Needing Attention
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-[#990F35] hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {orders.length === 0 ? (
            <p className="text-xs text-[#8C485A] text-center py-8">
              No orders registered in the system yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F5D3DC] text-[#8C485A] font-bold uppercase tracking-wider">
                    <th className="pb-3">Order</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Items</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Fulfilment</th>
                    <th className="pb-3">Baking Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5D3DC]/60">
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-[#FFFDFB]">
                      <td className="py-3 font-bold text-[#990F35]">
                        <Link href={`/orders/${order.id}`} className="hover:underline">
                          #{order.order_code}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className="font-bold block text-[#70132C]">
                          {order.customer_name}
                        </span>
                        <span className="text-[#8C485A]">{order.customer_phone}</span>
                      </td>
                      <td className="py-3 text-[#70132C]">
                        {order.items.map((it) => `${it.quantity}× ${it.product_name}`).join(', ')}
                      </td>
                      <td className="py-3 font-bold text-[#70132C]">
                        {formatINR(order.total_paise)}
                      </td>
                      <td className="py-3">
                        <span className="capitalize font-semibold text-[#8C485A]">
                          {order.fulfilment_type} ({order.delivery_slot})
                        </span>
                      </td>
                      <td className="py-3">
                        <select
                          value={order.order_status}
                          onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                          className="bg-[#FFFDFB] text-xs font-bold text-[#990F35] border border-[#F5D3DC] rounded-lg px-2 py-1 focus:outline-none focus:border-[#990F35]"
                        >
                          <option value="Order Placed">Order Placed</option>
                          <option value="Order Confirmed">Order Confirmed</option>
                          <option value="Baking in Progress">Baking in Progress</option>
                          <option value="Cake Ready">Cake Ready</option>
                          <option value="Ready for Pickup">Ready for Pickup</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Picked Up">Picked Up</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

