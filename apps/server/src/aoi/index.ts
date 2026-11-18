/**
 * index.ts — deterministic uniform-grid area-of-interest selection (NET-101 / A0011-i).
 *
 * The world is an integer-millimetre domain; this module never converts to metres and never uses a
 * floating-point distance. Space is divided into square cells of `AOI_GRID_CELL_MM` (32 000 mm, the
 * D90 radius). A query visits only the cells overlapping the radius, then ranks the survivors by
 * bigint squared distance and id, caps at `AOI_MAX_ENTITIES`, and returns them in ascending id order.
 *
 * Determinism contract (I14 / D147): the same (world, viewerId, radiusMm, cap) always yields the
 * same array. `Math.imul`/BigInt and integer arithmetic only; no clock, no randomness, no float, no
 * dependency. The cell key is a label, never part of the ordering: the (distance, id) sort is a total
 * order, so map iteration order cannot change the result.
 *
 * This is the reusable server-side AoI used by `Room.deltaFor` (A0011-i). The wire prototype's
 * `selectAoi` in `@strata/protocol` is the reference this must match; the parity assertion lives in
 * `apps/server/test/aoi.test.ts`.
 */
import type { EntityState, WorldState } from '@strata/core';

/** One grid cell: 32 m in integer millimetres (D90 radius from the NET-GATE wire design). */
export const AOI_GRID_CELL_MM = 32_000;
/** Default query radius: one cell, 32 m. */
export const AOI_RADIUS_MM = 32_000;
/** D90 cap: never more than 64 entities in a client view. */
export const AOI_MAX_ENTITIES = 64;

export type AoiErrorCode = 'bad-radius' | 'bad-cap' | 'viewer-missing';

export class AoiQueryError extends Error {
  constructor(readonly code: AoiErrorCode, message: string) {
    super(message);
    this.name = 'AoiQueryError';
  }
}

/** Integer cell coordinates for a millimetre position. `Math.floor` is spec-exact for negatives. */
function cellOf(mm: number): number {
  return Math.floor(mm / AOI_GRID_CELL_MM);
}

function cellKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export interface AoiQueryOptions {
  /** Query radius in integer millimetres. Defaults to `AOI_RADIUS_MM`. */
  readonly radiusMm?: number;
  /** Deterministic cap on returned entities. Defaults to `AOI_MAX_ENTITIES`. */
  readonly maxEntities?: number;
}

/**
 * Entities inside the viewer's AoI, sorted by id, at most `maxEntities`.
 *
 * The viewer is included when it is inside the radius (distance 0). An entity exactly on the radius
 * boundary is included; one millimetre beyond it is not. An entity that is new to the view and an
 * entity that leaves it are handled by the delta codec's `absolute`/`removed` entries — this function
 * only answers "which entities does this client see at this tick".
 */
export function queryAoi(
  state: WorldState,
  viewerId: number,
  radiusMm: number = AOI_RADIUS_MM,
  maxEntities: number = AOI_MAX_ENTITIES,
): readonly EntityState[] {
  if (!Number.isInteger(radiusMm) || radiusMm < 1) {
    throw new AoiQueryError('bad-radius', `radius ${String(radiusMm)} is not a positive integer mm`);
  }
  if (!Number.isInteger(maxEntities) || maxEntities < 1 || maxEntities > AOI_MAX_ENTITIES) {
    throw new AoiQueryError('bad-cap', `maxEntities ${String(maxEntities)} is outside 1..${AOI_MAX_ENTITIES}`);
  }

  let viewer: EntityState | undefined;
  const grid = new Map<string, EntityState[]>();
  for (const entity of state.entities) {
    if (entity.id === viewerId) viewer = entity;
    const key = cellKey(cellOf(entity.x), cellOf(entity.z));
    const bucket = grid.get(key);
    if (bucket) bucket.push(entity);
    else grid.set(key, [entity]);
  }
  if (!viewer) throw new AoiQueryError('viewer-missing', `viewer ${viewerId} is not in the world`);

  // A cell can be at most `AOI_GRID_CELL_MM` wide on each axis, so visiting `span` cells beyond the
  // viewer's own cell in every direction covers every entity that can be within the radius.
  const span = Math.ceil(radiusMm / AOI_GRID_CELL_MM);
  const vcX = cellOf(viewer.x);
  const vcZ = cellOf(viewer.z);
  const radiusSquared = BigInt(radiusMm) * BigInt(radiusMm);
  const candidates: Array<{ readonly entity: EntityState; readonly distanceSquared: bigint }> = [];
  for (let cx = vcX - span; cx <= vcX + span; cx += 1) {
    for (let cz = vcZ - span; cz <= vcZ + span; cz += 1) {
      const bucket = grid.get(cellKey(cx, cz));
      if (!bucket) continue;
      for (const entity of bucket) {
        const dx = BigInt(entity.x) - BigInt(viewer.x);
        const dz = BigInt(entity.z) - BigInt(viewer.z);
        const distanceSquared = dx * dx + dz * dz;
        if (distanceSquared <= radiusSquared) candidates.push({ entity, distanceSquared });
      }
    }
  }

  candidates.sort((a, b) => {
    if (a.distanceSquared < b.distanceSquared) return -1;
    if (a.distanceSquared > b.distanceSquared) return 1;
    return a.entity.id - b.entity.id;
  });
  const selected = candidates.slice(0, maxEntities).map((candidate) => candidate.entity);
  selected.sort((a, b) => a.id - b.id);
  return selected;
}
