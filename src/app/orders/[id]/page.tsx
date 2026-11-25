import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Printer,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Cake,
} from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUserFromCookie, verifyGuestOrderToken } from '@/lib/auth/jwt';
import { formatINR } from '@/lib/utils';
import OrderLiveTracker from '@/components/orders/OrderLiveTracker';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}


export default async function OrderDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { token: guestToken } = await searchParams;
  const order = await db.getOrderById(id);

  if (!order) {
    notFound();
  }

  const user = await getCurrentUserFromCookie();
  const isAdmin = user?.role === 'admin';
  const isCustomerOwner =
    user?.role === 'customer' &&
    ((order.user_id && order.user_id === user.userId) ||
      order.customer_phone.replace(/[^0-9]/g, '') === user.phone.replace(/[^0-9]/g, ''));
  const hasGuestAccess = verifyGuestOrderToken(guestToken, order.guest_access_token_hash);

  if (!isAdmin && !isCustomerOwner && !hasGuestAccess) {
    return (
      <div className="py-16 px-4 bg-[#FFFDFB]">
        <div className="max-w-lg mx-auto bg-white rounded-3xl border border-[#F5D3DC] p-8 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-[#990F35] mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-[#70132C]">
            Protected Order Receipt
          </h1>
          <p className="text-xs text-[#8C485A] leading-relaxed">
            For customer privacy, order details can only be viewed by the signed-in account owner or via the unique tracking link created at checkout.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href={`/login?redirect=/orders/${encodeURIComponent(order.id)}`}
              className="px-6 py-2.5 bg-[#990F35] text-white rounded-full text-xs font-bold"
            >
              Sign In to View Order
            </Link>
            <Link
              href="/cakes"
              className="px-6 py-2.5 bg-[#FFF6F0] border border-[#F5D3DC] text-[#70132C] rounded-full text-xs font-bold"
            >
              Back to Cakes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isBirthdayOrder = order.items?.some((item) => {
    const msg = (item.custom_message || '').toLowerCase();
    return msg.includes('birthday') || msg.includes('bday') || msg.includes('hbd');
  });

  return (
    <div className="py-10 bg-[#FFFDFB]">
      <div className="w-full px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-8">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/cakes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#990F35] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8C485A]">Order Code:</span>
            <span className="text-sm font-black text-[#990F35] bg-[#FCE8ED] px-3 py-1 rounded-full border border-[#F5D3DC]">
              {order.order_code}
            </span>
          </div>
        </div>

        {/* Authentic Bakery Brand Header */}
        <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-[#F5D3DC] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#8F1237]/20 bg-[#FFF6F0] shrink-0">
              <Image
                src="/images/nilas-badge.png"
                alt="Nila's Treat"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-serif text-xl font-extrabold text-[#33252A] block leading-none">
                Nila&apos;s Treat
              </span>
              <span className="text-[10px] text-[#8F1237] font-semibold tracking-wider uppercase block mt-1">
                The Home of Fresh Baking • Theni
              </span>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="text-[#70132C]/70 block">Official Bakery Receipt</span>
            <span className="font-bold text-[#8F1237]">Order {order.order_code}</span>
          </div>
        </div>
        {/* Birthday Festive Banner if Birthday Order */}
        {isBirthdayOrder && (
          <div className="p-5 bg-gradient-to-r from-[#FFF6F0] via-[#FCE8EC] to-[#FFF6F0] rounded-3xl border border-[#F5D3DC] flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <Cake className="w-8 h-8 text-[#8F1237] animate-bounce shrink-0" />
              <div>
                <h3 className="font-serif font-extrabold text-[#33252A] text-base">
                  Happy Birthday Celebration!
                </h3>
                <p className="text-xs text-[#8F1237] font-medium">
                  This cake is being whipped and decorated specially for a birthday celebration in Theni.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#8F1237] text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
              Birthday Bake
            </span>
          </div>
        )}

        <div className="p-6 bg-white rounded-3xl border border-[#F5D3DC] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-extrabold text-[#70132C]">
                {order.order_status === 'Delivered' || order.order_status === 'Picked Up'
                  ? 'Order Completed'
                  : 'Order Placed & Confirmed'}
              </h1>
              <p className="text-xs text-[#8C485A] mt-0.5">
                Thank you, {order.customer_name}! We are preparing your fresh order.
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-[#8C485A] block">Payment Method</span>
            <span className="text-sm font-black uppercase text-[#990F35]">
              {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                order.payment_status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Payment: {order.payment_status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Live Order Tracker Component */}
        <OrderLiveTracker initialOrder={order} />

        {/* Order Details & Invoiced Items */}
        <div className="bg-white rounded-3xl border border-[#F5D3DC] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#F5D3DC] pb-4">
            <h2 className="font-serif text-lg font-bold text-[#990F35]">
              Order Invoiced Items
            </h2>
            <span className="text-xs text-[#8C485A]">
              Ordered on {new Date(order.created_at).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Items List */}
          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-[#F5D3DC]/40 text-sm"
              >
                <div>
                  <h3 className="font-bold text-[#70132C]">
                    {item.quantity} × {item.product_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#8C485A]">
                    <span>{item.weight_kg} Kg</span>
                    <span>•</span>
                    <span>{item.eggless ? 'Eggless (+₹200)' : 'Regular'}</span>
                    {item.custom_message && (
                      <>
                        <span>•</span>
                        <span className="italic text-[#990F35]">
                          &ldquo;{item.custom_message}&rdquo;
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="font-extrabold text-[#70132C]">
                  {formatINR(item.line_total_paise)}
                </span>
              </div>
            ))}
          </div>

          {/* Fulfilment & Delivery Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#F5D3DC]">
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-[#990F35] uppercase tracking-wider block">
                {order.fulfilment_type === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
              </span>
              {order.fulfilment_type === 'delivery' && order.delivery_address_snapshot ? (
                <div className="text-[#70132C] space-y-0.5">
                  <p className="font-bold">{order.delivery_address_snapshot.recipient_name}</p>
                  <p>{order.delivery_address_snapshot.address_line1}</p>
                  <p>{order.delivery_address_snapshot.address_line2}</p>
                  <p>
                    {order.delivery_address_snapshot.city}, {order.delivery_address_snapshot.state} -{' '}
                    <span className="font-bold">{order.delivery_address_snapshot.pincode}</span>
                  </p>
                  <p>Phone: {order.delivery_address_snapshot.phone}</p>
                </div>
              ) : (
                <div className="text-[#70132C] space-y-0.5">
                  <p className="font-bold">Nila&apos;s Treat Bakery Counter</p>
                  <p>Periyakulam Main Road, Theni, Tamil Nadu - 625531</p>
                  <p>Contact: +91 93445 97833 / +91 89398 00225</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-[#990F35] uppercase tracking-wider block">
                Delivery Schedule
              </span>
              <div className="text-[#70132C] space-y-0.5">
                <p>
                  <span className="text-[#8C485A]">Date: </span>
                  <span className="font-bold">{order.delivery_date}</span>
                </p>
                <p>
                  <span className="text-[#8C485A]">Time Slot: </span>
                  <span className="font-bold">{order.delivery_slot}</span>
                </p>
                {order.special_instructions && (
                  <p className="italic text-[#8C485A] pt-1">
                    Note: &ldquo;{order.special_instructions}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Calculation Breakdown */}
          <div className="pt-4 border-t border-[#F5D3DC] space-y-2 text-xs">
            <div className="flex justify-between text-[#8C485A]">
              <span>Item Subtotal</span>
              <span className="font-semibold text-[#70132C]">{formatINR(order.subtotal_paise)}</span>
            </div>
            <div className="flex justify-between text-[#8C485A]">
              <span>Delivery Charges</span>
              <span>
                {order.fulfilment_type === 'pickup' ? (
                  <span className="text-emerald-700 font-bold">FREE (Shop Pickup)</span>
                ) : (
                  formatINR(order.delivery_charge_paise)
                )}
              </span>
            </div>
            {order.discount_paise > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount Applied</span>
                <span>-{formatINR(order.discount_paise)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-[#990F35] border-t border-[#F5D3DC] pt-2">
              <span>Total Paid / Payable</span>
              <span className="text-lg">{formatINR(order.total_paise)}</span>
            </div>
          </div>
        </div>

        {/* Bakery Helpline */}
        <div className="p-4 rounded-2xl bg-[#FCE8ED]/60 border border-[#F5D3DC] text-center text-xs text-[#8C485A]">
          Need help with this order? Call our bakery desk anytime:{' '}
          <a href="tel:9344597833" className="font-bold text-[#990F35] underline">
            93445 97833
          </a>{' '}
          or{' '}
          <a href="tel:8939800225" className="font-bold text-[#990F35] underline">
            89398 00225
          </a>
        </div>
      </div>
    </div>
  );
}

