/**
 * Session resume handles (NET-003). A token is an opaque handle that lets a disconnected client reclaim
 * its entity in a room. It is **not a credential**: authentication, rate limits and anti-cheat are SEC-001.
 *
 * The signature is FNV-1a from `@strata/core` — deterministic and dependency-free, chosen so a token can be
 * reproduced in a test. It is a tamper *detector*, not cryptography; no security claim is made here.
 */
import { fnv1a32 } from '@strata/core';

const SEPARATOR = '.';

export interface ParsedHandle {
  readonly roomId: string;
  readonly clientId: number;
  readonly nonce: number;
  readonly signature: string;
}

function signature(seed: number, roomId: string, clientId: number, nonce: number): string {
  const values: number[] = [seed, clientId, nonce, roomId.length];
  for (let i = 0; i < roomId.length; i++) values.push(roomId.charCodeAt(i));
  return fnv1a32(values).toString(16).padStart(8, '0');
}

/** Issues and checks handles. `nonce` is supplied by the caller so issuance is deterministic in tests. */
export class TokenIssuer {
  constructor(private readonly seed = 0x5eed) {}

  issue(roomId: string, clientId: number, nonce: number): string {
    if (!roomId || roomId.includes(SEPARATOR)) throw new RangeError('roomId must be non-empty and contain no dot');
    if (!Number.isInteger(clientId) || clientId < 1) throw new RangeError('clientId must be a positive integer');
    if (!Number.isInteger(nonce) || nonce < 1) throw new RangeError('nonce must be a positive integer');
    return [roomId, clientId, nonce, signature(this.seed, roomId, clientId, nonce)].join(SEPARATOR);
  }

  parse(token: string): ParsedHandle | null {
    if (typeof token !== 'string') return null;
    const parts = token.split(SEPARATOR);
    if (parts.length !== 4) return null;
    const [roomId, clientIdText, nonceText, sig] = parts as [string, string, string, string];
    if (!roomId || !/^\d+$/.test(clientIdText) || !/^\d+$/.test(nonceText)) return null;
    const clientId = Number(clientIdText);
    const nonce = Number(nonceText);
    if (!Number.isSafeInteger(clientId) || !Number.isSafeInteger(nonce)) return null;
    return { roomId, clientId, nonce, signature: sig ?? '' };
  }

  /** A handle is valid only for the room and client it was issued to. */
  valid(token: string, roomId: string, clientId: number): boolean {
    const parsed = this.parse(token);
    if (!parsed || parsed.roomId !== roomId || parsed.clientId !== clientId) return false;
    return parsed.signature === signature(this.seed, roomId, clientId, parsed.nonce);
  }
}
