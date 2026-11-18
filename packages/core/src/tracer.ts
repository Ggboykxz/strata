/**
 * Deterministic one-capsule simulation for TRACER-001 (D137).
 *
 * All state is integer fixed-point (milli-units). The only clock is `tick`; randomness, if needed, comes
 * from the seeded PRNG below. `packages/core` still obeys I14 — scripts/lint-core-math.mjs checks it.
 */
/** Fixed-point scale: 1000 units = 1 world metre. */
export const TRACER_SCALE = 1000;

/** Speed in milli-units per tick at 30 Hz (1.5 m/s). */
export const TRACER_SPEED = 50;

/** Soft bound in milli-units (±10 m); the capsule stops at the edge. */
export const TRACER_BOUND = 10_000;

export interface CapsuleState {
  readonly tick: number;
  readonly x: number;
  readonly z: number;
  readonly vx: number;
  readonly vz: number;
}

export interface Intent {
  readonly seq: number;
  readonly dx: -1 | 0 | 1;
  readonly dz: -1 | 0 | 1;
}

/** mulberry32: small, deterministic, seeded. No Math.random, no clock. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Initial capsule position derived from a seed, so both sides start identically. */
export function initialState(seed: number): CapsuleState {
  const rnd = seededRandom(seed);
  return {
    tick: 0,
    x: Math.floor(rnd() * 2_000) - 1_000,
    z: Math.floor(rnd() * 2_000) - 1_000,
    vx: 0,
    vz: 0,
  };
}

const clamp = (v: number): number => Math.max(-TRACER_BOUND, Math.min(TRACER_BOUND, v));

/** One authoritative tick. Pure: the same (state, intent) always yields the same next state. */
export function step(state: CapsuleState, intent: Intent): CapsuleState {
  let vx = intent.dx * TRACER_SPEED;
  let vz = intent.dz * TRACER_SPEED;
  let x = clamp(state.x + vx);
  let z = clamp(state.z + vz);
  if (x !== state.x + vx) vx = 0;
  if (z !== state.z + vz) vz = 0;
  return { tick: state.tick + 1, x, z, vx, vz };
}

/**
 * FNV-1a 32-bit over the five integer fields, byte by byte. `Math.imul` is required by ECMAScript to be
 * deterministic; no engine-dependent transcendental is involved (I14).
 */
export function stateHash(state: CapsuleState): string {
  let h = 0x811c9dc5;
  for (const value of [state.tick, state.x, state.z, state.vx, state.vz]) {
    const v = value >>> 0;
    for (let shift = 0; shift < 32; shift += 8) {
      h ^= (v >>> shift) & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, '0');
}

/** Server-side intent validation: malformed or replayed intents are ignored, never trusted. */
export function validIntent(i: unknown, lastSeq: number): i is Intent {
  if (!i || typeof i !== 'object') return false;
  const x = i as Partial<Intent>;
  return Number.isInteger(x.seq)
    && (x.seq as number) > lastSeq
    && (x.dx === -1 || x.dx === 0 || x.dx === 1)
    && (x.dz === -1 || x.dz === 0 || x.dz === 1);
}
