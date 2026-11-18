/**
 * GATE:NET prototype — HMAC-SHA256 session tokens.
 *
 * This is a harness-only token, not the production authentication design. It exists to measure whether a
 * verified credential can be required *before* `attachRooms` creates membership. The secret is generated per
 * run (or supplied from the environment by the caller) and is never printed or committed.
 *
 * Token shape: `v1.<base64url(payload)>.<base64url(HMAC-SHA256(secret, "v1.<payload>"))>`.
 * The payload binds `clientId`, `roomId` and `expiresAt` (epoch milliseconds). Signature comparison uses
 * `node:crypto` `timingSafeEqual` over equal-length digests.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface TokenClaims {
  readonly clientId: number;
  readonly roomId: string;
  readonly expiresAt: number;
}

export type TokenFailure =
  | 'missing'
  | 'malformed'
  | 'bad-signature'
  | 'room-mismatch'
  | 'expired';

export type TokenVerdict =
  | { readonly ok: true; readonly claims: TokenClaims }
  | { readonly ok: false; readonly reason: TokenFailure };

const TOKEN_VERSION = 'v1';
const MAX_TOKEN_CHARS = 4096;

/** Random 256-bit secret for one harness run. Never log the returned value. */
export function generateSecret(): string {
  return randomBytes(32).toString('base64url');
}

function sign(secret: string, payload: string): Buffer {
  return createHmac('sha256', secret).update(`${TOKEN_VERSION}.${payload}`).digest();
}

function isClaims(value: unknown): value is TokenClaims {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return Number.isSafeInteger(record.clientId) && (record.clientId as number) > 0
    && typeof record.roomId === 'string' && record.roomId.length > 0 && record.roomId.length <= 128
    && Number.isSafeInteger(record.expiresAt) && (record.expiresAt as number) > 0;
}

/** Issue one token. Throws rather than issuing an ambiguous credential. */
export function issueToken(secret: string, claims: TokenClaims, now = Date.now()): string {
  if (typeof secret !== 'string' || secret.length < 32) throw new RangeError('secret must be at least 32 chars');
  if (!isClaims(claims)) throw new RangeError('invalid token claims');
  if (claims.expiresAt <= now) throw new RangeError('token expiry must be in the future');
  const payload = Buffer.from(JSON.stringify({
    clientId: claims.clientId,
    roomId: claims.roomId,
    expiresAt: claims.expiresAt,
  }), 'utf8').toString('base64url');
  return `${TOKEN_VERSION}.${payload}.${sign(secret, payload).toString('base64url')}`;
}

/** Verify signature, room binding and expiry. Missing/invalid tokens fail closed. */
export function verifyToken(
  secret: string,
  token: string | null | undefined,
  expectedRoomId: string,
  now = Date.now(),
): TokenVerdict {
  if (typeof token !== 'string' || token.length === 0) return { ok: false, reason: 'missing' };
  if (token.length > MAX_TOKEN_CHARS) return { ok: false, reason: 'malformed' };

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return { ok: false, reason: 'malformed' };
  const payload = parts[1] ?? '';
  const suppliedSignature = parts[2] ?? '';
  if (payload.length === 0 || suppliedSignature.length === 0) return { ok: false, reason: 'malformed' };

  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, 'base64url');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const expected = sign(secret, payload);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { ok: false, reason: 'bad-signature' };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!isClaims(decoded)) return { ok: false, reason: 'malformed' };
  if (decoded.roomId !== expectedRoomId) return { ok: false, reason: 'room-mismatch' };
  if (!Number.isSafeInteger(now) || now >= decoded.expiresAt) return { ok: false, reason: 'expired' };
  return { ok: true, claims: decoded };
}
