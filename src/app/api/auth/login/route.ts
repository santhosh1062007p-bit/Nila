import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSessionAndToken, setAuthCookie } from '@/lib/auth/jwt';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { verifyTotpCode } from '@/lib/security/totp';
import { User } from '@/types';

const loginSchema = z.object({
  identifier: z.string().trim().min(2, 'Phone number, username or email is required').max(120),
  password: z.string().min(1, 'Password is required').max(200),
  mfaCode: z.string().trim().optional(),
});

function sanitizeUser(user: User): Omit<User, 'password' | 'password_hash'> {
  const { password: _p, password_hash: _ph, ...safe } = user;
  return safe;
}

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

  const rateErr = enforceRateLimit(req, 'auth-login', 15, 60_000);
  if (rateErr) return rateErr;

  try {
    const rawBody = await req.json();
    const parsed = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid login input.' },
        { status: 400 }
      );
    }

    const { identifier, password, mfaCode } = parsed.data;
    const clean = identifier.trim();
    const cleanLower = clean.toLowerCase();
    const cleanNormalized = cleanLower.replace(/['\s._-]/g, '');
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || null;

    // 1. Check Owner / Administrator Credentials
    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9344597833';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nilastreat.com';
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'nila treat';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || '';

    const isOwnerIdentifier =
      clean === adminPhone ||
      cleanLower === adminEmail.toLowerCase() ||
      cleanLower === adminUsername.toLowerCase() ||
      cleanLower === 'nila treat' ||
      cleanLower === "nila's treat" ||
      cleanLower === 'nilas treat' ||
      cleanLower === 'admin' ||
      cleanNormalized === 'nilatreat' ||
      cleanNormalized === 'nilastreat';

    if (isOwnerIdentifier) {
      const adminRecord = await db.getAdminUserByIdentifier(clean);
      let passwordValid = false;

      if (adminRecord) {
        const res = await verifyPassword(password, adminRecord.password_hash);
        passwordValid = res.valid;
      } else if (adminPassword) {
        passwordValid = timingSafeTextEqual(password, adminPassword);
      }

      if (!passwordValid) {
        await db.recordAudit({
          actor_id: adminRecord?.id || 'usr-admin-1',
          actor_role: 'admin',
          action: 'ADMIN_LOGIN_FAILED',
          target_type: 'auth',
          ip_address: ipAddress,
          user_agent: userAgent,
        });
        return NextResponse.json(
          { message: 'Invalid owner administrator credentials.' },
          { status: 401 }
        );
      }

      // Check Owner MFA if enabled
      const mfaEnabled =
        Boolean(adminRecord?.mfa_enabled && adminRecord.mfa_secret) ||
        Boolean(process.env.ADMIN_MFA_REQUIRED === 'true' && process.env.DEFAULT_ADMIN_MFA_SECRET);
      const mfaSecret = adminRecord?.mfa_secret || process.env.DEFAULT_ADMIN_MFA_SECRET || '';

      if (mfaEnabled && mfaSecret) {
        if (!mfaCode) {
          return NextResponse.json(
            {
              mfaRequired: true,
              message: 'Please enter the 6-digit authenticator code to complete owner login.',
            },
            { status: 401 }
          );
        }
        if (!verifyTotpCode(mfaSecret, mfaCode)) {
          await db.recordAudit({
            actor_id: adminRecord?.id || 'usr-admin-1',
            actor_role: 'admin',
            action: 'ADMIN_MFA_FAILED',
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
        action: 'ADMIN_LOGIN_SUCCESS',
        target_type: 'auth',
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      return NextResponse.json(
        {
          success: true,
          role: 'admin',
          user: sanitizeUser(adminUser),
          redirectTo: '/admin/products',
          message: 'Owner login authenticated successfully. Welcome to Nila’s Treat Owner Desk!',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 2. Customer Authentication Flow
    let user = await db.getUserByPhone(clean);
    if (!user && clean.includes('@')) {
      user = await db.getUserByEmail(clean);
    }
    if (!user) {
      const allUsers = await db.getUsers();
      user =
        allUsers.find(
          (u) => u.full_name.toLowerCase() === cleanLower && u.role === 'customer'
        ) || null;
    }

    if (!user || !user.is_active) {
      return NextResponse.json(
        {
          message:
            'Invalid credentials or no customer account found. Please check your login or create a new account.',
        },
        { status: 401 }
      );
    }

    const storedHash = user.password_hash || user.password;
    const { valid, needsRehash } = await verifyPassword(password, storedHash);
    if (!valid) {
      return NextResponse.json(
        { message: 'Incorrect password. Please enter the correct password.' },
        { status: 401 }
      );
    }

    // Upgrade legacy plaintext / PBKDF2 hash transparently to Argon2id
    if (needsRehash) {
      const newHash = await hashPassword(password);
      await db.updateUserPassword(user.id, newHash);
      user.password_hash = newHash;
    }

    const { token } = await createSessionAndToken(user, {
      mfaVerified: true,
      ipAddress,
      userAgent,
    });
    await setAuthCookie(token, req);

    await db.recordCustomerLogin({
      user_id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      type: 'login',
      ip_address: ipAddress,
    });

    return NextResponse.json(
      {
        success: true,
        role: 'customer',
        user: sanitizeUser(user),
        redirectTo: '/cakes',
        message: 'Welcome back to Nila’s Treat!',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Login processing failed', error: String(error) },
      { status: 500 }
    );
  }
}
