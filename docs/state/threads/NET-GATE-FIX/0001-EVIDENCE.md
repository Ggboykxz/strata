## 2026-11-18T20:18:00Z | orchestrator -> all | EVIDENCE

**Defect.** Asked why NET-GATE failed, the validator answered with 3 spurious integrity errors: it selected
`docs/state/metrics/concept.json` (HC-003 CIS source) as the latest metrics file, so `netgate` was undefined.
Third instance of the same file-selection bug after the dashboard and session-result tools.

**Fix.** Filter session metrics by `YYYY-MM-DD-sN.json`. After the fix: integrity PASS, readiness
`NOT READY — 8/10 criteria unmet`, `--assert-ready` exit 1 with the 8 named criteria. No criterion was changed,
no assertion weakened, no signature altered.

**Honest note.** The earlier "NET-GATE fails" answer would have been wrong (integrity errors, not criteria). The
dossier's 8 unmet criteria are the real reason readiness fails; this fix only restores the correct diagnostic.
