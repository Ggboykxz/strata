## 2026-11-18T01:46:00Z | orchestrator -> tools-engineer | HANDOFF

**claim:** P0-007 can start. P0-003 created `apps/dashboard/` as a skeleton and master §18 defines the pages.

**inputs**
- master §18 dashboard pages; each page reads generated views or `metrics.json`, never its own truth
- `docs/state/metrics/2026-11-18-s01.json` — authoritative numbers, including three null values
- `OWNERSHIP.yaml`, `LOCKS.yaml`, `BLUEPRINT.yaml`, `DISPUTES.md`, `threads/`, `NEEDS_DIRECTOR.md`, whitelist

**expected outputs**
- `apps/dashboard/build.mjs` generating `dist/index.html` + `dist/data.json` for six view groups
- a real `build` script in `apps/dashboard/package.json`; `src/main.ts` as a typed view contract

**acceptance**
- `pnpm --filter @strata/dashboard build` exit 0
- repeat build with fixed `STRATA_BUILD_UTC` is byte-identical
- `NOT COMPUTABLE` appears for CIS, GDD coverage, months, netcode and economy fields
- deliberate TS error, missing metrics file and broken builder each exit nonzero
- no `fetch`, `WebSocket`, `GITHUB_TOKEN` or `HF_TOKEN` in the generated page or builder

**constraints**: read-only local view; no auth, no gameplay state, no live server. `dist/` is gitignored.

**deadline:** ≤ 30 min · **rollback:** revert the commit; generated output is disposable

**ACK** — tools-engineer, same process.
