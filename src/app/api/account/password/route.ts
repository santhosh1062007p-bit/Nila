import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/auth/jwt';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { db } from '@/lib/db';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(200),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(200),
    confirmPassword: z.string().min(1, 'Please confirm your new password').max(200),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from your current password',
    path: ['newPassword'],
  });

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const rateErr = enforceRateLimit(req, 'account-change-password', 8, 60_000);
  if (rateErr) return rateErr;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  if (auth.user.role === 'admin') {
    return NextResponse.json(
      { message: 'Owner password changes must be done through server administration.' },
      { status: 400 }
    );
  }

  try {
    const parsed = changePasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid password change request.' },
        { status: 400 }
      );
    }

    const user = await db.getUserById(auth.user.userId);
    if (!user) {
      return NextResponse.json({ message: 'Account not found.' }, { status: 404 });
    }

    const storedHash = user.password_hash || user.password || '';
    const verified = await verifyPassword(parsed.data.currentPassword, storedHash);
    if (!verified.valid) {
      await db.recordAudit({
        actor_id: auth.user.userId,
        actor_role: 'customer',
        action: 'PASSWORD_CHANGE_FAILED',
        target_type: 'auth',
        target_id: auth.user.userId,
        ip_address: getClientIp(req),
      });
      return NextResponse.json(
        { message: 'Current password is incorrect.' },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    const updated = await db.updateUserPassword(auth.user.userId, newHash);
    if (!updated) {
      return NextResponse.json({ message: 'Unable to update password.' }, { status: 500 });
    }

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'customer',
      action: 'PASSWORD_CHANGED',
      target_type: 'auth',
      target_id: auth.user.userId,
      ip_address: getClientIp(req),
      user_agent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json(
      { success: true, message: 'Password updated successfully.' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'Failed to change password' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
