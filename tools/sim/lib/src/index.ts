/**
 * @strata/sim-lib — shared harness for headless simulations.
 *
 * P0-003 skeleton: no bots, no scenarios, no fast-forward. It exists so `tools/sim/**` has a typed
 * home before the first prototype (NET-001, ECON-001) needs one.
 */
import { TICK_HZ } from '@strata/core';

/** The harness defaults to the authoritative rate; a scenario may override it explicitly. */
export const DEFAULT_TICK_HZ = TICK_HZ;
