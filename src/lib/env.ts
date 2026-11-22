import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_STAGE: z.enum(['development', 'staging', 'production']).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().or(z.literal('')),
  DATABASE_URL: z.string().optional(),
  REQUIRE_POSTGRES: z.enum(['true', 'false']).optional(),
  AUTH_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  DEFAULT_ADMIN_PHONE: z.string().optional(),
  DEFAULT_ADMIN_EMAIL: z.string().optional(),
  DEFAULT_ADMIN_USERNAME: z.string().optional(),
  DEFAULT_ADMIN_PASSWORD: z.string().optional(),
  DEFAULT_ADMIN_MFA_SECRET: z.string().optional(),
  ADMIN_MFA_REQUIRED: z.enum(['true', 'false']).optional(),
  REDIS_URL: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

let cachedEnv: ValidatedEnv | null = null;

export function getEnv(): ValidatedEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isProductionMode(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.APP_STAGE === 'production';
}

export function shouldRequirePostgres(): boolean {
  return isProductionMode() || process.env.REQUIRE_POSTGRES === 'true';
}

export function validateProductionEnvOrThrow(): void {
  const env = getEnv();
  const errors: string[] = [];

  if (!env.DATABASE_URL || !env.DATABASE_URL.startsWith('postgres')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string in production.');
  }
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32 || env.AUTH_SECRET.includes('change-me')) {
    errors.push('AUTH_SECRET must be at least 32 random characters in production.');
  }
  if (!env.NEXT_PUBLIC_RAZORPAY_KEY_ID || env.NEXT_PUBLIC_RAZORPAY_KEY_ID.includes('placeholder')) {
    errors.push('NEXT_PUBLIC_RAZORPAY_KEY_ID must be configured in production.');
  }
  if (!env.RAZORPAY_KEY_SECRET || env.RAZORPAY_KEY_SECRET.includes('placeholder')) {
    errors.push('RAZORPAY_KEY_SECRET must be configured in production.');
  }
  if (!env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_WEBHOOK_SECRET.length < 16) {
    errors.push('RAZORPAY_WEBHOOK_SECRET must be configured in production.');
  }

  if (errors.length > 0) {
    throw new Error(`[Production Env Validation Failed]\n- ${errors.join('\n- ')}`);
  }
}

export function getAuthSecretBytes(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (isProductionMode() && (!secret || secret.length < 32)) {
    throw new Error('SECURITY ERROR: AUTH_SECRET must be >= 32 characters in production.');
  }
  return new TextEncoder().encode(
    secret && secret.length >= 32
      ? secret
      : 'nilas-treat-dev-only-secret-key-minimum-32-bytes-long'
  );
}
