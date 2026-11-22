import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { requireAdminUser } from '@/lib/auth/jwt';
import { verifySameOriginCsrf } from '@/lib/security/csrf';
import { enforceRateLimit, getClientIp } from '@/lib/security/rate-limit';
import { validateImageUpload } from '@/lib/security/upload';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const csrfErr = verifySameOriginCsrf(req);
  if (csrfErr) return csrfErr;

  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const rateErr = enforceRateLimit(req, 'admin-upload', 20, 60_000);
  if (rateErr) return rateErr;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file provided for upload' }, { status: 400 });
    }

    const maxBytes = 10 * 1024 * 1024; // 10MB max
    if (file.size > maxBytes) {
      return NextResponse.json(
        { message: 'File is too large. Maximum supported image size is 10MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Magic-byte + MIME + Extension verification
    const validation = validateImageUpload({
      buffer,
      filename: file.name,
      mimeType: file.type,
      maxBytes,
    });

    if (!validation.ok) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    const safeFilename = `cake-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${validation.safeExtension}`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'cakes');
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, path.basename(safeFilename));

    await writeFile(filePath, buffer);
    const publicUrl = `/uploads/cakes/${safeFilename}`;

    await db.recordAudit({
      actor_id: auth.user.userId,
      actor_role: 'admin',
      action: 'IMAGE_UPLOADED',
      target_type: 'media',
      target_id: safeFilename,
      ip_address: getClientIp(req),
      metadata: { format: validation.format, size: file.size },
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      format: validation.format,
      size: file.size,
      filename: safeFilename,
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to upload image', error: String(error) },
      { status: 500 }
    );
  }
}
