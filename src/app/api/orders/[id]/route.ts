import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  getCurrentUserFromCookie,
  requireAdminUser,
  verifyGuestOrderToken,
} from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { getClientIp } from '@/lib/security/rate-limit';
import { OrderStatus, PaymentStatus } from '@/types';

const patchOrderSchema = z.object({
  status: z
    .enum([
      'Order Placed',
      'Order Confirmed',
      'Baking in Progress',
      'Cake Ready',
      'Ready for Pickup',
      'Out for Delivery',
      'Delivered',
      'Picked Up',
      'Cancelled',
      'Rejected',
    ])
    .optional(),
  payment_status: z.enum(['pending', 'authorized', 'paid', 'failed', 'refunded']).optional(),
  rejection_reason: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.getOrderById(id);
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const user = await getCurrentUserFromCookie();
    const guestToken =
      req.headers.get('x-guest-token') || new URL(req.url).searchParams.get('token');

    const isAdmin = user?.role === 'admin';
    const isCustomerOwner =
      user?.role === 'customer' &&
      ((order.user_id && order.user_id === user.userId) ||
        order.customer_phone.replace(/[^0-9]/g, '') === user.phone.replace(/[^0-9]/g, ''));
    const hasValidGuestToken = verifyGuestOrderToken(guestToken, order.guest_access_token_hash);

    if (!isAdmin && !isCustomerOwner && !hasValidGuestToken) {
      return NextResponse.json(
        { message: 'Unauthorized: You do not have permission to view this order.' },
        { status: user ? 403 : 401 }
      );
    }

    const payments = await db.getPaymentsForOrder(order.id);
    const { guest_access_token_hash: _hash, ...safeOrder } = order;

    return NextResponse.json(
      { order: safeOrder, payments },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Error retrieving order', error: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  // Strictly enforce Owner Admin RBAC — customers/anonymous users cannot alter order/payment status
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const parsed = patchOrderSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid order update' },
        { status: 400 }
      );
    }

    let updatedOrder = null;

    if (parsed.data.status) {
      updatedOrder = await db.updateOrderStatus(
        id,
        parsed.data.status as OrderStatus,
        { id: auth.user.userId, role: 'admin' },
        parsed.data.note,
        parsed.data.rejection_reason
      );
    }

    if (parsed.data.payment_status) {
      updatedOrder = await db.updatePaymentStatus(
        id,
        parsed.data.payment_status as PaymentStatus
      );
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { message: 'Order could not be updated or not found' },
        { status: 404 }
      );
    }

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'admin',
      action: 'ORDER_ADMIN_UPDATED',
      target_type: 'order',
      target_id: updatedOrder.id,
      ip_address: getClientIp(req),
      metadata: parsed.data,
    });

    const { guest_access_token_hash: _hash, ...safeOrder } = updatedOrder;
    return NextResponse.json({ success: true, order: safeOrder });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error updating order', error: String(error) },
      { status: 500 }
    );
  }
}
