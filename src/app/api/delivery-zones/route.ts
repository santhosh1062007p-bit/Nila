import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminUser } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { getClientIp } from '@/lib/security/rate-limit';

const deliveryZoneSchema = z.object({
  id: z.string().optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  area_name: z.string().trim().min(2).max(120),
  delivery_charge_paise: z.number().int().min(0).max(500_000),
  minimum_order_paise: z.number().int().min(0).max(5_000_000).default(0),
  is_serviceable: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get('pincode');

    if (pincode) {
      const zone = await db.getDeliveryZoneByPincode(pincode);
      if (zone) {
        return NextResponse.json({ zone });
      }
      return NextResponse.json(
        { message: `Pincode ${pincode} is outside configured delivery zones in Theni` },
        { status: 404 }
      );
    }

    const zones = await db.getDeliveryZones();
    return NextResponse.json({ zones });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error retrieving delivery zones', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const parsed = deliveryZoneSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid delivery zone payload' },
        { status: 400 }
      );
    }

    const saved = await db.updateDeliveryZone({
      ...parsed.data,
      id: parsed.data.id || `dz-${Date.now()}`,
    });

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'admin',
      action: 'DELIVERY_ZONE_UPDATED',
      target_type: 'delivery_zone',
      target_id: saved.pincode,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ success: true, zone: saved });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update delivery zone', error: String(error) },
      { status: 500 }
    );
  }
}
