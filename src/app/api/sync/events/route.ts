import { NextRequest } from 'next/server';
import { subscribeToSyncEvents } from '@/lib/db';
import { getCurrentUserFromCookie } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromCookie();
  const isAdmin = user?.role === 'admin';
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Initial connection heartbeat
      safeEnqueue(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

      // Keep-alive ping every 25s for reverse proxies & Cloudflare tunnels
      const heartbeat = setInterval(() => {
        safeEnqueue(`: keepalive ${Date.now()}\n\n`);
      }, 25_000);

      const unsubscribe = subscribeToSyncEvents((event) => {
        // 1. Catalog & Store wide public events
        const isCatalogEvent =
          event.type.startsWith('PRODUCT_') ||
          event.type === 'STORE_SETTINGS_UPDATED' ||
          event.type === 'DELIVERY_ZONE_UPDATED' ||
          event.type === 'COUPON_UPDATED';

        if (isCatalogEvent) {
          if (
            event.type === 'COUPON_UPDATED' &&
            !isAdmin &&
            event.data &&
            typeof event.data === 'object'
          ) {
            const sanitized = { ...(event.data as Record<string, unknown>) };
            delete sanitized.allowed_phones;
            safeEnqueue(`data: ${JSON.stringify({ ...event, data: sanitized })}\n\n`);
            return;
          }
          safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
          return;
        }

        // 2. Customer login events (Owner desk only)
        if (event.type === 'CUSTOMER_LOGGED_IN') {
          if (isAdmin) {
            safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
          }
          return;
        }

        // 3. User profile and address invalidation signals (Strict tenant isolation)
        if (event.type === 'USER_PROFILE_UPDATED' || event.type === 'USER_ADDRESSES_UPDATED') {
          const evtData = (event.data || {}) as { userId?: string };
          if (isAdmin || (user && user.userId === evtData.userId)) {
            safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
          }
          return;
        }

        // 4. Order events
        if (event.type.startsWith('ORDER_')) {
          if (isAdmin) {
            safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
            return;
          }

          // For customer view / live tracker, emit minimal order status signal (Never customer PII)
          const evtData = (event.data || {}) as {
            orderId?: string;
            status?: string;
            paymentStatus?: string;
            order?: {
              id?: string;
              order_status?: string;
              payment_status?: string;
              user_id?: string;
              customer_phone?: string;
            };
          };

          const orderId = evtData.orderId || evtData.order?.id;
          if (orderId) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: event.type,
                data: {
                  orderId,
                  status: evtData.status || evtData.order?.order_status,
                  paymentStatus: evtData.paymentStatus || evtData.order?.payment_status,
                },
                timestamp: event.timestamp,
              })}\n\n`
            );
          }
          return;
        }

        // Any other domain event
        if (isAdmin) {
          safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
        }
      });

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
