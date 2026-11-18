# STACK LOCK

Master §6: "`docs/STACK.lock.md` pins exact versions … `packageManager` is pinned in `package.json`.
'Latest' is not a version."

This file is normative. A dependency not listed here is not approved; an entry marked **NOT INSTALLED**
must be pinned before its first import. Changing a pin is a PR that touches this file and `pnpm-lock.yaml`
in the same commit.

Measured 2026-11-18 on `Linux 6.6.159+ x86_64` — log:
`docs/state/evidence/20261118T004153Z-P0-003/10-versions.log`.

## Pinned and installed

| component | exact version | where it is pinned | measured by |
|---|---|---|---|
| Node.js | **22.23.4** | `engines.node: ">=22.23.4 <23"` + this table (the exact reference) | `node -v` |
| pnpm | **12.21.0** | `package.json` → `packageManager` | `pnpm -v` |
| TypeScript | **6.0.3** | root `devDependencies` (exact, no `^`) | `tsc -v` |
| Vitest | **5.1.0** | root `devDependencies` | `vitest --version` |
| @types/node | **22.20.5** | root `devDependencies` (matches Node 22, not latest) | package.json |

**Why TypeScript 6.0.3 and not 7.0.2.** `typescript@7` ships the native compiler and no longer exposes
the JavaScript AST API (`import * as ts from 'typescript'` returns only `version`). The core-math ban
(`scripts/lint-core-math.mjs`) parses the AST; a regex would be fooled by comments and strings. The pin
returns to 7 when either the lint is ported or the API ships. Recorded as a trade-off, not a preference.

## Not installed — no task may import them yet

| component | status | earliest task / gate that must pin it |
|---|---|---|
| Babylon.js | NOT INSTALLED | P2 client work, after NET-GATE |
| Colyseus | NOT INSTALLED | NET-001 |
| zod | NOT INSTALLED | first protocol schema (NET-001) |
| Playwright | NOT INSTALLED | first browser-automation task — not scheduled yet |
| Blender | NOT INSTALLED | first asset-pipeline task, after P0-006 license audit |
| ComfyUI | NOT INSTALLED | AI-001, after P0-006 license audit |
| CUDA | NOT INSTALLED | AI-001; VRAM tier detection first |

An empty cell is not "whatever pnpm resolves". It is a gate.

## Install and verify

```bash
corepack enable                 # provides the pinned pnpm
pnpm install --frozen-lockfile  # the only accepted install in CI
pnpm verify                     # the one definition, scripts/verify.mjs
```

`pnpm verify` at P0-003 runs, fail-fast: **typecheck** (`tsc -b`) → **lint** (core-math AST ban) →
**unit** (Vitest) → `validate-prompt-drift` → `validate-scope` → `scope-math --check` →
`validate-blueprint`. It prints `DEFERRED` for determinism replay, GDD coverage and every declared
stub. Deferred steps are never counted as green; the full pipeline from §6 is the target, not a claim.

## Lockfile policy

- `pnpm-lock.yaml` is committed. `--frozen-lockfile` is the CI default.
- No `^`, `~`, `latest` or `*` in any `dependencies`/`devDependencies`; workspace links are `workspace:*`.
- pnpm 12 supply-chain verification must pass; a failed policy check is a red build, not a warning to ignore.
- Adding a dependency requires: license audit (§10.6) if it ships in the client, an exact pin here, and a
  line in the task's evidence.
