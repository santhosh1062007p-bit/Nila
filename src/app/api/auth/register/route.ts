import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSessionAndToken, setAuthCookie } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/password';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { User } from '@/types';

const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().trim().min(10, 'Valid 10-digit mobile number is required').max(20),
  email: z.string().trim().email('Invalid email format').optional().nullable().or(z.literal('')),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(200),
});

function sanitizeUser(user: User): Omit<User, 'password' | 'password_hash'> {
  const { password: _p, password_hash: _ph, ...safe } = user;
  return safe;
}

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'auth-register', 10, 60_000);
  if (rateErr) return rateErr;

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid registration data.' },
        { status: 400 }
      );
    }

    const { full_name, phone, email, password } = parsed.data;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { message: 'Please enter a valid 10-digit mobile number.' },
        { status: 400 }
      );
    }

    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9344597833';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nilastreat.com';

    if (
      cleanPhone === adminPhone ||
      (email && email.trim().toLowerCase() === adminEmail.toLowerCase())
    ) {
      return NextResponse.json(
        {
          message:
            'These credentials belong to the Bakery Owner. They cannot be used as a customer account.',
        },
        { status: 400 }
      );
    }

    // Security fix: NEVER overwrite an existing user's password via registration!
    const existing = await db.getUserByPhone(cleanPhone);
    if (existing) {
      return NextResponse.json(
        {
          message:
            'An account with this mobile number already exists. Please sign in with your password.',
        },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const newUser = await db.createUser({
      full_name: full_name.trim(),
      phone: cleanPhone,
      email: email?.trim() || null,
      password_hash: passwordHash,
    });

    const ipAddress = getClientIp(req);
    const { token } = await createSessionAndToken(newUser, {
      mfaVerified: true,
      ipAddress,
      userAgent: req.headers.get('user-agent'),
    });
    await setAuthCookie(token, req);

    await db.recordCustomerLogin({
      user_id: newUser.id,
      full_name: newUser.full_name,
      phone: newUser.phone,
      email: newUser.email,
      type: 'register',
      ip_address: ipAddress,
    });

    return NextResponse.json(
      { success: true, user: sanitizeUser(newUser) },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Registration failed', error: String(error) },
      { status: 500 }
    );
  }
}
