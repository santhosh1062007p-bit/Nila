import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay/client';

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        method?: string;
        error_code?: string;
        error_description?: string;
        notes?: { internal_order_id?: string };
      };
    };
    order?: {
      entity?: {
        id?: string;
        amount?: number;
        amount_paid?: number;
        receipt?: string;
        notes?: { internal_order_id?: string };
      };
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Always read the EXACT original raw request body BEFORE parsing
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-razorpay-signature');

    // 2. Cryptographically verify webhook signature
    const valid = verifyRazorpayWebhookSignature({ rawBody, signatureHeader });
    if (!valid) {
      return NextResponse.json(
        { message: 'Invalid Razorpay webhook signature' },
        { status: 401 }
      );
    }

    const parsed = JSON.parse(rawBody) as RazorpayWebhookPayload;
    const eventType = parsed.event || 'unknown';
    const paymentEntity = parsed.payload?.payment?.entity;
    const orderEntity = parsed.payload?.order?.entity;

    const rzpOrderId = paymentEntity?.order_id || orderEntity?.id || null;
    const rzpPaymentId = paymentEntity?.id || null;

    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const eventId =
      req.headers.get('x-razorpay-event-id') ||
      `${eventType}:${rzpOrderId || 'none'}:${rzpPaymentId || payloadHash.slice(0, 16)}`;

    // 3. Idempotent event lock: duplicate webhooks are acknowledged safely with 200 OK
    const isNew = await db.recordWebhookIfNew({
      provider: 'razorpay',
      event_id: eventId,
      event_type: eventType,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      signature_verified: true,
      status: 'processed',
      payload_hash: payloadHash,
    });

    if (!isNew) {
      return NextResponse.json({ received: true, duplicate: true, eventId });
    }

    if (!rzpOrderId) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const paymentRecord = await db.getPaymentByRazorpayOrderId(rzpOrderId);
    const internalOrderId =
      paymentRecord?.order_id ||
      paymentEntity?.notes?.internal_order_id ||
      orderEntity?.notes?.internal_order_id ||
      orderEntity?.receipt ||
      null;

    if (!internalOrderId) {
      return NextResponse.json({ received: true, orderFound: false });
    }

    const order = await db.getOrderById(internalOrderId);
    if (!order) {
      return NextResponse.json({ received: true, orderFound: false });
    }

    // 4. Process supported payment lifecycle events
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paidAmount = paymentEntity?.amount ?? orderEntity?.amount_paid ?? order.total_paise;
      if (paidAmount < order.total_paise) {
        await db.recordAudit({
          actor_id: 'razorpay_webhook',
          actor_role: 'system',
          action: 'WEBHOOK_AMOUNT_MISMATCH',
          target_type: 'order',
          target_id: order.id,
          metadata: { expected: order.total_paise, received: paidAmount, eventId },
        });
        return NextResponse.json(
          { received: true, warning: 'Amount mismatch' },
          { status: 400 }
        );
      }

      await db.updatePaymentByRzpOrder(rzpOrderId, {
        razorpay_payment_id: rzpPaymentId,
        status: 'captured',
        method: paymentEntity?.method || null,
      });

      if (order.payment_status !== 'paid') {
        await db.updatePaymentStatus(order.id, 'paid');
      }
      if (order.order_status === 'Order Placed') {
        await db.updateOrderStatus(
          order.id,
          'Order Confirmed',
          { id: null, role: 'webhook:razorpay' },
          `Confirmed via webhook (${eventType})`
        );
      }
    } else if (eventType === 'payment.failed') {
      await db.updatePaymentByRzpOrder(rzpOrderId, {
        razorpay_payment_id: rzpPaymentId,
        status: 'failed',
        error_code: paymentEntity?.error_code || 'PAYMENT_FAILED',
        error_description: paymentEntity?.error_description || 'Payment failed',
      });

      // Only mark order failed if it hasn't already succeeded via another retry attempt
      if (order.payment_status !== 'paid') {
        await db.updatePaymentStatus(order.id, 'failed');
      }
    }

    await db.recordAudit({
      actor_id: 'razorpay_webhook',
      actor_role: 'system',
      action: `WEBHOOK_${eventType.toUpperCase()}`,
      target_type: 'order',
      target_id: order.id,
      metadata: { eventId, rzpOrderId, rzpPaymentId },
    });

    return NextResponse.json({ received: true, eventId, orderId: order.id });
  } catch (error) {
    return NextResponse.json(
      { message: 'Webhook processing error', error: String(error) },
      { status: 500 }
    );
  }
}
