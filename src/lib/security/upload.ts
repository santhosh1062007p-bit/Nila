import path from 'path';

export type DetectedImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif';

const MIME_MAP: Record<DetectedImageFormat, string[]> = {
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  avif: ['image/avif'],
};

const EXT_MAP: Record<DetectedImageFormat, string[]> = {
  jpeg: ['jpg', 'jpeg'],
  png: ['png'],
  webp: ['webp'],
  gif: ['gif'],
  avif: ['avif'],
};

/**
 * Inspect actual binary magic bytes of an uploaded image buffer
 * so renamed HTML/SVG/EXE/JS payloads are rejected even with spoofed MIME headers.
 */
export function detectImageMagicFormat(buffer: Buffer): DetectedImageFormat | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // GIF: GIF87a or GIF89a
  const gifSig = buffer.subarray(0, 6).toString('ascii');
  if (gifSig === 'GIF87a' || gifSig === 'GIF89a') {
    return 'gif';
  }

  // WEBP: RIFF....WEBP
  const riffSig = buffer.subarray(0, 4).toString('ascii');
  const webpSig = buffer.subarray(8, 12).toString('ascii');
  if (riffSig === 'RIFF' && webpSig === 'WEBP') {
    return 'webp';
  }

  // AVIF (ISO Base Media File Format): ....ftypavif or ....ftypavis
  const ftyp = buffer.subarray(4, 8).toString('ascii');
  const brand = buffer.subarray(8, 12).toString('ascii');
  if (ftyp === 'ftyp' && (brand === 'avif' || brand === 'avis' || brand === 'mif1')) {
    return 'avif';
  }

  return null;
}

export function validateImageUpload(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  maxBytes?: number;
}): { ok: true; format: DetectedImageFormat; safeExtension: string } | { ok: false; error: string } {
  const maxBytes = params.maxBytes ?? 10 * 1024 * 1024; // 10MB default

  if (!params.buffer || params.buffer.length === 0) {
    return { ok: false, error: 'Uploaded file is empty.' };
  }

  if (params.buffer.length > maxBytes) {
    return {
      ok: false,
      error: `File too large. Maximum allowed size is ${Math.round(maxBytes / (1024 * 1024))}MB.`,
    };
  }

  const detected = detectImageMagicFormat(params.buffer);
  if (!detected) {
    return {
      ok: false,
      error: 'Invalid or corrupted image file content. Only genuine JPG, PNG, WEBP, AVIF, or GIF files are permitted.',
    };
  }

  const declaredMime = (params.mimeType || '').toLowerCase();
  if (declaredMime && !MIME_MAP[detected].includes(declaredMime)) {
    return {
      ok: false,
      error: `MIME type mismatch: declared "${declaredMime}" does not match actual ${detected.toUpperCase()} content.`,
    };
  }

  const baseName = path.basename(params.filename || '');
  const rawExt = baseName.split('.').pop()?.toLowerCase() || '';
  if (!rawExt || !EXT_MAP[detected].includes(rawExt)) {
    return {
      ok: false,
      error: `File extension ".${rawExt}" does not match actual ${detected.toUpperCase()} content.`,
    };
  }

  const safeExtension = EXT_MAP[detected][0];
  return { ok: true, format: detected, safeExtension };
}
