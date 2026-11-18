## 2026-11-18T00:42:00Z | orchestrator -> tools-engineer | HANDOFF

**claim:** P0-003 is executable now that `corepack enable` provides pnpm 12.21.0. The workspace is a
skeleton: no gameplay, no netcode, no renderer, no assets.

**inputs**
- `docs/blueprint/BLUEPRINT.yaml` P0-003 — 7 output paths, `scaffold: true`, `split: true`
- `docs/STACK.lock.md` does not exist yet; master §6 defines what it must pin
- `docs/state/OWNERSHIP.yaml` — `packages/**`/`apps/**` are gameplay-engineer, root files tools-engineer,
  `docs/STACK.lock.md` producer; P0-003 is scaffold-exempt and the exemption is printed by B2

**expected outputs**
- root: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.json`, `vitest.config.ts`,
  `.npmrc`, `pnpm-lock.yaml`
- `packages/core/`, `packages/protocol/`, `apps/game/`, `apps/server/`, `apps/dashboard/`,
  `tools/sim/lib/`
- `scripts/verify.mjs` (the one definition of `pnpm verify`), `scripts/lint-core-math.mjs`
- `docs/STACK.lock.md` with exact versions, read from the installed tools

**acceptance**
- `pnpm install --frozen-lockfile` exit 0
- `pnpm verify` exit 0 with every enabled step green and every missing step printed as DEFERRED
- deliberate failures: type error exits nonzero, `Math.random`/`Date.now` in core exit 1, failing
  assertion exits 1, `pnpm verify` stops at the first red

**constraints**
- no dependency without an exact pin in `STACK.lock.md`; no `^`, `~`, `latest`
- `packages/core` stays dependency-free and free of clock/RNG/transcendentals — enforced from day one
- TypeScript 7.0.2 cannot be used: it ships the native compiler and no JS AST API, which the core-math
  lint needs. Pin 6.0.3 and record the trade-off, rather than downgrade the rule
- the full §6 verify pipeline cannot exist yet; deferred steps are named, never counted as green

**deadline:** this session · **rollback:** revert the commit; delete `node_modules/`, no runtime impact

**ACK** — tools-engineer, same process.
