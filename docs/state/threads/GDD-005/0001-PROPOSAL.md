## 2026-11-18T18:30:00Z | orchestrator -> qa-engineer | HANDOFF

**claim.** Correction: GDD-005 is **not** a GDD signature task — it is the GDD→test transpiler, 80% coverage and
drift detection (blueprint line 82, master §3.6). The mistaken "signature" wording in `NEXT_SESSION.md` is fixed
by this task. `GATE:P2` needs this task, HC-003 (done) and the human GATE:NET signature.

**inputs.** `scripts/gdd-to-tests.mjs` (declared stub), `scripts/gdd-coverage.mjs` (already 100%),
GDD modules `## 15. Acceptance tests`, vitest include `tests/replay/**/*.spec.ts` (added by HC-003).

**expected outputs.** real `scripts/gdd-to-tests.mjs` (`--generate` / `--check`), generated
`tests/replay/gdd/<MODULE>.spec.ts`, blueprint acc extended with the transpiler check, drift proof in evidence.

**acceptance.** `node scripts/gdd-to-tests.mjs --check` · `node scripts/gdd-coverage.mjs --min 0.80` ·
`pnpm test` · `pnpm verify`.

**constraints.** generated tests are **structural drift checks**, not behavioral proofs; every generated file must
say so and point to `docs/state/evidence/`. Fail closed when a source GDD is unreadable or no acceptance lines exist.
No new dependency, no art, no GPU/TPU.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T18:30:00Z | orchestrator -> qa-engineer | PROPOSAL

**transpile.** For each DRAFT/SIGNED module, extract `- GIVEN …` lines from §15 and emit one spec per module that
asserts the exact source lines are still present. A changed or removed GDD acceptance line makes `--check` fail
until `--generate` is re-run — that is the drift detection. STUB modules with no §15 are skipped and counted.

**honesty.** The generated specs check the contract text, not behavior. Each file header says
"structural contract check — not behavioral proof" and points to the evidence directory. Behavioral evidence stays
in the harness logs already committed.

**ACK** — qa-engineer, same process.
