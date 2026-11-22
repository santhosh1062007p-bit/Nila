import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionAndToken, setAuthCookie } from '@/lib/auth/jwt';
import { verifyPassword } from '@/lib/auth/password';
import { db } from '@/lib/db';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { verifyTotpCode } from '@/lib/security/totp';
import { User } from '@/types';

const adminLoginSchema = z.object({
  identifier: z.string().trim().min(2).max(120),
  password: z.string().min(1).max(200),
  mfaCode: z.string().trim().optional(),
});

function timingSafeTextEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'admin-login', 10, 60_000);
  if (rateErr) return rateErr;

  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Valid owner identifier and password are required.' },
        { status: 400 }
      );
    }

    const { identifier, password, mfaCode } = parsed.data;
    const clean = identifier.trim();
    const cleanLower = clean.toLowerCase();
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || null;

    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9344597833';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nilastreat.com';
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'nila treat';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || '';

    const adminRecord = await db.getAdminUserByIdentifier(clean);

    const identifierMatches =
      Boolean(adminRecord) ||
      clean === adminPhone ||
      cleanLower === adminEmail.toLowerCase() ||
      cleanLower === adminUsername.toLowerCase() ||
      cleanLower === 'admin';

    let passwordMatches = false;
    if (adminRecord) {
      const res = await verifyPassword(password, adminRecord.password_hash);
      passwordMatches = res.valid;
    } else if (identifierMatches && adminPassword) {
      passwordMatches = timingSafeTextEqual(password, adminPassword);
    }

    if (!identifierMatches || !passwordMatches) {
      await db.recordAudit({
        actor_id: adminRecord?.id || clean,
        actor_role: 'admin',
        action: 'ADMIN_PORTAL_LOGIN_FAILED',
        target_type: 'auth',
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      return NextResponse.json(
        { message: 'Unauthorized: Invalid owner administrator credentials' },
        { status: 401 }
      );
    }

    const mfaEnabled =
      Boolean(adminRecord?.mfa_enabled && adminRecord.mfa_secret) ||
      Boolean(process.env.ADMIN_MFA_REQUIRED === 'true' && process.env.DEFAULT_ADMIN_MFA_SECRET);
    const mfaSecret = adminRecord?.mfa_secret || process.env.DEFAULT_ADMIN_MFA_SECRET || '';

    if (mfaEnabled && mfaSecret) {
      if (!mfaCode) {
        return NextResponse.json(
          {
            mfaRequired: true,
            message: 'Enter the 6-digit MFA authenticator code to sign in.',
          },
          { status: 401 }
        );
      }

      if (!verifyTotpCode(mfaSecret, mfaCode)) {
        await db.recordAudit({
          actor_id: adminRecord?.id || 'usr-admin-1',
          actor_role: 'admin',
          action: 'ADMIN_PORTAL_MFA_FAILED',
          target_type: 'auth',
          ip_address: ipAddress,
          user_agent: userAgent,
        });
        return NextResponse.json(
          { mfaRequired: true, message: 'Invalid 6-digit authenticator code.' },
          { status: 401 }
        );
      }
    }

    const adminUser: User = {
      id: adminRecord?.id || 'usr-admin-1',
      full_name: adminRecord?.full_name || "Nila's Treat Owner",
      phone: adminRecord?.phone || adminPhone,
      email: adminRecord?.email || adminEmail,
      role: 'admin',
      is_active: true,
      created_at: adminRecord?.created_at || new Date().toISOString(),
    };

    const { token } = await createSessionAndToken(adminUser, {
      mfaVerified: true,
      ipAddress,
      userAgent,
    });
    await setAuthCookie(token, req);

    await db.recordAudit({
      actor_id: adminUser.id,
      actor_role: 'admin',
      action: 'ADMIN_PORTAL_LOGIN_SUCCESS',
      target_type: 'auth',
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return NextResponse.json(
      { success: true, user: adminUser },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Admin authentication failed', error: String(error) },
      { status: 500 }
    );
  }
}
