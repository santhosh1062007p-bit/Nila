'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus } from '@/types';
import { Check, Truck, Cake, ShoppingBag, PackageCheck, AlertCircle } from 'lucide-react';
import { useRealtimeSubscription } from '@/context/RealtimeContext';

interface OrderLiveTrackerProps {
  initialOrder: Order;
}

const DELIVERY_STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'Order Placed', label: 'Order Placed', icon: ShoppingBag },
  { status: 'Order Confirmed', label: 'Confirmed', icon: Check },
  { status: 'Baking in Progress', label: 'Baking in Progress', icon: Cake },
  { status: 'Cake Ready', label: 'Cake Ready', icon: PackageCheck },
  { status: 'Out for Delivery', label: 'Out for Delivery', icon: Truck },
  { status: 'Delivered', label: 'Delivered', icon: Check },
];

const PICKUP_STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'Order Placed', label: 'Order Placed', icon: ShoppingBag },
  { status: 'Order Confirmed', label: 'Confirmed', icon: Check },
  { status: 'Baking in Progress', label: 'Baking in Progress', icon: Cake },
  { status: 'Ready for Pickup', label: 'Ready for Pickup', icon: PackageCheck },
  { status: 'Picked Up', label: 'Picked Up', icon: Check },
];

export default function OrderLiveTracker({ initialOrder }: OrderLiveTrackerProps) {
  const [order, setOrder] = useState<Order>(initialOrder);

  const fetchLatestOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${initialOrder.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
        }
      }
    } catch {
      // Ignore polling errors
    }
  }, [initialOrder.id]);

  // Real-time instantaneous order status sync
  useRealtimeSubscription(
    ['ORDER_STATUS_CHANGED', 'ORDER_PAYMENT_STATUS_CHANGED'],
    (event) => {
      const payload = event.data as {
        orderId?: string;
        status?: OrderStatus;
        paymentStatus?: string;
        order?: Order;
      };
      const evtOrderId = payload?.orderId || payload?.order?.id;
      if (evtOrderId === initialOrder.id) {
        if (payload.order) {
          setOrder(payload.order);
        } else if (payload.status) {
          setOrder((prev) => ({ ...prev, order_status: payload.status! }));
        } else {
          fetchLatestOrder();
        }
      }
    }
  );

  // Poll as fallback for network dropouts
  useEffect(() => {
    const interval = setInterval(fetchLatestOrder, 6000);
    return () => clearInterval(interval);
  }, [fetchLatestOrder]);

  const steps = order.fulfilment_type === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentStepIndex = steps.findIndex((s) => s.status === order.order_status);

  const isCancelled = order.order_status === 'Cancelled' || order.order_status === 'Rejected';

  if (isCancelled) {
    return (
      <div className="p-6 bg-rose-50 rounded-3xl border border-rose-200 text-rose-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-base">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>Order Status: {order.order_status}</span>
        </div>
        {order.rejection_reason && (
          <p className="text-xs text-rose-800">
            Reason: {order.rejection_reason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#70132C]">
            Live Baking &amp; Delivery Status
          </h2>
          <p className="text-xs text-[#8C485A]">
            Current Stage:{' '}
            <span className="font-bold text-[#990F35]">{order.order_status}</span>
          </p>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Tracking Active
        </span>
      </div>

      {/* Steps Visual Progress Tracker */}
      <div className="relative pt-2 pb-4">
        {/* Progress Bar Line */}
        <div className="absolute top-7 left-4 right-4 h-1 bg-[#FCE8ED] -translate-y-1/2 -z-0">
          <div
            className="h-full bg-[#990F35] transition-all duration-700"
            style={{
              width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Step Nodes */}
        <div className="flex items-start justify-between relative z-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.status} className="flex flex-col items-center text-center max-w-[80px]">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-[#990F35] text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#990F35] text-white ring-4 ring-[#FCE8ED] scale-110 shadow-md'
                      : 'bg-white border-2 border-[#F5D3DC] text-[#8C485A]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] mt-2 font-bold leading-tight ${
                    isCurrent
                      ? 'text-[#990F35]'
                      : isCompleted
                      ? 'text-[#70132C]'
                      : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

