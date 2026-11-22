import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdminUser } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { getClientIp } from '@/lib/security/rate-limit';

const variantSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional(),
  weight_kg: z.union([z.literal(0.5), z.literal(1), z.literal(1.0)]),
  price_paise: z.number().int().positive().max(10_000_000),
  is_available: z.boolean().default(true),
});

const productSaveSchema = z.object({
  id: z.string().optional(),
  category_id: z.string().min(1).optional(),
  category_name: z.string().optional(),
  category_slug: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  image_url: z.string().trim().min(1).max(500).optional(),
  is_eggless_available: z.boolean().optional(),
  eggless_extra_paise: z.number().int().min(0).max(500_000).optional(),
  is_price_market_dependent: z.boolean().optional(),
  is_available: z.boolean().optional(),
  is_bestseller: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  variants: z.array(variantSchema).min(1).max(4).optional(),
});

const availabilitySchema = z.object({
  id: z.string().min(1),
  is_available: z.boolean(),
});

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const parsed = productSaveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid product payload' },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const saved = await db.saveProduct({
      ...body,
      variants: body.variants?.map((v) => ({
        id: v.id || `var-${Date.now()}-${v.weight_kg}`,
        product_id: body.id || '',
        weight_kg: v.weight_kg as 0.5 | 1.0,
        price_paise: v.price_paise,
        is_available: v.is_available,
      })),
    });

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'admin',
      action: body.id ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
      target_type: 'product',
      target_id: saved.id,
      ip_address: getClientIp(req),
      user_agent: req.headers.get('user-agent'),
      metadata: { name: saved.name },
    });

    return NextResponse.json({ success: true, product: saved });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to save product', error: String(error) },
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
    const parsed = availabilitySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid availability update' }, { status: 400 });
    }

    const updated = await db.updateProductAvailability(parsed.data.id, parsed.data.is_available);
    if (!updated) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'admin',
      action: 'PRODUCT_AVAILABILITY_CHANGED',
      target_type: 'product',
      target_id: parsed.data.id,
      ip_address: getClientIp(req),
      metadata: { is_available: parsed.data.is_available },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update availability', error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Missing product id' }, { status: 400 });

    const success = await db.deleteProduct(id);
    if (success) {
      await db.recordAudit({
        actor_id: auth.user.userId,
        actor_role: 'admin',
        action: 'PRODUCT_DELETED',
        target_type: 'product',
        target_id: id,
        ip_address: getClientIp(req),
      });
    }

    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete product', error: String(error) },
      { status: 500 }
    );
  }
}
