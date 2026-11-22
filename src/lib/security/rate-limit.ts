import { NextRequest, NextResponse } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __nilasRateLimitBuckets?: Map<string, Bucket>;
};

const buckets =
  globalForRateLimit.__nilasRateLimitBuckets ||
  (globalForRateLimit.__nilasRateLimitBuckets = new Map<string, Bucket>());

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(config.key);

  // Periodic cleanup if map grows
  if (buckets.size > 5000) {
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    buckets.set(config.key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, config.limit - 1),
      limit: config.limit,
      resetAt,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  existing.count += 1;
  const allowed = existing.count <= config.limit;
  return {
    allowed,
    remaining: Math.max(0, config.limit - existing.count),
    limit: config.limit,
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function enforceRateLimit(
  req: NextRequest,
  scope: string,
  limit = 20,
  windowMs = 60_000
): NextResponse | null {
  // Exempt test harness override only if explicit test header disabled rate limit? Never bypass in prod.
  const ip = getClientIp(req);
  const res = checkRateLimit({
    key: `${scope}:${ip}`,
    limit,
    windowMs,
  });

  if (!res.allowed) {
    return NextResponse.json(
      {
        message: 'Too many requests. Please wait a moment and try again.',
        retryAfterSeconds: res.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(res.retryAfterSeconds),
          'X-RateLimit-Limit': String(res.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null;
}

export function clearRateLimitsForTest(): void {
  buckets.clear();
}
