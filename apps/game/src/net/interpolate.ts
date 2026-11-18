/**
 * Presentation interpolation (NET-004). Pure integer maths: `(numerator / denominator)` selects a point
 * between two snapshots, and the result is an integer millimetre like every other simulation value.
 * This never feeds back into the authoritative state.
 */
import { type EntityState, type WorldState } from '@strata/core';

/** Integer linear interpolation. Throws on an out-of-range alpha instead of clamping a rendering bug. */
export function lerpMm(from: number, to: number, numerator: number, denominator: number): number {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator <= 0
    || numerator < 0 || numerator > denominator) {
    throw new RangeError(`alpha ${String(numerator)}/${String(denominator)} is not in [0,1]`);
  }
  if (!Number.isInteger(from) || !Number.isInteger(to)) throw new RangeError('positions must be integer millimetres');
  return from + Math.trunc(((to - from) * numerator) / denominator);
}

export function interpolateEntity(a: EntityState, b: EntityState, numerator: number, denominator: number): EntityState {
  if (a.id !== b.id) throw new RangeError('cannot interpolate two different entities');
  return {
    id: a.id,
    x: lerpMm(a.x, b.x, numerator, denominator),
    z: lerpMm(a.z, b.z, numerator, denominator),
    vx: lerpMm(a.vx, b.vx, numerator, denominator),
    vz: lerpMm(a.vz, b.vz, numerator, denominator),
    seq: Math.max(a.seq, b.seq),
  };
}

/** Interpolate two worlds by entity id. Entities present in only one snapshot are used unchanged. */
export function interpolateWorld(a: WorldState, b: WorldState, numerator: number, denominator: number): WorldState {
  const byId = new Map(a.entities.map((entity) => [entity.id, entity]));
  const entities: EntityState[] = b.entities.map((later) => {
    const earlier = byId.get(later.id);
    return earlier ? interpolateEntity(earlier, later, numerator, denominator) : later;
  });
  for (const earlier of a.entities) {
    if (!b.entities.some((entity) => entity.id === earlier.id)) entities.push(earlier);
  }
  entities.sort((x, y) => x.id - y.id);
  return { tick: b.tick, entities };
}
