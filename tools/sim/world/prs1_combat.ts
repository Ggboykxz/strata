/**
 * PR-S1 greybox combat math (P2-SYS). Integer ticks only: TTK, attack windows and hit-stop. No art, no VFX,
 * no audio, no playtest claim. The report is a LOCAL simulation, not a browser or network measurement.
 */
import { TICK_HZ } from '../../../packages/core/src/index';

export interface CombatParams {
  readonly hp: number;
  readonly damage: number;
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
  readonly intervalTicks: number;
  readonly hitStopTicks: number;
}

export interface CombatReport {
  readonly hp: number;
  readonly damage: number;
  readonly hits_to_kill: number;
  readonly cycle_ticks: number;
  readonly ttk_ticks: number;
  readonly ttk_ms: number;
  readonly hit_stop_ticks: number;
  readonly hit_stop_ms: number;
  readonly legal: boolean;
  readonly label: string;
}

export const MAX_HIT_STOP_TICKS = 30;

/** An illegal window is refused, never clamped — the server applies the same rule to anim requests. */
export function isLegalWindow(params: CombatParams): boolean {
  const values = [
    params.hp, params.damage, params.windupTicks, params.activeTicks,
    params.recoveryTicks, params.intervalTicks, params.hitStopTicks,
  ];
  if (!values.every((value) => Number.isInteger(value) && Number.isFinite(value))) return false;
  return params.hp > 0
    && params.damage > 0
    && params.windupTicks >= 1
    && params.activeTicks >= 1
    && params.recoveryTicks >= 0
    && params.hitStopTicks >= 0
    && params.hitStopTicks <= MAX_HIT_STOP_TICKS
    && params.intervalTicks >= params.windupTicks + params.activeTicks + params.recoveryTicks;
}

/** Full cycle including the hit-stop freeze after a landed hit. */
export function cycleTicks(params: CombatParams): number {
  return Math.max(
    params.intervalTicks,
    params.windupTicks + params.activeTicks + params.recoveryTicks + params.hitStopTicks,
  );
}

export function simulateCombat(params: CombatParams): CombatReport {
  if (!isLegalWindow(params)) throw new RangeError('illegal combat window — refused, not clamped');
  const hits = Math.ceil(params.hp / params.damage);
  const cycle = cycleTicks(params);
  const ttk = (hits - 1) * cycle + params.windupTicks;
  const stop = hits * params.hitStopTicks;
  return {
    hp: params.hp,
    damage: params.damage,
    hits_to_kill: hits,
    cycle_ticks: cycle,
    ttk_ticks: ttk,
    ttk_ms: Math.round((ttk * 1000) / TICK_HZ),
    hit_stop_ticks: stop,
    hit_stop_ms: Math.round((stop * 1000) / TICK_HZ),
    legal: true,
    label: 'local greybox combat math — not a playtest, not FUN validation',
  };
}
