import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminUser } from '@/lib/auth/jwt';
import { hashPassword } from '@/lib/auth/password';
import { db } from '@/lib/db';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { getClientIp } from '@/lib/security/rate-limit';
import { generateTotpSecret, generateTotpUri, verifyTotpCode } from '@/lib/security/totp';

const mfaActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('setup') }),
  z.object({
    action: z.literal('enable'),
    secret: z.string().min(16),
    code: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit code'),
  }),
  z.object({
    action: z.literal('disable'),
    code: z.string().regex(/^\d{6}$/, 'Enter current 6-digit code to disable MFA'),
  }),
]);

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const admin = await db.getAdminUserById(auth.user.userId);
  return NextResponse.json(
    {
      mfaEnabled: Boolean(admin?.mfa_enabled),
      username: admin?.username || 'nila treat',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const parsed = mfaActionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid MFA request' },
        { status: 400 }
      );
    }

    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '9344597833';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nilastreat.com';
    const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'nila treat';
    const adminPass = process.env.DEFAULT_ADMIN_PASSWORD || 'NilasAdmin@2026';

    let admin = await db.getAdminUserById(auth.user.userId);
    if (!admin) {
      const now = new Date().toISOString();
      admin = await db.upsertAdminUser({
        id: auth.user.userId,
        username: adminUsername,
        full_name: auth.user.fullName,
        phone: adminPhone,
        email: adminEmail,
        password_hash: await hashPassword(adminPass),
        mfa_enabled: false,
        mfa_secret: null,
        mfa_backup_codes: [],
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }

    const data = parsed.data;

    if (data.action === 'setup') {
      const secret = generateTotpSecret();
      const otpauthUrl = generateTotpUri({
        secret,
        accountName: admin.email || admin.username,
      });
      return NextResponse.json(
        { secret, otpauthUrl },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (data.action === 'enable') {
      if (!verifyTotpCode(data.secret, data.code)) {
        return NextResponse.json(
          { message: 'Invalid verification code. Please sync your authenticator clock and retry.' },
          { status: 400 }
        );
      }

      admin.mfa_enabled = true;
      admin.mfa_secret = data.secret;
      admin.updated_at = new Date().toISOString();
      await db.upsertAdminUser(admin);
      await db.markSessionMfaVerified(auth.user.jti);

      await db.recordAudit({
        actor_id: admin.id,
        actor_role: 'admin',
        action: 'ADMIN_MFA_ENABLED',
        target_type: 'admin_security',
        ip_address: getClientIp(req),
        user_agent: req.headers.get('user-agent'),
      });

      return NextResponse.json({ success: true, mfaEnabled: true });
    }

    if (data.action === 'disable') {
      if (!admin.mfa_secret || !verifyTotpCode(admin.mfa_secret, data.code)) {
        return NextResponse.json(
          { message: 'Invalid current authenticator code.' },
          { status: 400 }
        );
      }
      admin.mfa_enabled = false;
      admin.mfa_secret = null;
      admin.updated_at = new Date().toISOString();
      await db.upsertAdminUser(admin);

      await db.recordAudit({
        actor_id: admin.id,
        actor_role: 'admin',
        action: 'ADMIN_MFA_DISABLED',
        target_type: 'admin_security',
        ip_address: getClientIp(req),
        user_agent: req.headers.get('user-agent'),
      });

      return NextResponse.json({ success: true, mfaEnabled: false });
    }

    return NextResponse.json({ message: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { message: 'MFA configuration error', error: String(error) },
      { status: 500 }
    );
  }
}
