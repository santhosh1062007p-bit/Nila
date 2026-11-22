import { NextResponse } from 'next/server';
import { isPostgresReady } from '@/db/client';
import { isRazorpayConfigured } from '@/lib/razorpay/client';
import { shouldRequirePostgres } from '@/lib/env';

export async function GET() {
  let pgHealthy = false;
  let dbError: string | null = null;

  try {
    pgHealthy = await isPostgresReady();
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const status = shouldRequirePostgres() && !pgHealthy ? 503 : 200;

  return NextResponse.json(
    {
      status: status === 200 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: pgHealthy ? 'postgresql' : shouldRequirePostgres() ? 'unavailable' : 'dev_local',
      razorpayConfigured: isRazorpayConfigured(),
      ...(dbError ? { error: dbError } : {}),
    },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}
