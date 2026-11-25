import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySameOriginCsrf } from '@/lib/security/csrf';

export async function POST(req: NextRequest) {
  try {
    const csrfError = verifySameOriginCsrf(req);
    if (csrfError) return csrfError;

    const body = await req.json();
    const phone = body?.phone ? String(body.phone).trim().replace(/[^0-9]/g, '') : '';

    if (!phone || phone.length < 10) {
      return NextResponse.json({ message: 'Valid 10-digit mobile number required.' }, { status: 400 });
    }

    const partner = await db.getDeliveryPartnerByPhone(phone);
    if (!partner || !partner.is_active) {
      return NextResponse.json(
        { message: 'Delivery partner account not found or deactivated. Please contact Nila\'s Treat Bakery.' },
        { status: 404 }
      );
    }

    const assignedOrders = await db.getAssignedOrdersForPartner(partner.id);

    return NextResponse.json({
      success: true,
      partner,
      active_orders_count: assignedOrders.length,
    });
  } catch (error) {
    console.error('[Delivery Partner Login API] Error:', error);
    return NextResponse.json({ message: 'Failed to process rider login.' }, { status: 500 });
  }
}
