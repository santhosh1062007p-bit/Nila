import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  generateGuestOrderToken,
  getCurrentUserFromCookie,
  requireAuthenticatedUser,
} from '@/lib/auth/jwt';
import { generateOrderCode } from '@/lib/utils';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import {
  ALLOWED_DELIVERY_SLOTS,
  computeServerCouponDiscount,
  computeServerDeliveryCharge,
  validateAndComputeItems,
} from '@/lib/db/pricing';
import { Order, Product } from '@/types';

const orderItemInputSchema = z.object({
  product_id: z.string().min(1),
  weight_kg: z.union([z.literal(0.5), z.literal(1), z.literal(1.0)]),
  eggless: z.boolean().default(false),
  quantity: z.number().int().min(1).max(50),
  custom_message: z.string().max(140).optional().nullable(),
});

const addressInputSchema = z.object({
  recipient_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(20),
  alternate_phone: z.string().trim().max(20).optional().nullable(),
  house_no: z.string().trim().max(120).optional(),
  street_name: z.string().trim().max(160).optional(),
  area_locality: z.string().trim().max(120).optional(),
  address_line1: z.string().trim().min(3).max(200),
  address_line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(60).default('Theni'),
  district: z.string().trim().max(60).optional(),
  state: z.string().trim().min(2).max(60).default('Tamil Nadu'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  landmark: z.string().trim().max(120).optional().nullable(),
  address_type: z.enum(['Home', 'Work', 'Other']).optional(),
});

const createOrderSchema = z.object({
  customer_name: z.string().trim().min(2, 'Customer name is required').max(100),
  customer_phone: z.string().trim().min(10, 'Valid 10-digit phone number is required').max(20),
  customer_email: z.string().trim().email().optional().nullable().or(z.literal('')),
  fulfilment_type: z.enum(['delivery', 'pickup']),
  payment_method: z.enum(['razorpay', 'cod']),
  delivery_pincode: z.string().trim().optional().nullable(),
  delivery_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid delivery date'),
  delivery_slot: z.string().trim().min(3).max(60),
  special_instructions: z.string().trim().max(400).optional().nullable(),
  coupon_code: z.string().trim().max(40).optional().nullable(),
  idempotency_key: z.string().trim().min(8).max(100).optional().nullable(),
  save_address: z.boolean().optional().default(false),
  update_address_id: z.string().trim().max(80).optional().nullable(),
  address_label: z.string().trim().max(30).optional().default('Home'),
  address: addressInputSchema.optional().nullable(),
  items: z.array(orderItemInputSchema).min(1, 'At least one cake item is required').max(30),
});

function sanitizeOrderForClient(order: Order): Omit<Order, 'guest_access_token_hash'> {
  const { guest_access_token_hash: _hash, ...safe } = order;
  return safe;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const phoneParam = searchParams.get('phone');

    let orders: Order[];
    if (auth.user.role === 'admin') {
      orders = phoneParam ? await db.getOrdersByPhone(phoneParam) : await db.getOrders();
    } else {
      // Strictly scope customers to their own orders ONLY (IDOR prevention)
      orders = await db.getOrdersForUser(auth.user.userId, auth.user.phone);
    }

    return NextResponse.json(
      { orders: orders.map(sanitizeOrderForClient) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch orders', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'create-order', 20, 60_000);
  if (rateErr) return rateErr;

  try {
    const rawBody = await req.json();
    const parsed = createOrderSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid checkout input.' },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const cleanPhone = input.customer_phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { message: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    // Block Bakery Owner contact info in customer orders
    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9344597833';
    const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@nilastreat.com').toLowerCase();
    if (
      cleanPhone === adminPhone ||
      (input.customer_email && input.customer_email.trim().toLowerCase() === adminEmail)
    ) {
      return NextResponse.json(
        {
          message:
            'Owner credentials cannot be used to place customer orders. Please enter customer details.',
        },
        { status: 400 }
      );
    }

    // Validate delivery slot against allowed slots
    if (!ALLOWED_DELIVERY_SLOTS.includes(input.delivery_slot as (typeof ALLOWED_DELIVERY_SLOTS)[number])) {
      return NextResponse.json(
        { message: 'Please select a valid delivery/pickup time slot.' },
        { status: 400 }
      );
    }

    const settings = await db.getStoreSettings();
    if (input.payment_method === 'cod' && !settings.is_cod_enabled) {
      return NextResponse.json(
        { message: 'Cash on Delivery is currently disabled by the bakery.' },
        { status: 400 }
      );
    }
    if (input.fulfilment_type === 'pickup' && !settings.is_pickup_enabled) {
      return NextResponse.json(
        { message: 'Store pickup is currently unavailable.' },
        { status: 400 }
      );
    }

    // Load trusted products from DB and recompute prices 100% server-side
    const allProducts = await db.getProducts(true);
    const productMap = new Map<string, Product>(allProducts.map((p) => [p.id, p]));

    const itemValidation = validateAndComputeItems(
      input.items.map((it) => ({
        product_id: it.product_id,
        weight_kg: it.weight_kg as 0.5 | 1.0,
        eggless: it.eggless,
        quantity: it.quantity,
        custom_message: it.custom_message,
      })),
      productMap
    );

    if (!itemValidation.ok) {
      return NextResponse.json({ message: itemValidation.error }, { status: 400 });
    }

    // Delivery fee verification strictly server-side
    let zone = null;
    if (input.fulfilment_type === 'delivery') {
      if (!input.delivery_pincode || !input.address) {
        return NextResponse.json(
          { message: 'Delivery address and serviceable pincode are required for home delivery.' },
          { status: 400 }
        );
      }
      zone = await db.getDeliveryZoneByPincode(input.delivery_pincode);
    }

    const deliveryCalc = computeServerDeliveryCharge({
      fulfilmentType: input.fulfilment_type,
      zone,
      subtotalPaise: itemValidation.subtotalPaise,
    });
    if (!deliveryCalc.ok) {
      return NextResponse.json({ message: deliveryCalc.error }, { status: 400 });
    }

    // Coupon discount validation strictly server-side (ignore client discount_paise completely)
    let coupon = null;
    if (input.coupon_code && input.coupon_code.trim()) {
      coupon = await db.getCouponByCode(input.coupon_code.trim());
      if (!coupon) {
        return NextResponse.json(
          { message: `Coupon code "${input.coupon_code}" does not exist.` },
          { status: 400 }
        );
      }
    }

    const pastOrders = await db.getOrdersByPhone(cleanPhone);
    const couponCalc = computeServerCouponDiscount({
      coupon,
      subtotalPaise: itemValidation.subtotalPaise,
      customerPhone: cleanPhone,
      customerPastOrdersCount: pastOrders.length,
    });
    if (!couponCalc.valid) {
      return NextResponse.json({ message: couponCalc.error }, { status: 400 });
    }

    const computedTotalPaise = Math.max(
      0,
      itemValidation.subtotalPaise + deliveryCalc.deliveryChargePaise - couponCalc.discountPaise
    );

    const sessionUser = await getCurrentUserFromCookie();
    const userId = sessionUser?.role === 'customer' ? sessionUser.userId : null;
    const guestTokens = generateGuestOrderToken();

    const { order, deduplicated } = await db.createOrder({
      order_code: generateOrderCode(),
      user_id: userId,
      guest_access_token_hash: guestTokens.tokenHash,
      idempotency_key: input.idempotency_key || null,
      customer_name: input.customer_name,
      customer_phone: cleanPhone,
      customer_email: input.customer_email?.trim() || null,
      fulfilment_type: input.fulfilment_type,
      order_status: 'Order Placed',
      payment_method: input.payment_method,
      payment_status: 'pending',
      subtotal_paise: itemValidation.subtotalPaise,
      delivery_charge_paise: deliveryCalc.deliveryChargePaise,
      discount_paise: couponCalc.discountPaise,
      coupon_code: couponCalc.couponCode,
      total_paise: computedTotalPaise,
      delivery_pincode: input.fulfilment_type === 'delivery' ? input.delivery_pincode || null : null,
      delivery_address_snapshot:
        input.fulfilment_type === 'delivery' && input.address
          ? {
              id: `addr-snap-${Date.now()}`,
              recipient_name: input.address.recipient_name,
              phone: input.address.phone,
              address_line1: input.address.address_line1,
              address_line2: input.address.address_line2 || undefined,
              city: input.address.city,
              state: input.address.state,
              pincode: input.address.pincode,
              landmark: input.address.landmark || undefined,
            }
          : null,
      delivery_date: input.delivery_date,
      delivery_slot: input.delivery_slot,
      special_instructions: input.special_instructions || null,
      items: itemValidation.items,
    });

    // Optionally save or update customer address ONLY when explicitly confirmed
    if (userId && input.save_address && input.fulfilment_type === 'delivery' && input.address) {
      const addrType =
        input.address.address_type ||
        (input.address_label === 'Work' || input.address_label === 'Other'
          ? input.address_label
          : 'Home');
      const addrPayload = {
        label: input.address_label || addrType,
        address_type: addrType,
        recipient_name: input.address.recipient_name,
        phone: input.address.phone.replace(/[^0-9]/g, '').slice(-10),
        alternate_phone: input.address.alternate_phone || null,
        house_no: input.address.house_no || input.address.address_line1,
        street_name: input.address.street_name || input.address.address_line2 || undefined,
        area_locality: input.address.area_locality || input.address.city,
        address_line1: input.address.address_line1,
        address_line2: input.address.address_line2,
        city: input.address.city,
        district: input.address.district || input.address.city,
        state: input.address.state,
        pincode: input.address.pincode,
        landmark: input.address.landmark || undefined,
        is_default: true,
      };
      if (input.update_address_id) {
        const updatedAddr = await db.updateAddress(userId, input.update_address_id, addrPayload);
        if (!updatedAddr) {
          await db.saveAddress(userId, addrPayload);
        }
      } else {
        await db.saveAddress(userId, addrPayload);
      }
    }

    if (!deduplicated) {
      await db.recordAudit({
        actor_id: userId || `guest:${cleanPhone}`,
        actor_role: userId ? 'customer' : 'guest',
        action: 'ORDER_CREATED',
        target_type: 'order',
        target_id: order.id,
        ip_address: getClientIp(req),
        metadata: {
          order_code: order.order_code,
          total_paise: order.total_paise,
          payment_method: order.payment_method,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        deduplicated,
        order: sanitizeOrderForClient(order),
        guestAccessToken: deduplicated ? undefined : guestTokens.rawToken,
      },
      { status: deduplicated ? 200 : 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Order creation failed', error: String(error) },
      { status: 500 }
    );
  }
}
