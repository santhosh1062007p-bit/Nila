import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyRazorpaySignature } from '@/lib/razorpay/client';
import { getCurrentUserFromCookie, verifyGuestOrderToken } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';

const verifySchema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(10, 'Missing Razorpay cryptographic signature'),
  guestToken: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'rzp-verify', 25, 60_000);
  if (rateErr) return rateErr;

  try {
    const parsed = verifySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Missing transaction verification parameters' },
        { status: 400 }
      );
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, guestToken } = parsed.data;
    const order = await db.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    // Ownership authorization
    const user = await getCurrentUserFromCookie();
    const headerGuestToken = guestToken || req.headers.get('x-guest-token');
    const isAdmin = user?.role === 'admin';
    const isCustomerOwner =
      user?.role === 'customer' &&
      ((order.user_id && order.user_id === user.userId) ||
        order.customer_phone.replace(/[^0-9]/g, '') === user.phone.replace(/[^0-9]/g, ''));
    const hasGuestToken = verifyGuestOrderToken(headerGuestToken, order.guest_access_token_hash);

    if (!isAdmin && !isCustomerOwner && !hasGuestToken) {
      return NextResponse.json({ message: 'Unauthorized verification attempt' }, { status: user ? 403 : 401 });
    }

    // Bind check: razorpayOrderId must belong to this order's stored payment attempt
    const paymentRecord = await db.getPaymentByRazorpayOrderId(razorpayOrderId);
    const belongsToOrder =
      (paymentRecord && paymentRecord.order_id === order.id && paymentRecord.amount_paise === order.total_paise) ||
      (order.razorpay_order_id && order.razorpay_order_id === razorpayOrderId);

    if (!belongsToOrder) {
      return NextResponse.json(
        { message: 'Razorpay order ID does not match this order or expected amount.' },
        { status: 400 }
      );
    }

    // Verify cryptographic signature server-side using timing-safe HMAC SHA-256
    const isValid = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      await db.recordAudit({
        actor_id: user?.userId || `guest:${order.customer_phone}`,
        actor_role: user?.role || 'guest',
        action: 'PAYMENT_SIGNATURE_INVALID',
        target_type: 'order',
        target_id: order.id,
        ip_address: getClientIp(req),
        metadata: { razorpayOrderId, razorpayPaymentId },
      });
      return NextResponse.json(
        { message: 'Cryptographic signature verification failed' },
        { status: 400 }
      );
    }

    // Idempotent check if already captured
    if (order.payment_status === 'paid' && paymentRecord?.razorpay_payment_id === razorpayPaymentId) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        paymentId: razorpayPaymentId,
      });
    }

    await db.updatePaymentByRzpOrder(razorpayOrderId, {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: 'captured',
    });

    await db.updatePaymentStatus(order.id, 'paid');
    if (order.order_status === 'Order Placed') {
      await db.updateOrderStatus(
        order.id,
        'Order Confirmed',
        { id: user?.userId || null, role: 'system:payment_verified' },
        `Razorpay payment verified (${razorpayPaymentId})`
      );
    }

    await db.recordAudit({
      actor_id: user?.userId || `guest:${order.customer_phone}`,
      actor_role: user?.role || 'guest',
      action: 'PAYMENT_VERIFIED',
      target_type: 'order',
      target_id: order.id,
      ip_address: getClientIp(req),
      metadata: { razorpayOrderId, razorpayPaymentId, amount_paise: order.total_paise },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Payment verified and order confirmed successfully',
        paymentId: razorpayPaymentId,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Payment verification failed', error: String(error) },
      { status: 500 }
    );
  }
}
