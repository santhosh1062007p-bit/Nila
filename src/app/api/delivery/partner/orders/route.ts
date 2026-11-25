import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { OrderStatus } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partner_id');

    if (!partnerId) {
      return NextResponse.json({ message: 'partner_id query parameter is required.' }, { status: 400 });
    }

    const orders = await db.getAssignedOrdersForPartner(partnerId);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('[Delivery Partner Orders API] Error fetching orders:', error);
    return NextResponse.json({ message: 'Failed to fetch assigned deliveries.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const csrfError = verifySameOriginCsrf(req);
    if (csrfError) return csrfError;

    const body = await req.json();
    const { order_id, partner_id, new_status, note } = body;

    if (!order_id || !partner_id || !new_status) {
      return NextResponse.json({ message: 'order_id, partner_id, and new_status are required.' }, { status: 400 });
    }

    const order = await db.getOrderById(order_id);
    if (!order) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    if (order.delivery_partner_id !== partner_id) {
      return NextResponse.json({ message: 'Unauthorized: This order is not assigned to you.' }, { status: 403 });
    }

    const partner = await db.getDeliveryPartnerById(partner_id);
    const partnerName = partner?.name || 'Delivery Partner';

    const validPartnerStatuses: OrderStatus[] = [
      'Picked Up',
      'Out for Delivery',
      'Arriving Soon',
      'Delivered',
    ];

    if (!validPartnerStatuses.includes(new_status)) {
      return NextResponse.json(
        { message: `Invalid status for rider: ${new_status}. Allowed: ${validPartnerStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await db.updateOrderStatus(
      order_id,
      new_status,
      { id: partner_id, role: 'delivery_partner' },
      note || `Status updated to ${new_status} by ${partnerName}`
    );

    // If COD order marked delivered, set payment status to paid
    if (new_status === 'Delivered' && updated?.payment_method === 'cod') {
      await db.updatePaymentStatus(order_id, 'paid');
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('[Delivery Partner Orders API] Error updating status:', error);
    return NextResponse.json({ message: 'Internal error updating delivery status.' }, { status: 500 });
  }
}
