/**
 * tick.ts — the authoritative, isomorphic tick (NET-001).
 *
 * One fixed-step world: every position is an integer millimetre, every input is an intent, every tick
 * advances exactly once. There is no clock in this file — the caller decides when a tick happens.
 *
 * Determinism contract (I14, D147, D148):
 *   - integers only; simulation and wire share the same millimetre domain, so quantization is a range
 *     check, not a lossy conversion;
 *   - commands are applied in a canonical order (entity id, then seq), never in arrival order;
 *   - the hash covers the state of the tick it is computed for, so an ack is compared at that tick and
 *     never at "now";
 *   - only spec-defined arithmetic is used (Math.imul, Math.round, Math.floor, Math.abs). No
 *     transcendental, no wall clock, no Math.random, no dependency.
 */

/** Fixed simulation rate. The tick number is the only clock the simulation may read. */
export const TICK_HZ = 30;

/** Milliseconds in one tick. Exact in the tick domain; presentation interpolates between ticks. */
export const TICK_MS = 1000 / TICK_HZ;

/** 1 world metre = 1 000 integer units. A fraction of a millimetre does not exist in the state. */
export const QUANT_MM = 1000;

/** Walk speed in millimetres per tick: 1.5 m/s at 30 Hz. */
export const WALK_MM_PER_TICK = 50;

/** Soft bound of the slice cell, in millimetres: 26 m from the origin on each axis. */
export const WORLD_BOUND_MM = 26_000;

/** Largest coordinate the wire can carry: int32 millimetres, i.e. about 2 147 km. */
export const WIRE_MAX_MM = 2_147_483_647;

/** A direction intent. The client never sends a delta time, a position or a speed. */
export type Axis = -1 | 0 | 1;

/** One entity's authoritative state. `seq` is the highest intent sequence applied to it. */
export interface EntityState {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  readonly vx: number;
  readonly vz: number;
  readonly seq: number;
}

/** The whole world at one tick. `entities` is always sorted by id. */
export interface WorldState {
  readonly tick: number;
  readonly entities: readonly EntityState[];
}

/** A client intent. Validated before application; an invalid command is dropped, never repaired. */
export interface MoveCommand {
  readonly entity: number;
  readonly seq: number;
  readonly dx: Axis;
  readonly dz: Axis;
}

/** Raised when a value cannot be represented in the integer/wire domain. Never swallowed. */
export class QuantizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuantizationError';
  }
}

const isAxis = (v: unknown): v is Axis => v === -1 || v === 0 || v === 1;

/** Integer-only deterministic placement, so both sides spawn identically from a seed. */
function spawn(index: number, seed: number): { x: number; z: number } {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  const x = (h % (WORLD_BOUND_MM * 2 + 1)) - WORLD_BOUND_MM;
  const z = ((h >>> 11) % (WORLD_BOUND_MM * 2 + 1)) - WORLD_BOUND_MM;
  return { x, z };
}

/** Build a world of `count` capsules at tick 0, positions derived from `seed`. Ids are 1..count. */
export function createWorld(seed: number, count: number): WorldState {
  if (!Number.isInteger(count) || count < 0) throw new RangeError('entity count must be a non-negative integer');
  const entities: EntityState[] = [];
  for (let i = 0; i < count; i++) {
    const p = spawn(i, seed);
    entities.push({ id: i + 1, x: p.x, z: p.z, vx: 0, vz: 0, seq: 0 });
  }
  return { tick: 0, entities };
}

/** Validate an untrusted intent. Returns null instead of throwing: input is hostile by default (I1). */
export function asMoveCommand(raw: unknown): MoveCommand | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Partial<MoveCommand>;
  const entity = c.entity;
  const seq = c.seq;
  if (typeof entity !== 'number' || !Number.isInteger(entity) || entity < 1) return null;
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 1) return null;
  if (!isAxis(c.dx) || !isAxis(c.dz)) return null;
  return { entity, seq, dx: c.dx, dz: c.dz };
}

const clamp = (v: number): number => Math.max(-WORLD_BOUND_MM, Math.min(WORLD_BOUND_MM, v));

/**
 * Advance the world by exactly one tick and apply the commands of that tick.
 *
 * The command list is sorted before application, so arrival order cannot change the result. A command
 * with an unknown entity, a non-increasing seq or an invalid axis is dropped. Pure: the same
 * (world, commands) multiset always yields the same next world.
 */
export function stepWorld(world: WorldState, commands: readonly MoveCommand[]): WorldState {
  const byId = new Map<number, EntityState>();
  for (const e of world.entities) byId.set(e.id, e);

  const ordered = [...commands].sort((a, b) => (a.entity - b.entity) || (a.seq - b.seq));

  for (const cmd of ordered) {
    const current = byId.get(cmd.entity);
    if (!current || cmd.seq <= current.seq) continue;
    let vx = cmd.dx * WALK_MM_PER_TICK;
    let vz = cmd.dz * WALK_MM_PER_TICK;
    const nx = current.x + vx;
    const nz = current.z + vz;
    const x = clamp(nx);
    const z = clamp(nz);
    if (x !== nx) vx = 0;
    if (z !== nz) vz = 0;
    byId.set(cmd.entity, { id: current.id, x, z, vx, vz, seq: cmd.seq });
  }

  const entities = [...byId.values()].sort((a, b) => a.id - b.id);
  return { tick: world.tick + 1, entities: [...entities] };
}

/** Assert that a value is an integer in the wire range. */
export function toWireMm(value: number): number {
  if (!Number.isInteger(value)) {
    throw new QuantizationError(`coordinate ${String(value)} is not an integer millimetre`);
  }
  if (Math.abs(value) > WIRE_MAX_MM) {
    throw new QuantizationError(`coordinate ${value} exceeds the int32 wire range`);
  }
  return value;
}

/** Convert metres (the presentation domain) to integer millimetres. Half values round away from zero. */
export function metresToMm(metres: number): number {
  return toWireMm(Math.round(metres * QUANT_MM));
}

/** FNV-1a 32-bit over a list of integers, least-significant byte first. `Math.imul` is spec-exact. */
export function fnv1a32(values: readonly number[]): number {
  let h = 0x811c9dc5;
  for (const value of values) {
    const v = value | 0;
    for (let shift = 0; shift < 32; shift += 8) {
      h ^= (v >>> shift) & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h >>> 0;
}

/**
 * Hash of the world at its own tick: tick, then every entity by ascending id with (id, x, z, vx, vz,
 * seq). Throws if the state left the integer/wire domain — a silent truncation would hide a desync.
 */
export function hashWorld(world: WorldState): string {
  const values: number[] = [world.tick];
  let previousId = 0;
  for (const e of world.entities) {
    if (e.id <= previousId) throw new QuantizationError('entities are not sorted by id');
    previousId = e.id;
    values.push(e.id, toWireMm(e.x), toWireMm(e.z), toWireMm(e.vx), toWireMm(e.vz), e.seq);
  }
  return fnv1a32(values).toString(16).padStart(8, '0');
}

/** Server-side history of (tick → hash). Bounded by tick count, never by a clock. */
export class HashRing {
  private readonly hashes = new Map<number, string>();

  constructor(readonly capacity = 128) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('hash ring capacity must be positive');
  }

  get size(): number { return this.hashes.size; }

  put(tick: number, hash: string): void {
    if (!Number.isInteger(tick) || tick < 0) throw new RangeError('tick must be a non-negative integer');
    this.hashes.set(tick, hash);
    while (this.hashes.size > this.capacity) {
      const oldest = this.hashes.keys().next();
      if (oldest.done) break;
      this.hashes.delete(oldest.value);
    }
  }

  get(tick: number): string | undefined { return this.hashes.get(tick); }

  /** Compare a client ack at the tick it names. An unknown tick is ignored, never counted as ok. */
  ack(tick: number, hash: string): 'ok' | 'desync' | 'unknown' {
    const expected = this.hashes.get(tick);
    if (expected === undefined) return 'unknown';
    return expected === hash ? 'ok' : 'desync';
  }
}
