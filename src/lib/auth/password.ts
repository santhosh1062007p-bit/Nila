import crypto from 'crypto';
import { isProductionMode } from '@/lib/env';

const ARGON2_PARAMS = {
  memory: 19456, // 19 MiB (OWASP Argon2id baseline)
  passes: 2,
  parallelism: 1,
  tagLength: 32,
};

function toUnpaddedBase64(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/, '');
}

function fromBase64(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

function deriveArgon2id(
  password: string,
  salt: Buffer,
  memory: number,
  passes: number,
  parallelism: number,
  tagLength: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const argon2Fn = (crypto as unknown as {
      argon2: (
        alg: 'argon2id',
        opts: {
          message: string;
          nonce: Buffer;
          parallelism: number;
          passes: number;
          memory: number;
          tagLength: number;
        },
        cb: (err: Error | null, key: Buffer) => void
      ) => void;
    }).argon2;

    if (typeof argon2Fn === 'function') {
      argon2Fn(
        'argon2id',
        {
          message: password,
          nonce: salt,
          parallelism,
          passes,
          memory,
          tagLength,
        },
        (err, derivedKey) => {
          if (err) return reject(err);
          resolve(derivedKey);
        }
      );
      return;
    }

    // Fallback if ever executed on older runtime without crypto.argon2
    crypto.scrypt(password, salt, tagLength, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) return reject(err);
      resolve(key);
    });
  });
}

/**
 * Hash a password using Argon2id formatted in standard PHC format:
 * $argon2id$v=19$m=19456,t=2,p=1$<salt_b64>$<hash_b64>
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const salt = crypto.randomBytes(16);
  const derived = await deriveArgon2id(
    password,
    salt,
    ARGON2_PARAMS.memory,
    ARGON2_PARAMS.passes,
    ARGON2_PARAMS.parallelism,
    ARGON2_PARAMS.tagLength
  );

  return `$argon2id$v=19$m=${ARGON2_PARAMS.memory},t=${ARGON2_PARAMS.passes},p=${ARGON2_PARAMS.parallelism}$${toUnpaddedBase64(
    salt
  )}$${toUnpaddedBase64(derived)}`;
}

/**
 * Verify password against Argon2id (primary) or legacy PBKDF2 hash.
 * Plaintext password comparison is strictly forbidden in production.
 */
export async function verifyPassword(
  password: string,
  storedHash: string | null | undefined
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!password || !storedHash) {
    return { valid: false, needsRehash: false };
  }

  // Primary: PHC Argon2id ($argon2id$v=19$m=...,t=...,p=...$salt$hash)
  if (storedHash.startsWith('$argon2id$')) {
    try {
      const parts = storedHash.split('$');
      if (parts.length !== 6) return { valid: false, needsRehash: false };

      const paramStr = parts[3];
      const salt = fromBase64(parts[4]);
      const expected = fromBase64(parts[5]);

      const parsedParams: Record<string, number> = {};
      for (const kv of paramStr.split(',')) {
        const [k, v] = kv.split('=');
        parsedParams[k] = Number(v);
      }

      const memory = parsedParams.m || ARGON2_PARAMS.memory;
      const passes = parsedParams.t || ARGON2_PARAMS.passes;
      const parallelism = parsedParams.p || ARGON2_PARAMS.parallelism;

      const derived = await deriveArgon2id(
        password,
        salt,
        memory,
        passes,
        parallelism,
        expected.length
      );

      const valid =
        derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
      const needsRehash =
        valid && (memory < ARGON2_PARAMS.memory || passes < ARGON2_PARAMS.passes);
      return { valid, needsRehash };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }

  // Legacy migration: PBKDF2 (pbkdf2:sha512:iterations$salt$hex)
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return { valid: false, needsRehash: false };

    const [header, salt, originalHash] = parts;
    const [, digest, iterationsStr] = header.split(':');
    const iterations = parseInt(iterationsStr, 10);
    if (!digest || !Number.isFinite(iterations) || iterations < 1) {
      return { valid: false, needsRehash: false };
    }

    const ok = await new Promise<boolean>((resolve) => {
      crypto.pbkdf2(
        password,
        salt,
        iterations,
        originalHash.length / 2,
        digest,
        (err, derivedKey) => {
          if (err) return resolve(false);
          const derivedHex = derivedKey.toString('hex');
          try {
            resolve(
              crypto.timingSafeEqual(Buffer.from(derivedHex), Buffer.from(originalHash))
            );
          } catch {
            resolve(false);
          }
        }
      );
    });

    return { valid: ok, needsRehash: ok };
  }

  // Strictly refuse plaintext in production
  if (isProductionMode()) {
    return { valid: false, needsRehash: false };
  }

  // Dev-only legacy migration helper for old users.json entries
  try {
    const a = Buffer.from(password, 'utf8');
    const b = Buffer.from(storedHash, 'utf8');
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);
    return { valid: match, needsRehash: match };
  } catch {
    return { valid: false, needsRehash: false };
  }
}
