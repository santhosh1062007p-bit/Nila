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

const updateAddressSchema = z.object({
  address_type: z.enum(['Home', 'Work', 'Other']).optional(),
  label: z.string().trim().min(1).max(30).optional(),
  recipient_name: z.string().trim().min(2, 'Full name is required').max(100).optional(),
  phone: indianMobileSchema.optional(),
  alternate_phone: z
    .string()
    .trim()
    .transform((v) => (v ? normalizeIndianPhone(v) : ''))
    .refine((v) => v === '' || /^[6-9]\d{9}$/.test(v), 'Alternate mobile must be 10 digits')
    .optional()
    .nullable(),
  house_no: z.string().trim().min(1).max(120).optional(),
  street_name: z.string().trim().min(2).max(160).optional(),
  area_locality: z.string().trim().min(2).max(120).optional(),
  address_line1: z.string().trim().min(3).max(200).optional(),
  address_line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(60).optional(),
  district: z.string().trim().min(2).max(60).optional(),
  state: z.string().trim().min(2).max(60).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code').optional(),
  landmark: z.string().trim().max(120).optional(),
  is_default: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'addresses-write', 30, 60_000);
  if (rateErr) return rateErr;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const parsed = updateAddressSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid address data.' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const resolvedLine1 =
      data.address_line1 ||
      (data.house_no && data.street_name
        ? `${data.house_no}, ${data.street_name}`
        : data.house_no);

    const updated = await db.updateAddress(auth.user.userId, id, {
      ...data,
      ...(resolvedLine1 ? { address_line1: resolvedLine1 } : {}),
      ...(data.area_locality && !data.address_line2 ? { address_line2: data.area_locality } : {}),
      ...(data.district && !data.city ? { city: data.district } : {}),
      ...(data.address_type ? { label: data.address_type } : {}),
    });

    if (!updated) {
      return NextResponse.json(
        { message: 'Address not found or access denied.' },
        { status: 404 }
      );
    }

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: auth.user.role,
      action: 'ADDRESS_UPDATED',
      target_type: 'address',
      target_id: updated.id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json(
      { success: true, address: updated },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'Failed to update address' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
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

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: auth.user.role,
      action: 'ADDRESS_DELETED',
      target_type: 'address',
      target_id: id,
      ip_address: getClientIp(req),
    });

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'Failed to delete address' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
