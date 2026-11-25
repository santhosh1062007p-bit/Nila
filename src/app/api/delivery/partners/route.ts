import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminUser } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { DeliveryPartner } from '@/types';

export async function GET() {
  try {
    const partners = await db.getDeliveryPartners();
    return NextResponse.json({ partners });
  } catch (error) {
    console.error('[Delivery Partners API] Error fetching partners:', error);
    return NextResponse.json({ message: 'Failed to retrieve delivery partners.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdminUser();
    if (!adminCheck.ok) return adminCheck.response;

    const csrfError = verifySameOriginCsrf(req);
    if (csrfError) return csrfError;

    const body = await req.json();
    const { name, phone, vehicle_type, vehicle_number } = body;

    if (!name || !phone || !vehicle_number) {
      return NextResponse.json(
        { message: 'Name, phone number, and vehicle number are required.' },
        { status: 400 }
      );
    }

    const partner: DeliveryPartner = {
      id: `dp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      phone: phone.trim().replace(/[^0-9]/g, ''),
      vehicle_type: vehicle_type || 'bike',
      vehicle_number: vehicle_number.trim().toUpperCase(),
      is_active: true,
      current_lat: 10.0104,
      current_lng: 77.4768,
      last_location_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const saved = await db.saveDeliveryPartner(partner);
    return NextResponse.json({ success: true, partner: saved });
  } catch (error) {
    console.error('[Delivery Partners API] Error adding partner:', error);
    return NextResponse.json({ message: 'Failed to create delivery partner.' }, { status: 500 });
  }
}
