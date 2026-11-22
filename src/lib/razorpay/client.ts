import Razorpay from 'razorpay';
import crypto from 'crypto';

function getKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
}

function getKeySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || '';
}

function getWebhookSecret(): string {
  return process.env.RAZORPAY_WEBHOOK_SECRET || '';
}

export function isRazorpayConfigured(): boolean {
  const keyId = getKeyId();
  const keySecret = getKeySecret();
  return Boolean(
    keyId &&
      keySecret &&
      !keyId.includes('placeholder') &&
      !keySecret.includes('placeholder')
  );
}

export function isRazorpayWebhookConfigured(): boolean {
  const secret = getWebhookSecret();
  return Boolean(secret && !secret.includes('placeholder') && secret.length >= 16);
}

export function getRazorpayInstance(): Razorpay | null {
  if (!isRazorpayConfigured()) return null;
  return new Razorpay({
    key_id: getKeyId(),
    key_secret: getKeySecret(),
  });
}

function timingSafeHexCompare(aHex: string, bHex: string): boolean {
  if (!aHex || !bHex) return false;
  try {
    const a = Buffer.from(aHex.trim().toLowerCase(), 'utf8');
    const b = Buffer.from(bHex.trim().toLowerCase(), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay checkout signature server-side using HMAC SHA-256 and constant-time comparison.
 * Never skips cryptographic verification.
 */
export function verifyRazorpaySignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  secretOverride?: string;
}): boolean {
  const secret = params.secretOverride ?? getKeySecret();
  if (!secret || secret.includes('placeholder')) {
    return false;
  }

  if (!params.razorpayOrderId || !params.razorpayPaymentId || !params.razorpaySignature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  return timingSafeHexCompare(generatedSignature, params.razorpaySignature);
}

/**
 * Verifies Razorpay Webhook signature against the ORIGINAL RAW request body.
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string | Buffer;
  signatureHeader: string | null;
  webhookSecretOverride?: string;
}): boolean {
  const secret = params.webhookSecretOverride ?? getWebhookSecret();
  if (!secret || secret.includes('placeholder') || !params.signatureHeader) {
    return false;
  }

  const generated = crypto
    .createHmac('sha256', secret)
    .update(params.rawBody)
    .digest('hex');

  return timingSafeHexCompare(generated, params.signatureHeader);
}
