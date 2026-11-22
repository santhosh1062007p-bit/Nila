import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminUser } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { getClientIp } from '@/lib/security/rate-limit';

const settingsPatchSchema = z.object({
  store_name: z.string().trim().min(2).max(100).optional(),
  tagline: z.string().trim().max(200).optional(),
  location: z.string().trim().max(150).optional(),
  primary_phone: z.string().trim().max(25).optional(),
  secondary_phone: z.string().trim().max(25).optional(),
  instagram_handle: z.string().trim().max(80).optional(),
  facebook_page: z.string().trim().max(150).optional(),
  shop_address: z.string().trim().max(400).optional(),
  is_pickup_enabled: z.boolean().optional(),
  is_cod_enabled: z.boolean().optional(),
  global_eggless_surcharge_paise: z.number().int().min(0).max(200_000).optional(),
  opening_time: z.string().trim().max(30).optional(),
  closing_time: z.string().trim().max(30).optional(),
});

export async function GET() {
  try {
    const settings = await db.getStoreSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error retrieving store settings', error: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const parsed = settingsPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid store settings update' },
        { status: 400 }
      );
    }

    const updated = await db.updateStoreSettings(parsed.data);

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'admin',
      action: 'STORE_SETTINGS_UPDATED',
      target_type: 'settings',
      target_id: 'default',
      ip_address: getClientIp(req),
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error updating store settings', error: String(error) },
      { status: 500 }
    );
  }
}
