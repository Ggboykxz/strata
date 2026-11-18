/**
 * @strata/core — the isomorphic deterministic simulation.
 *
 * P0-003 skeleton: constants only. No ECS, no systems, no gameplay. The point of this file is to
 * give the workspace a real package with a real build edge, while `scripts/lint-core-math.mjs`
 * starts policing the rules before there is code to break them.
 *
 * Everything added here must be deterministic: no wall clock, no unseeded randomness, no
 * transcendentals, no DOM, no Node, no dependencies.
 */

/** Fixed simulation rate. The tick number is the only clock the simulation may read. */
export const TICK_HZ = 30;

/** Milliseconds in one tick. Exact in the tick domain; presentation interpolates between ticks. */
export const TICK_MS = 1000 / TICK_HZ;

/** Package version, kept in sync with package.json by hand until a release task exists. */
export const CORE_VERSION = '0.0.0';
