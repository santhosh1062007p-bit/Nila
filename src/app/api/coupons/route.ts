import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUserFromCookie, requireAdminUser } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { getClientIp } from '@/lib/security/rate-limit';

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(2).max(40),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().int().positive().max(100_000),
  minimum_order_paise: z.number().int().min(0).default(0),
  maximum_discount_paise: z.number().int().min(0).optional(),
  is_active: z.boolean().default(true),
  target_type: z.enum(['all', 'specific_customers', 'first_order_only']).default('all'),
  allowed_phones: z.array(z.string()).optional(),
  description: z.string().max(300).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUserFromCookie();
    const coupons = await db.getCoupons();

    // Only expose customer target phone arrays to authenticated Owner Admin
    if (user?.role === 'admin') {
      return NextResponse.json({ coupons }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const sanitized = coupons
      .filter((c) => c.is_active)
      .map(({ allowed_phones: _ap, ...rest }) => rest);
    return NextResponse.json({ coupons: sanitized });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error retrieving coupons', error: String(error) },
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
    const parsed = couponSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid coupon payload' },
        { status: 400 }
      );
    }

    if (parsed.data.discount_type === 'percentage' && parsed.data.discount_value > 100) {
      return NextResponse.json(
        { message: 'Percentage discount cannot exceed 100%.' },
        { status: 400 }
      );
    }

    const saved = await db.saveCoupon({
      ...parsed.data,
      id: parsed.data.id || `cpn-${Date.now()}`,
      code: parsed.data.code.toUpperCase(),
    });

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'admin',
      action: 'COUPON_SAVED',
      target_type: 'coupon',
      target_id: saved.code,
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ success: true, coupon: saved });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error saving coupon', error: String(error) },
      { status: 500 }
    );
  }
}
