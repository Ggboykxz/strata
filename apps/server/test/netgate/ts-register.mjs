/**
 * Registers the test-only TypeScript resolve hook for a child `node` process. Usage:
 *   node --experimental-transform-types --import ./apps/server/test/netgate/ts-register.mjs ...
 */
import { register } from 'node:module';

register('./ts-loader.mjs', import.meta.url);
