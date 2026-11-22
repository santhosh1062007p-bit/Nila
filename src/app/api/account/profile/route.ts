import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  createSessionAndToken,
  requireAuthenticatedUser,
  setAuthCookie,
} from '@/lib/auth/jwt';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { Address, User } from '@/types';

function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z
    .string()
    .trim()
    .transform(normalizeIndianPhone)
    .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .max(150)
    .optional()
    .nullable()
    .or(z.literal('')),
  date_of_birth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
    .optional()
    .nullable()
    .or(z.literal('')),
  gender: z
    .enum(['female', 'male', 'other', 'prefer_not_to_say'])
    .optional()
    .nullable()
    .or(z.literal('')),
  notification_preferences: z
    .object({
      order_updates: z.boolean(),
      promotions: z.boolean(),
    })
    .optional(),
});

function sanitizeUser(user: User): Omit<User, 'password' | 'password_hash'> {
  const safe = { ...user };
  delete safe.password;
  delete safe.password_hash;
  return safe;
}

export function calculateProfileCompletion(
  user: Pick<User, 'full_name' | 'phone' | 'email' | 'avatar_url' | 'date_of_birth' | 'gender'>,
  addressCount: number
): { percentage: number; missing: string[] } {
  const checks: { label: string; done: boolean }[] = [
    { label: 'Full name', done: Boolean(user.full_name && user.full_name.trim().length >= 2) },
    { label: 'Mobile number', done: Boolean(user.phone && user.phone.trim().length >= 10) },
    { label: 'Email address', done: Boolean(user.email && user.email.trim().length > 0) },
    { label: 'Profile photo', done: Boolean(user.avatar_url) },
    { label: 'Date of birth', done: Boolean(user.date_of_birth) },
    { label: 'Gender', done: Boolean(user.gender) },
    { label: 'Saved address', done: addressCount > 0 },
  ];

  const completed = checks.filter((c) => c.done).length;
  const percentage = Math.round((completed / checks.length) * 100);
  const missing = checks.filter((c) => !c.done).map((c) => c.label);
  return { percentage, missing };
}

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  try {
    if (auth.user.role === 'admin') {
      const admin = await db.getAdminUserById(auth.user.userId);
      const adminProfile: User = {
        id: auth.user.userId,
        full_name: admin?.full_name || auth.user.fullName,
        phone: admin?.phone || auth.user.phone,
        email: admin?.email || auth.user.email,
        role: 'admin',
        is_active: true,
        created_at: admin?.created_at || new Date().toISOString(),
        avatar_url: null,
      };
      return NextResponse.json(
        {
          user: adminProfile,
          addresses: [] as Address[],
          completion: calculateProfileCompletion(adminProfile, 0),
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const [user, addresses] = await Promise.all([
      db.getUserById(auth.user.userId),
      db.getAddressesByUserId(auth.user.userId),
    ]);

    if (!user) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    const safeUser = sanitizeUser(user);
    return NextResponse.json(
      {
        user: safeUser,
        addresses,
        completion: calculateProfileCompletion(safeUser, addresses.length),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'Failed to load profile' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'account-profile-update', 20, 60_000);
  if (rateErr) return rateErr;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  if (auth.user.role === 'admin') {
    return NextResponse.json(
      { message: 'Owner profile details are configured via server administration settings.' },
      { status: 400 }
    );
  }

  try {
    const rawBody = await req.json();
    const parsed = updateProfileSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid profile input.' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const cleanEmail = data.email ? data.email.trim().toLowerCase() : null;
    const dobValue = data.date_of_birth ? data.date_of_birth : null;

    if (dobValue) {
      const parsedDate = new Date(`${dobValue}T00:00:00Z`);
      const now = new Date();
      if (Number.isNaN(parsedDate.getTime()) || parsedDate > now) {
        return NextResponse.json(
          { message: 'Date of birth cannot be in the future.' },
          { status: 400 }
        );
      }
      if (now.getUTCFullYear() - parsedDate.getUTCFullYear() > 120) {
        return NextResponse.json(
          { message: 'Please enter a valid date of birth.' },
          { status: 400 }
        );
      }
    }

    // Reject reserved owner phone/email
    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9344597833';
    const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@nilastreat.com').toLowerCase();
    if (data.phone === adminPhone || (cleanEmail && cleanEmail === adminEmail)) {
      return NextResponse.json(
        { message: 'This contact detail is reserved and cannot be used on customer profiles.' },
        { status: 400 }
      );
    }

    // Prevent phone takeover across accounts
    const existingPhoneUser = await db.getUserByPhone(data.phone);
    if (existingPhoneUser && existingPhoneUser.id !== auth.user.userId) {
      return NextResponse.json(
        { message: 'Another account is already registered with this mobile number.' },
        { status: 409 }
      );
    }

    if (cleanEmail) {
      const existingEmailUser = await db.getUserByEmail(cleanEmail);
      if (existingEmailUser && existingEmailUser.id !== auth.user.userId) {
        return NextResponse.json(
          { message: 'Another account is already registered with this email address.' },
          { status: 409 }
        );
      }
    }

    const identityChanged =
      auth.user.fullName !== data.full_name ||
      auth.user.phone !== data.phone ||
      (auth.user.email || null) !== cleanEmail;

    const updated = await db.updateUserProfile(auth.user.userId, {
      full_name: data.full_name,
      phone: data.phone,
      email: cleanEmail,
      date_of_birth: dobValue,
      gender: data.gender ? data.gender : null,
      notification_preferences: data.notification_preferences,
    });

    if (!updated) {
      return NextResponse.json({ message: 'User account not found.' }, { status: 404 });
    }

    if (identityChanged) {
      const { token } = await createSessionAndToken(updated, {
        ipAddress: getClientIp(req),
        userAgent: req.headers.get('user-agent') || null,
      });
      await setAuthCookie(token, req);
    }

    const addresses = await db.getAddressesByUserId(auth.user.userId);
    const safeUser = sanitizeUser(updated);

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'customer',
      action: 'PROFILE_UPDATED',
      target_type: 'user_profile',
      target_id: auth.user.userId,
      ip_address: getClientIp(req),
      user_agent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json(
      {
        success: true,
        user: safeUser,
        completion: calculateProfileCompletion(safeUser, addresses.length),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'Failed to update profile' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
