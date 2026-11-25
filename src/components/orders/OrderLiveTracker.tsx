'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Order,
  OrderStatus,
  DeliveryPartner,
  DeliveryLocationUpdate,
} from '@/types';
import {
  Check,
  Truck,
  Cake,
  ShoppingBag,
  PackageCheck,
  AlertCircle,
  Bike,
  Phone,
  Clock,
  Sparkles,
  MapPin,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useRealtimeSubscription } from '@/context/RealtimeContext';
import CustomerReviewModal from '@/components/orders/CustomerReviewModal';

// Dynamically load Leaflet Map with SSR disabled
const LiveDeliveryMap = dynamic(
  () => import('@/components/tracking/LiveDeliveryMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 sm:h-96 rounded-2xl bg-stone-100 flex items-center justify-center text-xs text-gray-700 animate-pulse border border-rose-100">
        Loading live GPS delivery map...
      </div>
    ),
  }
);

interface OrderLiveTrackerProps {
  initialOrder: Order;
}

const GRANULAR_DELIVERY_STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'Order Placed', label: 'Placed', icon: ShoppingBag },
  { status: 'Payment Confirmed', label: 'Payment', icon: ShieldCheck },
  { status: 'Order Accepted', label: 'Accepted', icon: Check },
  { status: 'Baking in Progress', label: 'Baking', icon: Cake },
  { status: 'Cake Ready', label: 'Baked & Ready', icon: PackageCheck },
  { status: 'Delivery Partner Assigned', label: 'Rider Assigned', icon: Bike },
  { status: 'Picked Up', label: 'Picked Up', icon: Truck },
  { status: 'Out for Delivery', label: 'Out for Delivery', icon: NavigationIcon },
  { status: 'Arriving Soon', label: 'Arriving Soon', icon: Clock },
  { status: 'Delivered', label: 'Delivered', icon: Check },
];

function NavigationIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

const GRANULAR_PICKUP_STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'Order Placed', label: 'Placed', icon: ShoppingBag },
  { status: 'Payment Confirmed', label: 'Payment', icon: ShieldCheck },
  { status: 'Order Accepted', label: 'Accepted', icon: Check },
  { status: 'Baking in Progress', label: 'Baking', icon: Cake },
  { status: 'Cake Ready', label: 'Ready for Pickup', icon: PackageCheck },
  { status: 'Delivered', label: 'Picked Up', icon: Check },
];

export default function OrderLiveTracker({ initialOrder }: OrderLiveTrackerProps) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [liveLocation, setLiveLocation] = useState<DeliveryLocationUpdate | null>(
    initialOrder.live_delivery_location || null
  );
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const fetchLatestOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${initialOrder.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
          if (data.order.live_delivery_location) {
            setLiveLocation(data.order.live_delivery_location);
          }
        }
      }
    } catch {
      // Ignore polling errors
    }
  }, [initialOrder.id]);

  // Real-time instantaneous order status and live GPS location sync
  useRealtimeSubscription(
    [
      'ORDER_STATUS_CHANGED',
      'ORDER_PAYMENT_STATUS_CHANGED',
      'DELIVERY_LOCATION_UPDATE',
      'DELIVERY_PARTNER_ASSIGNED',
    ],
    (event) => {
      if (event.type === 'DELIVERY_LOCATION_UPDATE') {
        const locUpdate = event.data as DeliveryLocationUpdate;
        if (locUpdate?.order_id === initialOrder.id) {
          setLiveLocation(locUpdate);
        }
      } else if (event.type === 'DELIVERY_PARTNER_ASSIGNED') {
        const assignData = event.data as { order_id?: string; partner?: DeliveryPartner };
        if (assignData?.order_id === initialOrder.id && assignData.partner) {
          setOrder((prev) => ({
            ...prev,
            delivery_partner_id: assignData.partner!.id,
            delivery_partner: assignData.partner!,
            order_status: 'Delivery Partner Assigned',
          }));
        }
      } else {
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
            if (payload.order.live_delivery_location) {
              setLiveLocation(payload.order.live_delivery_location);
            }
          } else if (payload.status) {
            setOrder((prev) => ({ ...prev, order_status: payload.status! }));
          } else {
            fetchLatestOrder();
          }
        }
      }
    }
  );

  // Poll fallback every 10 seconds for resiliency
  useEffect(() => {
    const interval = setInterval(fetchLatestOrder, 10000);
    return () => clearInterval(interval);
  }, [fetchLatestOrder]);

  const steps = order.fulfilment_type === 'pickup' ? GRANULAR_PICKUP_STEPS : GRANULAR_DELIVERY_STEPS;
  let currentStepIndex = steps.findIndex((s) => s.status === order.order_status);
  if (currentStepIndex === -1) {
    // Mapping legacy status aliases if any
    if (order.order_status === 'Order Confirmed') currentStepIndex = 2;
    else if (order.order_status === 'Ready for Pickup') currentStepIndex = 4;
    else currentStepIndex = 0;
  }

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

  const isDelivery = order.fulfilment_type === 'delivery';

  return (
    <div className="bg-white rounded-3xl border border-[#F5D3DC] shadow-sm overflow-hidden space-y-6 p-4 sm:p-6">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-50 pb-4">
        <div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-[#70132C] tracking-tight">
            Live Baking &amp; Delivery Tracker
          </h2>
          <p className="text-xs text-[#8C485A] mt-0.5">
            Stage:{' '}
            <span className="font-black text-[#990F35] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              {order.order_status}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-Time Live
          </span>
        </div>
      </div>

      {/* SWIGGY / ZOMATO INTERACTIVE LIVE GPS MAP */}
      {isDelivery && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-rose-600" />
              Live Delivery Route Map
            </span>
            {order.delivery_partner && (
              <span className="text-xs text-rose-800 font-semibold">
                Rider: {order.delivery_partner.name}
              </span>
            )}
          </div>

          <LiveDeliveryMap
            orderId={order.id}
            orderStatus={order.order_status}
            customerAddress={order.delivery_address_snapshot}
            deliveryPartner={order.delivery_partner}
            liveLocation={liveLocation}
          />

          {/* Delivery Partner Assigned Card */}
          {order.delivery_partner && (
            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-700 text-white flex items-center justify-center font-black text-sm shadow-sm">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{order.delivery_partner.name}</div>
                  <div className="text-[11px] text-rose-800 font-medium">
                    {order.delivery_partner.vehicle_number} ({order.delivery_partner.vehicle_type.toUpperCase()})
                  </div>
                </div>
              </div>

              <a
                href={`tel:${order.delivery_partner.phone}`}
                className="flex items-center gap-1 text-xs font-bold text-rose-800 bg-white px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5 text-rose-600" />
                <span>Call Rider</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Steps Visual Progress Tracker */}
      <div className="pt-2">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4 px-1">
          Bakery Preparation Timeline
        </div>

        <div className="relative pt-2 pb-2">
          {/* Progress Bar Line */}
          <div className="absolute top-7 left-4 right-4 h-1 bg-stone-100 -translate-y-1/2 -z-0">
            <div
              className="h-full bg-[#990F35] transition-all duration-700 rounded-full"
              style={{
                width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Step Nodes */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.status} className="flex flex-col items-center text-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isCompleted
                        ? 'bg-[#990F35] text-white shadow-xs'
                        : isCurrent
                        ? 'bg-[#990F35] text-white ring-4 ring-[#FCE8ED] scale-110 shadow-md'
                        : 'bg-white border-2 border-[#F5D3DC] text-[#8C485A]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] mt-1.5 font-bold leading-tight ${
                      isCurrent
                        ? 'text-[#990F35]'
                        : isCompleted
                        ? 'text-[#70132C]'
                        : 'text-stone-700'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Delivered Customer Feedback Callout */}
          {order.order_status === 'Delivered' && (
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#FFF6F0] via-white to-[#FFF6F0] border border-[#F5D3DC] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#70132C]">
                    How was your Nila’s Treat cake?
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Your rating helps our Theni home bakers create sweeter memories!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewOpen(true)}
                className="px-4 py-2 bg-[#8F1237] hover:bg-[#70132C] text-white rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Rate &amp; Review</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <CustomerReviewModal
        order={order}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
      />
    </div>
  );
}
