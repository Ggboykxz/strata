## 2026-11-18T00:44:00Z | tools-engineer -> all | EVIDENCE

**claim:** the workspace builds and `pnpm verify` is green, and each of its first three steps can be shown
to fail.

**evidence** (`docs/state/evidence/20261118T004153Z-P0-003/`)
- `01-install-frozen.log` — 7 workspace projects, lockfile accepted, exit 0
- `02-typecheck.log` — clean `tsc -b` after deleting every `dist/`, exit 0
- `03-lint.log` — 1 core source file, 0 banned constructs, exit 0
- `04-unit.log` — 3 files, 4 tests passed, exit 0
- `05-verify.log` — **7/7 enabled steps green**, 3 deferred groups listed, exit 0
- `06-negative-typecheck.log` — deliberate `string` assigned to `number`, `tsc` exit 2
- `07-negative-lint.log` — `Math.random` + `Date.now` in core, 2 findings, exit 1
- `08-negative-unit.log` — deliberate `expect(1).toBe(2)`, 1 failed, exit 1
- `09-negative-verify.log` — same type error, verify stops at typecheck, exit 1, lint never runs
- `10-versions.log` — node, pnpm, tsc, vitest, @types/node, kernel

**measured**
- workspace: 6 members (2 packages, 3 apps, 1 sim lib) + root = 7 projects
- verify: typecheck → lint → unit → prompt drift → scope → scope-math → blueprint. Fail-fast.
  Deferred: determinism replay (no sim), GDD coverage (P1), 17 `validate-*.mjs` stubs + 4 other stubs
- pins: Node 22.23.4, pnpm 12.21.0, TypeScript 6.0.3, Vitest 5.1.0, @types/node 22.20.5
- lockfile 28 863 bytes, committed; pnpm 12 supply-chain policy check passed

**decisions**
1. **TypeScript 6.0.3, not 7.0.2.** 7.x exposes only `version` from `import 'typescript'`; the AST-based
   core-math ban cannot run on it. A regex lint would be fooled by comments and strings, which is worse
   than an older compiler. Revisit when the lint is ported.
2. **One commit, despite `split: true`.** A workspace without its packages cannot typecheck; a skeleton
   without verify cannot pass. Splitting here would create a commit that is red by construction. The
   B8 split stays declared and is reported as a warning.
3. **Lint is the core-math ban only.** A general style linter is not required by P0-003 and would add
   dependencies without a rule to enforce. Recorded in `STACK.lock.md` as the current definition.
4. **Deferred is printed.** `verify` names determinism replay, GDD coverage and the 21 stubs. It never
   counts an absent check as green.

**impact:** concept_role `sig` (the skeleton is the first executable shape of the architecture);
SL-P0-003, 1 session; tier S0; no GDD module exists yet (P1).
**ask:** none. **D-002 remains open** and blocks WF-002, not P0-003.
**deadline:** GATE:P0
