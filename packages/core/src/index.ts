/**
 * @strata/core — the isomorphic deterministic simulation.
 *
 * The tick (NET-001) lives in ./tick; the TRACER-001 capsule in ./tracer. Both are integer-only and
 * clock-free. Everything added here must be deterministic: no wall clock, no unseeded randomness, no
 * transcendentals, no DOM, no Node, no dependencies. `scripts/lint-core-math.mjs` enforces it.
 */

/** Package version, kept in sync with package.json by hand until a release task exists. */
export const CORE_VERSION = '0.0.0';

export * from './hash';
export * from './anim-state';
export * from './tick';
export * from './tracer';
