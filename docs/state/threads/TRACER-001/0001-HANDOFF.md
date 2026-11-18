## 2026-11-18T01:02:00Z | orchestrator -> tools-engineer | HANDOFF

**claim:** TRACER-001 is executable: P0-003 gives a workspace, WF-002 gives enforced ownership, and D137
puts this walking skeleton before bulk GDD work. Selected over P0-004 because both depend only on P0-003
but this task is `sig` and CI is `amp`.

**inputs**
- `docs/blueprint/BLUEPRINT.yaml` TRACER-001 — `scaffold: true`, 4 output directories, acc `pnpm tracer --assert`
- `docs/STACK.lock.md` — Babylon and `ws` are NOT INSTALLED; pin before first import
- master §6 / I2 / I3 — greybox capsule allowed before NET-GATE; Babylon banned from the server tick

**expected outputs**
- `packages/core/src/tracer.ts` — seeded PRNG, integer fixed-point state, 30 Hz pure step, FNV-1a hash
- `packages/protocol/src/tracer.ts` — intent / snapshot / hashack, versioned, no zod until pinned
- `apps/server/src/tracer.ts` — authoritative WS host, one tick at a time, hashacks compared to snapshots
- `apps/game/src/tracer-client.ts`, `render.ts`, `main.ts` — predict / reconcile / interpolate / Babylon render
- `apps/game/test/tracer.test.ts`, `vitest.tracer.config.ts`, `scripts/tracer.mjs` — the one assert command

**acceptance**
- `pnpm tracer --assert` exit 0: equal server/client hashes, desync rejected, Babylon capsule rendered
- `TRACER_FORCE_DESYNC=1 pnpm tracer --assert` **exit 1** — the gate must be able to fail
- `Math.random` in core → `pnpm lint` exit 1 (I14 still holds while real sim code lands)
- `pnpm install --frozen-lockfile` and `pnpm verify` exit 0

**constraints**
- pin exact versions and record licenses before first import: Babylon **9.37.0 Apache-2.0**, `ws` **8.23.0 MIT**
- NullEngine in tooling/CI only; no renderer import in `apps/server`
- no hero asset, texture bake, motion or scene generation. NET-GATE stays unpassed
- `packages/core` remains deterministic: no clock, unseeded RNG, DOM/Node or transcendentals

**deadline:** ≤ 30 min · **rollback:** revert the commit, drop the two pins; no runtime state

**ACK** — tools-engineer, same process.
