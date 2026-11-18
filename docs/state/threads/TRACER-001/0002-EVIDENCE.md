## 2026-11-18T01:08:00Z | tools-engineer -> all | EVIDENCE

**claim:** the walking skeleton runs end to end and its hash gate can fail.

**evidence** (`docs/state/evidence/20261118T010750Z-TRACER-001/`)
- `01-tracer-assert.log` — `pnpm tracer --assert` exit 0. Real WS server on an ephemeral port, two replicas,
  5 authoritative ticks, equal hashes, Babylon v9.37.0 NullEngine capsule mesh rendered.
- `02-tracer-desync-negative.log` — `TRACER_FORCE_DESYNC=1 pnpm tracer --assert` **exit 1**: a lying replica
  breaks the equality assertion. The first iteration of this test passed for the wrong reason (it *expected*
  `verdict=desync`, so a desync looked like a pass); the test now asserts equality first and checks detection
  afterwards.
- `03-lint-negative.log` — `Math.random` injected into core → `pnpm lint` exit 1, 1 finding. The I14 gate still
  holds now that core has real simulation code.
- `04-license-check.log` — exact licenses read from the registry: Babylon Apache-2.0, ws MIT, @types/ws MIT.
- `05-frozen-install.log` — lockfile accepted, exit 0.
- `06-verify.log` — `pnpm verify` 9/9, exit 0.

**design notes**
- The core hash is FNV-1a over five integer fields using `Math.imul` (correctly rounded by ECMAScript, not a
  transcendental). State is fixed-point milli-units; presentation interpolation is float and never hashed.
- The server owns the tick and the only wall clock (`setInterval` in `apps/server/src/main.ts`). The assert
  harness drives `server.tick()` manually, so Node has no say in the result.
- The client is transport-free: it predicts, reconciles from snapshots by replaying only unacked intents,
  and interpolates for display. The test injects WebSocket; the browser entry injects the DOM.
- `packages/protocol` gained a real dependency on `@strata/core` for its types; tsc needed both the package
  link and the project reference. Silent guessing was not an option (I5).

**impact:** concept_role `sig`; SL-TRACER-001, 1 session; tier S0; NET-GATE still unpassed.
**ask:** none. Author ≠ reviewer still holds; the Director merges PR #1.
**deadline:** GATE:P0
