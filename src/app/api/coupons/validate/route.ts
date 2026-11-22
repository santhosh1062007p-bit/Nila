import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const amountStr = searchParams.get('amount');
    const phone = searchParams.get('phone');
    const amountPaise = amountStr ? parseInt(amountStr, 10) : 0;

    if (!code) {
      return NextResponse.json({ valid: false, message: 'Please provide a coupon code' }, { status: 400 });
    }

    const coupon = await db.getCouponByCode(code);
    if (!coupon || !coupon.is_active) {
      return NextResponse.json({ valid: false, message: 'Invalid or inactive coupon code' }, { status: 404 });
    }

    // Check minimum order amount
    if (amountPaise < coupon.minimum_order_paise) {
      return NextResponse.json(
        {
          valid: false,
          message: `Coupon ${coupon.code} requires a minimum order of ₹${coupon.minimum_order_paise / 100}`,
        },
        { status: 400 }
      );
    }

    // Check Owner's Audience Targeting
    const targetType = coupon.target_type || 'all';

    // 1. If assigned to specific customers
    if (targetType === 'specific_customers') {
      if (!phone) {
        return NextResponse.json(
          {
            valid: false,
            message: 'Please enter your mobile number in checkout to apply this special coupon.',
          },
          { status: 400 }
        );
      }

      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const allowed = coupon.allowed_phones || [];
      const isAllowed = allowed.some((p) => p.replace(/[^0-9]/g, '') === cleanPhone);

      if (!isAllowed) {
        return NextResponse.json(
          {
            valid: false,
            message: 'This coupon is exclusively reserved by the bakery for selected customer mobile numbers.',
          },
          { status: 403 }
        );
      }
    }

    // 2. If assigned to first order only
    if (targetType === 'first_order_only') {
      if (phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const pastOrders = await db.getOrdersByPhone(cleanPhone);
        if (pastOrders.length > 0) {
          return NextResponse.json(
            {
              valid: false,
              message: 'This welcome coupon is only valid for your very first order.',
            },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json({ valid: true, coupon });
  } catch (error) {
    return NextResponse.json(
      { valid: false, message: 'Coupon validation failed', error: String(error) },
      { status: 500 }
    );
  }
}
