import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Role, User } from '@/types';
import { getAuthSecretBytes, isProductionMode } from '@/lib/env';
import { db } from '@/lib/db';

const COOKIE_NAME = 'nilas_auth_token';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface TokenPayload {
  jti: string;
  userId: string;
  phone: string;
  email: string | null;
  role: Role;
  fullName: string;
  mfaVerified?: boolean;
}

export async function createSessionAndToken(
  user: Pick<User, 'id' | 'phone' | 'email' | 'role' | 'full_name'>,
  opts?: {
    mfaVerified?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<{ token: string; sessionId: string }> {
  const sessionId = `sess-${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  await db.createSession({
    id: sessionId,
    subject_id: user.id,
    subject_role: user.role,
    mfa_verified: opts?.mfaVerified ?? user.role === 'customer',
    ip_address: opts?.ipAddress || null,
    user_agent: opts?.userAgent || null,
    revoked_at: null,
    expires_at: expiresAt,
  });

  const token = await new SignJWT({
    jti: sessionId,
    userId: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    mfaVerified: opts?.mfaVerified ?? user.role === 'customer',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getAuthSecretBytes());

  return { token, sessionId };
}

/**
 * Legacy-compatible helper for creating a signed token with a session row.
 */
export async function createAuthToken(user: User): Promise<string> {
  const { token } = await createSessionAndToken(user);
  return token;
}

export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretBytes());
    const data = payload as unknown as TokenPayload;
    if (!data.jti || !data.userId || !data.role) return null;

    // Verify session has not been revoked or expired server-side
    const session = await db.getSessionById(data.jti);
    if (session) {
      if (session.revoked_at) return null;
      if (new Date(session.expires_at).getTime() <= Date.now()) return null;
      data.mfaVerified = session.mfa_verified;
    } else if (isProductionMode()) {
      // In production, require matching non-revoked session row in PostgreSQL
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function getCurrentUserFromCookie(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyAuthToken(token);
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string, req?: NextRequest) {
  const cookieStore = await cookies();
  const isHttps =
    req?.nextUrl?.protocol === 'https:' ||
    req?.headers?.get('x-forwarded-proto') === 'https';

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProductionMode() || Boolean(isHttps),
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getAuthSecretBytes());
      if (payload.jti) {
        await db.revokeSession(String(payload.jti));
      }
    } catch {
      // Clear cookie regardless of token state
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Enforce authenticated customer/admin route access server-side.
 */
export async function requireAuthenticatedUser(): Promise<
  { ok: true; user: TokenPayload } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Authentication required.' }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

/**
 * Enforce strict Admin/Owner authorization (including MFA when enabled).
 */
export async function requireAdminUser(): Promise<
  { ok: true; user: TokenPayload } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUserFromCookie();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ message: 'Owner authentication required.' }, { status: 401 }),
    };
  }
  if (user.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Forbidden: Owner administrator privileges required.' },
        { status: 403 }
      ),
    };
  }

  const mfaRequired =
    process.env.ADMIN_MFA_REQUIRED === 'true' ||
    Boolean((await db.getAdminUserById(user.userId))?.mfa_enabled);

  if (mfaRequired && !user.mfaVerified) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'Admin MFA verification required.', mfaRequired: true },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}

/**
 * Cryptographic guest order token helpers so guest buyers can view/pay their own order
 * safely without exposing all orders or allowing IDOR access.
 */
export function generateGuestOrderToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(24).toString('hex');
  return { rawToken, tokenHash: hashGuestOrderToken(rawToken) };
}

export function hashGuestOrderToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export function verifyGuestOrderToken(
  providedRawToken: string | null | undefined,
  storedHash: string | null | undefined
): boolean {
  if (!providedRawToken || !storedHash) return false;
  try {
    const a = Buffer.from(hashGuestOrderToken(providedRawToken), 'hex');
    const b = Buffer.from(storedHash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
