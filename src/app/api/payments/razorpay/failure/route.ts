import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUserFromCookie, verifyGuestOrderToken } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { getClientIp } from '@/lib/security/rate-limit';

const failureSchema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1).optional(),
  razorpayPaymentId: z.string().optional(),
  errorCode: z.string().max(100).optional(),
  errorDescription: z.string().max(400).optional(),
  guestToken: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  try {
    const parsed = failureSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid payment failure payload' }, { status: 400 });
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, errorCode, errorDescription, guestToken } =
      parsed.data;
    const order = await db.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const user = await getCurrentUserFromCookie();
    const headerGuestToken = guestToken || req.headers.get('x-guest-token');
    const isAdmin = user?.role === 'admin';
    const isCustomerOwner =
      user?.role === 'customer' &&
      ((order.user_id && order.user_id === user.userId) ||
        order.customer_phone.replace(/[^0-9]/g, '') === user.phone.replace(/[^0-9]/g, ''));
    const hasGuestToken = verifyGuestOrderToken(headerGuestToken, order.guest_access_token_hash);

    if (!isAdmin && !isCustomerOwner && !hasGuestToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: user ? 403 : 401 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: true, status: 'already_paid' });
    }

    if (razorpayOrderId) {
      await db.updatePaymentByRzpOrder(razorpayOrderId, {
        razorpay_payment_id: razorpayPaymentId || null,
        status: 'failed',
        error_code: errorCode || 'PAYMENT_FAILED',
        error_description: errorDescription || 'Customer cancelled or payment declined',
      });
    }

    await db.updatePaymentStatus(order.id, 'failed');

    await db.recordAudit({
      actor_id: user?.userId || `guest:${order.customer_phone}`,
      actor_role: user?.role || 'guest',
      action: 'PAYMENT_FAILED',
      target_type: 'order',
      target_id: order.id,
      ip_address: getClientIp(req),
      metadata: { errorCode, errorDescription },
    });

    return NextResponse.json(
      { success: true, retryAllowed: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to record payment failure', error: String(error) },
      { status: 500 }
    );
  }
}
