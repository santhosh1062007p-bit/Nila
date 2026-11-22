import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifies Origin / Referer on state-changing browser requests to defend against CSRF.
 */
export function verifySameOriginCsrf(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return null;
  }

  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  // If browser sent an Origin header, enforce host match
  if (origin && host) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      const expectedHost = host.toLowerCase();
      if (originHost !== expectedHost) {
        return NextResponse.json(
          { message: 'CSRF validation failed: cross-origin request rejected.' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { message: 'Invalid Origin header.' },
        { status: 403 }
      );
    }
  }

  return null;
}

export function buildSecurityHeaders(isProd: boolean): Record<string, string> {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://res.cloudinary.com https://*.r2.dev https://*.amazonaws.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://checkout.razorpay.com",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  const headers: Record<string, string> = {
    'Content-Security-Policy': cspDirectives.join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-DNS-Prefetch-Control': 'on',
  };

  if (isProd) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}
