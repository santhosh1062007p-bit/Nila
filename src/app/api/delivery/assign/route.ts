import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminUser } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdminUser();
    if (!adminCheck.ok) return adminCheck.response;

    const csrfError = verifySameOriginCsrf(req);
    if (csrfError) return csrfError;

    const body = await req.json();
    const { order_id, partner_id } = body;

    if (!order_id || !partner_id) {
      return NextResponse.json({ message: 'Both order_id and partner_id are required.' }, { status: 400 });
    }

    const updatedOrder = await db.assignDeliveryPartner(order_id, partner_id, adminCheck.user.userId);
    if (!updatedOrder) {
      return NextResponse.json({ message: 'Order or Delivery Partner not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Delivery successfully assigned to ${updatedOrder.delivery_partner?.name}.`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('[Delivery Assign API] Error assigning delivery:', error);
    return NextResponse.json({ message: 'Internal server error assigning delivery.' }, { status: 500 });
  }
}
