import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getAuthSecretBytes, isProductionMode } from '@/lib/env';
import { buildSecurityHeaders } from '@/lib/security/csrf';

const PUBLIC_ADMIN_PATHS = new Set([
  '/admin/login',
  '/api/admin/auth/login',
  '/api/admin/auth/mfa',
]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const securityHeaders = buildSecurityHeaders(isProductionMode());

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');
  const isProtectedAccountPage = pathname === '/account' || pathname.startsWith('/account/');

  if (isProtectedAccountPage) {
    const token = req.cookies.get('nilas_auth_token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    try {
      await jwtVerify(token, getAuthSecretBytes());
    } catch {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if ((isAdminPage || isAdminApi) && !PUBLIC_ADMIN_PATHS.has(pathname)) {
    const token = req.cookies.get('nilas_auth_token')?.value;

    if (!token) {
      if (isAdminApi) {
        return NextResponse.json({ message: 'Owner authentication required.' }, { status: 401, headers: securityHeaders });
      }
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, getAuthSecretBytes());
      if (payload.role !== 'admin') {
        if (isAdminApi) {
          return NextResponse.json({ message: 'Forbidden: Owner role required.' }, { status: 403, headers: securityHeaders });
        }
        const loginUrl = new URL('/admin/login', req.url);
        loginUrl.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(loginUrl);
      }
    } catch {
      if (isAdminApi) {
        return NextResponse.json({ message: 'Invalid or expired session.' }, { status: 401, headers: securityHeaders });
      }
      const loginUrl = new URL('/admin/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();
  for (const [k, v] of Object.entries(securityHeaders)) {
    response.headers.set(k, v);
  }
  return response;
}

export default proxy;
export const middleware = proxy;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
