import { NextRequest, NextResponse } from 'next/server';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { requireAuthenticatedUser } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { validateImageUpload } from '@/lib/security/upload';
import { db } from '@/lib/db';

const AVATARS_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB

async function removeLocalAvatarIfOwned(avatarUrl: string | null | undefined) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return;
  const filename = path.basename(avatarUrl);
  if (!filename || filename.includes('..')) return;
  try {
    await unlink(path.join(AVATARS_DIR, filename));
  } catch {
    // ignore missing file cleanup
  }
}

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const rateErr = enforceRateLimit(req, 'account-avatar-upload', 15, 60_000);
  if (rateErr) return rateErr;

  if (auth.user.role === 'admin') {
    return NextResponse.json(
      { message: 'Owner accounts use brand emblem instead of customer avatar uploads.' },
      { status: 400 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No photo file provided.' }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { message: 'Profile photo is too large. Maximum size is 3 MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateImageUpload({
      buffer,
      filename: file.name,
      mimeType: file.type,
      maxBytes: MAX_AVATAR_BYTES,
    });

    if (!validation.ok) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    const currentUser = await db.getUserById(auth.user.userId);
    if (!currentUser) {
      return NextResponse.json({ message: 'User account not found.' }, { status: 404 });
    }

    const safeFilename = `avatar-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${validation.safeExtension}`;
    await mkdir(AVATARS_DIR, { recursive: true });
    await writeFile(path.join(AVATARS_DIR, safeFilename), buffer);

    const publicUrl = `/uploads/avatars/${safeFilename}`;
    const updated = await db.updateUserProfile(auth.user.userId, { avatar_url: publicUrl });
    if (!updated) {
      await unlink(path.join(AVATARS_DIR, safeFilename)).catch(() => {});
      return NextResponse.json({ message: 'Failed to save avatar URL.' }, { status: 500 });
    }

    await removeLocalAvatarIfOwned(currentUser.avatar_url);

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'customer',
      action: 'PROFILE_AVATAR_UPLOADED',
      target_type: 'user_profile',
      target_id: auth.user.userId,
      ip_address: getClientIp(req),
      metadata: { format: validation.format, size: file.size },
    });

    const safeUser = { ...updated };
    delete safeUser.password;
    delete safeUser.password_hash;
    return NextResponse.json(
      { success: true, avatar_url: publicUrl, user: safeUser },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'Failed to upload profile photo' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAuthenticatedUser();
  if (!auth.ok) return auth.response;

  if (auth.user.role === 'admin') {
    return NextResponse.json({ message: 'Not supported for owner account.' }, { status: 400 });
  }

  try {
    const currentUser = await db.getUserById(auth.user.userId);
    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    await removeLocalAvatarIfOwned(currentUser.avatar_url);
    const updated = await db.updateUserProfile(auth.user.userId, { avatar_url: null });

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'customer',
      action: 'PROFILE_AVATAR_REMOVED',
      target_type: 'user_profile',
      target_id: auth.user.userId,
      ip_address: getClientIp(req),
    });

    if (!updated) {
      return NextResponse.json({ message: 'Failed to remove avatar' }, { status: 500 });
    }
    const safeUser = { ...updated };
    delete safeUser.password;
    delete safeUser.password_hash;
    return NextResponse.json(
      { success: true, user: safeUser },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { message: 'Failed to remove profile photo' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
