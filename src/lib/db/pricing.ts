import { Coupon, DeliveryZone, OrderItem, Product } from '@/types';

export const ALLOWED_DELIVERY_SLOTS = [
  '10:00 AM – 01:00 PM',
  '01:00 PM – 04:00 PM',
  '04:00 PM – 07:00 PM',
  '07:00 PM – 09:30 PM',
] as const;

export interface RequestedOrderItemInput {
  product_id: string;
  weight_kg: 0.5 | 1.0;
  eggless: boolean;
  quantity: number;
  custom_message?: string | null;
}

export function validateAndComputeItems(
  requestedItems: RequestedOrderItemInput[],
  productsMap: Map<string, Product>
): { ok: true; subtotalPaise: number; items: OrderItem[] } | { ok: false; error: string } {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { ok: false, error: 'Order must contain at least one cake item.' };
  }

  let subtotalPaise = 0;
  const validatedItems: OrderItem[] = [];

  for (const item of requestedItems) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
      return { ok: false, error: `Invalid quantity (${item.quantity}) for cake item.` };
    }

    if (item.weight_kg !== 0.5 && item.weight_kg !== 1.0) {
      return { ok: false, error: `Invalid cake weight (${item.weight_kg}). Must be 0.5 or 1.0 kg.` };
    }

    const product = productsMap.get(item.product_id);
    if (!product) {
      return { ok: false, error: `Selected cake (${item.product_id}) was not found.` };
    }

    if (!product.is_available) {
      return { ok: false, error: `"${product.name}" is currently unavailable.` };
    }

    const variant = product.variants.find(
      (v) => v.weight_kg === item.weight_kg && v.is_available
    );
    if (!variant || !Number.isInteger(variant.price_paise) || variant.price_paise <= 0) {
      return {
        ok: false,
        error: `Selected weight ${item.weight_kg}kg is unavailable for "${product.name}".`,
      };
    }

    if (item.eggless && !product.is_eggless_available) {
      return {
        ok: false,
        error: `Eggless option is unavailable for "${product.name}".`,
      };
    }

    const egglessCharge = item.eggless ? Math.max(0, product.eggless_extra_paise || 0) : 0;
    const unitPricePaise = variant.price_paise + egglessCharge;
    const lineTotalPaise = unitPricePaise * qty;
    subtotalPaise += lineTotalPaise;

    validatedItems.push({
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      order_id: '',
      product_id: product.id,
      product_name: product.name,
      category_name: product.category_name || 'Cake',
      product_image_snapshot: product.image_url,
      weight_kg: item.weight_kg,
      eggless: Boolean(item.eggless),
      custom_message: item.custom_message ? String(item.custom_message).trim().slice(0, 140) : null,
      unit_price_paise: unitPricePaise,
      quantity: qty,
      line_total_paise: lineTotalPaise,
    });
  }

  return { ok: true, subtotalPaise, items: validatedItems };
}

export function computeServerCouponDiscount(params: {
  coupon: Coupon | null;
  subtotalPaise: number;
  customerPhone: string;
  customerPastOrdersCount: number;
}): { valid: true; discountPaise: number; couponCode: string | null } | { valid: false; error: string } {
  const { coupon, subtotalPaise, customerPhone, customerPastOrdersCount } = params;

  if (!coupon) {
    return { valid: true, discountPaise: 0, couponCode: null };
  }

  if (!coupon.is_active) {
    return { valid: false, error: `Coupon "${coupon.code}" is inactive.` };
  }

  if (subtotalPaise < (coupon.minimum_order_paise || 0)) {
    return {
      valid: false,
      error: `Coupon ${coupon.code} requires a minimum order of ₹${Math.ceil(
        (coupon.minimum_order_paise || 0) / 100
      )}.`,
    };
  }

  const targetType = coupon.target_type || 'all';
  const cleanPhone = customerPhone.replace(/[^0-9]/g, '');

  if (targetType === 'specific_customers') {
    const allowed = (coupon.allowed_phones || []).map((p) => p.replace(/[^0-9]/g, ''));
    if (!cleanPhone || !allowed.includes(cleanPhone)) {
      return {
        valid: false,
        error: 'This coupon is reserved for selected customer phone numbers.',
      };
    }
  }

  if (targetType === 'first_order_only' && customerPastOrdersCount > 0) {
    return {
      valid: false,
      error: 'This welcome coupon is only valid on your first order.',
    };
  }

  let discountPaise = 0;
  if (coupon.discount_type === 'percentage') {
    discountPaise = Math.round((subtotalPaise * coupon.discount_value) / 100);
    if (coupon.maximum_discount_paise && coupon.maximum_discount_paise > 0) {
      discountPaise = Math.min(discountPaise, coupon.maximum_discount_paise);
    }
  } else {
    discountPaise = Math.round(coupon.discount_value * 100);
  }

  discountPaise = Math.max(0, Math.min(discountPaise, subtotalPaise));
  return { valid: true, discountPaise, couponCode: coupon.code };
}

export function computeServerDeliveryCharge(params: {
  fulfilmentType: 'delivery' | 'pickup';
  zone: DeliveryZone | null;
  subtotalPaise: number;
}): { ok: true; deliveryChargePaise: number } | { ok: false; error: string } {
  if (params.fulfilmentType === 'pickup') {
    return { ok: true, deliveryChargePaise: 0 };
  }

  if (!params.zone || !params.zone.is_serviceable) {
    return { ok: false, error: 'Selected pincode is outside our serviceable delivery zones.' };
  }

  if (params.subtotalPaise < (params.zone.minimum_order_paise || 0)) {
    return {
      ok: false,
      error: `Minimum order for delivery to ${params.zone.area_name} is ₹${Math.ceil(
        params.zone.minimum_order_paise / 100
      )}.`,
    };
  }

  return { ok: true, deliveryChargePaise: Math.max(0, params.zone.delivery_charge_paise) };
}
