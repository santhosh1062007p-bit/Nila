import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';

function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

const indianMobileSchema = z
  .string()
  .trim()
  .transform(normalizeIndianPhone)
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');

const createAddressSchema = z
  .object({
    address_type: z.enum(['Home', 'Work', 'Other']).optional(),
    label: z.string().trim().min(1).max(30).optional(),
    recipient_name: z.string().trim().min(2, 'Full name is required').max(100),
    phone: indianMobileSchema,
    alternate_phone: z
      .string()
      .trim()
      .transform((v) => (v ? normalizeIndianPhone(v) : ''))
      .refine((v) => v === '' || /^[6-9]\d{9}$/.test(v), 'Alternate mobile must be 10 digits')
      .optional()
      .nullable(),
    house_no: z.string().trim().max(120).optional(),
    street_name: z.string().trim().max(160).optional(),
    area_locality: z.string().trim().max(120).optional(),
    address_line1: z.string().trim().max(200).optional(),
    address_line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(60).optional(),
    district: z.string().trim().min(2).max(60).optional(),
    state: z.string().trim().min(2).max(60).optional().default('Tamil Nadu'),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
    landmark: z.string().trim().max(120).optional(),
    is_default: z.boolean().optional().default(false),
  })
  .refine(
    (d) =>
      Boolean(
        (d.address_line1 && d.address_line1.length >= 3) ||
          (d.house_no && d.house_no.length >= 1)
      ),
    {
      message: 'House / Flat / Building details are required.',
      path: ['house_no'],
    }
  );

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const addresses = await db.getAddressesByUserId(auth.user.userId);
  return NextResponse.json(
    { addresses },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'addresses-write', 30, 60_000);
  if (rateErr) return rateErr;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  try {
    const parsed = createAddressSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid delivery address.' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const addrType =
      d.address_type ||
      (d.label === 'Work' || d.label === 'Other' ? d.label : 'Home');
    const resolvedLine1 =
      d.address_line1 && d.address_line1.length >= 3
        ? d.address_line1
        : [d.house_no, d.street_name].filter(Boolean).join(', ');
    const resolvedLine2 = d.address_line2 || d.area_locality || d.street_name || undefined;
    const resolvedCity = d.city || d.area_locality || d.district || 'Theni';

    const saved = await db.saveAddress(auth.user.userId, {
      label: d.label || addrType,
      address_type: addrType,
      recipient_name: d.recipient_name,
      phone: d.phone,
      alternate_phone: d.alternate_phone || null,
      house_no: d.house_no || resolvedLine1,
      street_name: d.street_name || d.address_line2 || undefined,
      area_locality: d.area_locality || resolvedCity,
      address_line1: resolvedLine1,
      address_line2: resolvedLine2,
      city: resolvedCity,
      district: d.district || resolvedCity,
      state: d.state,
      pincode: d.pincode,
      landmark: d.landmark,
      is_default: d.is_default,
    });

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: auth.user.role,
      action: 'ADDRESS_CREATED',
      target_type: 'address',
      target_id: saved.id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json(
      { success: true, address: saved },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'Failed to save address' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ message: 'Address id is required' }, { status: 400 });
  }

  const result = await db.deleteAddressSafe(auth.user.userId, id);
  if (!result.ok) {
    if (result.reason === 'default_has_other') {
      return NextResponse.json(
        {
          message:
            'Cannot delete your default address while other addresses exist. Set another address as default first.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: 'Address not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
