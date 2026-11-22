import { NextRequest, NextResponse } from 'next/server';
import { removeAuthCookie } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  await removeAuthCookie();
  return NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
