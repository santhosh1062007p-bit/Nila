'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Order, OrderStatus } from '@/types';
import { formatINR } from '@/lib/utils';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const query = user?.phone ? `?phone=${user.phone}` : '';
      const res = await fetch(`/api/orders${query}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.orders) setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const query = user?.phone ? `?phone=${encodeURIComponent(user.phone)}` : '';
    fetch(`/api/orders${query}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.orders) setOrders(data.orders);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useRealtimeSubscription(
    ['ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'ORDER_PAYMENT_STATUS_CHANGED'],
    (event) => {
      const payload = event.data as {
        orderId?: string;
        status?: OrderStatus;
        paymentStatus?: string;
        order?: Order;
      };
      if (event.type === 'ORDER_STATUS_CHANGED') {
        const id = payload?.orderId || payload?.order?.id;
        const nextStatus = payload?.status || payload?.order?.order_status;
        if (id && nextStatus) {
          setOrders((prev) =>
            prev.map((o) => (o.id === id ? { ...o, order_status: nextStatus } : o))
          );
        } else {
          loadOrders();
        }
      } else {
        loadOrders();
      }
    }
  );

  return (
    <div className="py-12 bg-[#FFFDFB]">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-extrabold text-[#70132C]">
              Your Orders &amp; Track History
            </h1>
            <p className="text-xs text-[#8C485A] mt-1">
              Review current baking progress and previous order history
            </p>
          </div>
          <Link
            href="/cakes"
            className="px-5 py-2.5 bg-[#990F35] text-white rounded-full text-xs font-bold hover:bg-[#800A2A]"
          >
            Order Cake
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-sm font-semibold text-[#8C485A]">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-[#F5D3DC] p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#FCE8ED] text-[#990F35] flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#70132C]">
              No past orders found
            </h3>
            <p className="text-xs text-[#8C485A] max-w-sm mx-auto">
              You haven&apos;t placed any orders yet. Try one of our signature regular, fruit or special cakes!
            </p>
            <Link
              href="/cakes"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#990F35] text-white rounded-full text-xs font-bold"
            >
              <span>Explore Bakery Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs hover:border-[#990F35] transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F5D3DC]/60 pb-3">
                  <div>
                    <span className="font-serif font-bold text-base text-[#990F35]">
                      Order #{order.order_code}
                    </span>
                    <span className="text-xs text-[#8C485A] block">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FCE8ED] text-[#990F35] border border-[#F5D3DC]">
                      {order.order_status}
                    </span>
                    <span className="text-base font-extrabold text-[#70132C]">
                      {formatINR(order.total_paise)}
                    </span>
                  </div>
                </div>

                {/* Items summary */}
                <div className="space-y-1 text-xs">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-[#70132C]">
                      <span>
                        {item.quantity} × {item.product_name} ({item.weight_kg} Kg
                        {item.eggless ? ', Eggless' : ''})
                      </span>
                      <span className="font-bold">{formatINR(item.line_total_paise)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F5D3DC]/40 text-xs">
                  <div className="text-[#8C485A]">
                    <span className="font-semibold uppercase">{order.fulfilment_type}: </span>
                    <span>{order.delivery_date} ({order.delivery_slot})</span>
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className="font-bold text-[#990F35] hover:underline flex items-center gap-1"
                  >
                    <span>View Live Tracker &amp; Invoice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

