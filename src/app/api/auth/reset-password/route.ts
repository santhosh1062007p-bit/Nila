import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSessionAndToken, setAuthCookie } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/password';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { User } from '@/types';

const resetSchema = z.object({
  phone: z.string().trim().min(10, 'Valid 10-digit mobile number is required').max(20),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(200),
  full_name: z.string().trim().max(100).optional(),
});

function sanitizeUser(user: User): Omit<User, 'password' | 'password_hash'> {
  const { password: _p, password_hash: _ph, ...safe } = user;
  return safe;
}

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'auth-reset-password', 10, 60_000);
  if (rateErr) return rateErr;

  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid request data.' },
        { status: 400 }
      );
    }

    const { phone, password, full_name } = parsed.data;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { message: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9344597833';
    if (cleanPhone === adminPhone) {
      return NextResponse.json(
        { message: 'Owner credentials cannot be reset from this customer portal.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    let user = await db.getUserByPhone(cleanPhone);

    if (user) {
      await db.updateUserPassword(user.id, passwordHash);
      if (full_name && full_name.trim()) {
        user = (await db.updateUserProfile(user.id, { full_name: full_name.trim() })) || user;
      }
    } else {
      user = await db.createUser({
        full_name: full_name?.trim() || `Customer-${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        email: null,
        password_hash: passwordHash,
      });
    }

    const ipAddress = getClientIp(req);
    const { token } = await createSessionAndToken(user, {
      mfaVerified: true,
      ipAddress,
      userAgent: req.headers.get('user-agent'),
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
        user: sanitizeUser(user),
        message: 'Password reset successful! Logging you in...',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Password reset failed', error: String(error) },
      { status: 500 }
    );
  }
}
