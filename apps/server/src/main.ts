/**
 * @strata/server — authoritative headless host.
 *
 * P0-003 skeleton: no rooms, no tick loop, no persistence. It imports the shared simulation so the
 * build graph proves the server can run core; nothing is simulated yet.
 */
import { CORE_VERSION, TICK_HZ } from '@strata/core';

console.log(`STRATA server skeleton — core ${CORE_VERSION}, authoritative tick ${TICK_HZ} Hz`);
