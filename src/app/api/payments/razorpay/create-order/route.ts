import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getRazorpayInstance } from '@/lib/razorpay/client';
import { getCurrentUserFromCookie, verifyGuestOrderToken } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';

const createPaymentOrderSchema = z.object({
  orderId: z.string().min(1, 'Missing orderId'),
  guestToken: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'rzp-create-order', 20, 60_000);
  if (rateErr) return rateErr;

  try {
    const parsed = createPaymentOrderSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Missing or invalid orderId' }, { status: 400 });
    }

    const order = await db.getOrderById(parsed.data.orderId);
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Authorize caller (owner of order, guest token holder, or admin)
    const user = await getCurrentUserFromCookie();
    const guestToken = parsed.data.guestToken || req.headers.get('x-guest-token');
    const isAdmin = user?.role === 'admin';
    const isCustomerOwner =
      user?.role === 'customer' &&
      ((order.user_id && order.user_id === user.userId) ||
        order.customer_phone.replace(/[^0-9]/g, '') === user.phone.replace(/[^0-9]/g, ''));
    const hasGuestToken = verifyGuestOrderToken(guestToken, order.guest_access_token_hash);

    if (!isAdmin && !isCustomerOwner && !hasGuestToken) {
      return NextResponse.json(
        { message: 'Unauthorized payment initialization attempt' },
        { status: user ? 403 : 401 }
      );
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ message: 'Order is already paid.' }, { status: 400 });
    }

    if (order.payment_method !== 'razorpay') {
      return NextResponse.json(
        { message: 'This order uses Cash on Delivery, not online payment.' },
        { status: 400 }
      );
    }

    if (order.total_paise <= 0) {
      return NextResponse.json(
        { message: 'Order amount must be greater than zero for Razorpay payment.' },
        { status: 400 }
      );
    }

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return NextResponse.json(
        {
          message:
            'Online Razorpay payment keys are not configured on the server. Please use Cash on Delivery or configure RAZORPAY_KEY_SECRET.',
          code: 'RAZORPAY_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    // Create backend-verified Razorpay Order strictly using server-stored order.total_paise
    const rzpOrder = await rzp.orders.create({
      amount: order.total_paise,
      currency: 'INR',
      receipt: order.order_code,
      notes: {
        internal_order_id: order.id,
        customer_phone: order.customer_phone,
      },
    });

    await db.createPayment({
      order_id: order.id,
      provider: 'razorpay',
      razorpay_order_id: rzpOrder.id,
      razorpay_payment_id: null,
      razorpay_signature: null,
      amount_paise: order.total_paise,
      currency: 'INR',
      status: 'created',
    });

    await db.recordAudit({
      actor_id: user?.userId || `guest:${order.customer_phone}`,
      actor_role: user?.role || 'guest',
      action: 'RAZORPAY_ORDER_CREATED',
      target_type: 'payment',
      target_id: rzpOrder.id,
      ip_address: getClientIp(req),
      metadata: { order_id: order.id, amount_paise: order.total_paise },
    });

    return NextResponse.json(
      {
        success: true,
        razorpayOrderId: rzpOrder.id,
        amount: order.total_paise,
        currency: 'INR',
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to create payment order', error: String(error) },
      { status: 500 }
    );
  }
}
