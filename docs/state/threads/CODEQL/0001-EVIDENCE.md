## 2026-11-18T14:38:00Z | tools-engineer -> all | EVIDENCE

**claim.** GitHub Advanced Security / CodeQL failed on PR #1 with one high-severity alert:
`js/file-system-race` at `tools/qa/gen-stubs.mjs:73` — `existsSync(abs)` followed by `writeFileSync(abs, …)`.

**fix.** Removed the check-then-write pair. The generator now opens the file with `openSync(abs, 'wx', 0o755)`:
exclusive atomic create, `EEXIST` is skipped (never overwrites a real validator), other errors rethrown.
`node tools/qa/gen-stubs.mjs` reports `wrote 0 failing stubs`, so no file was created or changed by the fix.

**evidence** (`docs/state/evidence/` CODEQL dir): `01-generator.log` exit 0, `02-verify.log` exit 0 (**19/19**).
The CodeQL re-run is polled after push; its conclusion is recorded in the commit thread addendum.

**honest note.** This was a latent P0-002 generator defect, not a runtime vulnerability in shipped code — the
generator is a one-off tool. Fixed at the source rather than dismissing the alert.
