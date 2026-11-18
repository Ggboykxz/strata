/**
 * @strata/game — browser client.
 *
 * P0-003 skeleton: no Babylon, no renderer, no networking. Those wait for NET-GATE (I2). This
 * entry only proves the client can consume the workspace packages and typecheck in a DOM context.
 */
import { CORE_VERSION, TICK_HZ } from '@strata/core';
import { PROTOCOL_VERSION } from '@strata/protocol';

console.log(
  `STRATA client skeleton — core ${CORE_VERSION}, tick ${TICK_HZ} Hz, protocol v${PROTOCOL_VERSION}`,
);
