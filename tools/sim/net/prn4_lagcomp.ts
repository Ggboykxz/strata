/**
 * PR-N4 lag compensation (local structural harness). Rewind to the shooter's tick, then validate range, LOS and
 * cooldown on the rewound authoritative world. No `Math.sqrt`, no trigonometry, no floats: integer millimetres
 * and squared distances only (D147). A client's claim never decides a hit (I1/I3).
 */
import {
  stepWorld, type WorldState,
} from '../../../packages/core/src/index';

/** 30 ticks = 1 s at 30 Hz. Outside this ring a shot is refused, never approximated. */
export const REWIND_TICKS = 30;
/** LOS grid cell, millimetres. */
export const LOS_CELL_MM = 1000;
/** Greybox range ceiling, millimetres. TUNABLE until PR-S1 measures the weapon. */
export const MAX_RANGE_MM = 12_000;
/** Minimum ticks between two shots by the same entity. TUNABLE until PR-S1. */
export const COOLDOWN_TICKS = 15;

export interface Wall {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

export interface Shot {
  readonly shooter: number;
  readonly target: number;
  readonly tick: number;
  /** What the client says happened. Ignored by validation: kept to make the rule testable. */
  readonly claimed: boolean;
}

export type ShotVerdict = 'hit' | 'miss' | 'out-of-range' | 'blocked' | 'cooldown' | 'stale-shot' | 'unknown-entity';

/** Bounded tick→world ring. Evicts by tick count, never by a clock. */
export class WorldHistory {
  private readonly frames = new Map<number, WorldState>();

  constructor(readonly capacity = REWIND_TICKS + 1) {
    if (!Number.isInteger(capacity) || capacity < 2) throw new RangeError('capacity must be at least 2');
  }

  get newestTick(): number {
    let newest = -1;
    for (const tick of this.frames.keys()) if (tick > newest) newest = tick;
    return newest;
  }

  record(world: WorldState): void {
    this.frames.set(world.tick, world);
    while (this.frames.size > this.capacity) {
      let oldest = Infinity;
      for (const tick of this.frames.keys()) if (tick < oldest) oldest = tick;
      this.frames.delete(oldest);
    }
  }

  at(tick: number): WorldState | null { return this.frames.get(tick) ?? null; }
}

/** Squared distance in mm², computed in bigint so a large coordinate cannot overflow a Number. */
export function distanceSquaredMm(a: { x: number; z: number }, b: { x: number; z: number }): bigint {
  const dx = BigInt(a.x) - BigInt(b.x);
  const dz = BigInt(a.z) - BigInt(b.z);
  return dx * dx + dz * dz;
}

function cellBlocked(cx: number, cz: number, walls: readonly Wall[]): boolean {
  const x0 = cx * LOS_CELL_MM;
  const z0 = cz * LOS_CELL_MM;
  const x1 = x0 + LOS_CELL_MM;
  const z1 = z0 + LOS_CELL_MM;
  return walls.some((wall) => wall.x0 < x1 && wall.x1 >= x0 && wall.z0 < z1 && wall.z1 >= z0);
}

/** Integer Bresenham LOS between two world points over fixed cells. Endpoints are exempt. */
export function hasLineOfSight(a: { x: number; z: number }, b: { x: number; z: number }, walls: readonly Wall[]): boolean {
  let x = Math.floor(a.x / LOS_CELL_MM);
  let z = Math.floor(a.z / LOS_CELL_MM);
  const targetX = Math.floor(b.x / LOS_CELL_MM);
  const targetZ = Math.floor(b.z / LOS_CELL_MM);
  const startX = x;
  const startZ = z;
  const dx = Math.abs(targetX - x);
  const dz = Math.abs(targetZ - z);
  const stepX = x < targetX ? 1 : -1;
  const stepZ = z < targetZ ? 1 : -1;
  let error = dx - dz;

  for (let guard = 0; guard <= dx + dz + 2; guard++) {
    const isEndpoint = (x === startX && z === startZ) || (x === targetX && z === targetZ);
    if (!isEndpoint && cellBlocked(x, z, walls)) return false;
    if (x === targetX && z === targetZ) return true;
    const twice = 2 * error;
    if (twice > -dz) { error -= dz; x += stepX; }
    if (twice < dx) { error += dx; z += stepZ; }
  }
  return false;
}

/** Validate a shot against the rewound world. Order: rewind → identity → cooldown → range → LOS. */
export function validateShot(
  history: WorldHistory,
  shot: Shot,
  lastShotTick: ReadonlyMap<number, number>,
  walls: readonly Wall[],
): ShotVerdict {
  const world = history.at(shot.tick);
  if (!world || history.newestTick - shot.tick > REWIND_TICKS) return 'stale-shot';
  const shooter = world.entities.find((entity) => entity.id === shot.shooter);
  const target = world.entities.find((entity) => entity.id === shot.target);
  if (!shooter || !target) return 'unknown-entity';

  const previous = lastShotTick.get(shot.shooter);
  if (previous !== undefined && shot.tick - previous < COOLDOWN_TICKS) return 'cooldown';
  if (distanceSquaredMm(shooter, target) > BigInt(MAX_RANGE_MM) * BigInt(MAX_RANGE_MM)) {
    return 'out-of-range';
  }
  if (!hasLineOfSight(shooter, target, walls)) return 'blocked';
  return 'hit';
}

export interface LagCompReport {
  readonly shots: number;
  readonly hits: number;
  readonly stale: number;
  readonly cooldown: number;
  readonly blocked: number;
  readonly out_of_range: number;
  readonly client_claims_ignored: boolean;
  readonly deterministic: boolean;
  readonly label: string;
}

/** Deterministic local fuzz: two runs with the same seed and script must give identical verdicts. */
export function runLagComp(shots = 600): LagCompReport {
  if (!Number.isInteger(shots) || shots < 4) throw new RangeError('shots must be an integer >= 4');
  const walls: readonly Wall[] = [{ x0: 5_000, x1: 6_000, z0: -2_000, z1: 2_000 }];

  const run = () => {
    const history = new WorldHistory();
    // Fixed greybox layout so the fuzz exercises hit, cooldown, blocked and out-of-range paths.
    let world: WorldState = {
      tick: 0,
      entities: [
        { id: 1, x: 0, z: 0, vx: 0, vz: 0, seq: 0 },
        { id: 2, x: 1_000, z: 0, vx: 0, vz: 0, seq: 0 },
        { id: 3, x: 9_000, z: 0, vx: 0, vz: 0, seq: 0 },
        { id: 4, x: 20_000, z: 0, vx: 0, vz: 0, seq: 0 },
      ],
    };
    history.record(world);
    const lastShotTick = new Map<number, number>();
    const verdicts: ShotVerdict[] = [];
    const fire = (shooter: number, target: number, tick: number) => {
      const verdict = validateShot(history, { shooter, target, tick, claimed: true }, lastShotTick, walls);
      verdicts.push(verdict);
      if (verdict === 'hit') lastShotTick.set(shooter, tick);
    };
    for (let tick = 1; tick <= 60; tick++) {
      world = stepWorld(world, [{ entity: 1, seq: tick, dx: 1, dz: 0 }]);
      history.record(world);
      if (tick % 3 === 0) fire(1, 2, tick);       // close target: hit, then cooldown
      if (tick % 12 === 0) fire(2, 3, tick);      // wall between: blocked
      if (tick % 15 === 0) fire(2, 4, tick);      // beyond range: out-of-range
    }
    // A late claim about an evicted tick, and a client "claim" that must not change any verdict.
    verdicts.push(validateShot(history, { shooter: 1, target: 3, tick: 0, claimed: true }, lastShotTick, walls));
    const claimIgnored = validateShot(history, { shooter: 1, target: 3, tick: 50, claimed: false }, new Map(), walls)
      === validateShot(history, { shooter: 1, target: 3, tick: 50, claimed: true }, new Map(), walls);
    return { verdicts, claimIgnored };
  };

  const a = run();
  const b = run();
  const count = (verdict: ShotVerdict) => a.verdicts.filter((value) => value === verdict).length;
  return {
    shots: a.verdicts.length,
    hits: count('hit'),
    stale: count('stale-shot'),
    cooldown: count('cooldown'),
    blocked: count('blocked'),
    out_of_range: count('out-of-range'),
    client_claims_ignored: a.claimIgnored && b.claimIgnored,
    deterministic: JSON.stringify(a.verdicts) === JSON.stringify(b.verdicts),
    label: 'local structural lag-comp fuzz — NOT network RTT, NOT a 30-minute soak',
  };
}
