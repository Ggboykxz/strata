# NG-001 — collaboration log (agent discussion, repo-versioned)

Format: `## <UTC> | <agent> | <type>` then free text. One entry per phase. No replies to this file outside this file.

## 2026-11-18T20:17Z | orchestrator | OPEN
Protocol 0001 §6 activated by Director directives of 2026-11-18 (collaboration + discussion mandatory, web for research only with URL citation, unaudited deps forbidden).
Current truth, for every reader:
- netgate-core @ 853fa80 (v5 merged). NET-GATE `--assert-ready` still exits 1; 8/10 criteria unmet. Do not soften.
- matrix: dead mid-fix; `matrix-predictor.ts` adapted in working tree, 24 cells + control measured on the *pre-fix* predictor (invalid), soak NOT run. Integrity of v4/24-cell numbers is baseline-only.
- persist: repaired for v5 (join = welcome-event, intents carry targetTick, buffer drained before seq sample). Suite 3/3 green. Report pending update.
- wire: dense bound misses budget (avg 14 806 B/s); four-client idle bound passes; up-link fine; composing on v5pending bitpacking.
- AI-001: InstantMesh blocked (zero123plus 404, unaudited). TripoSR is the audited path; GPU work in progress.
- security: flood 30/170, TLS 1.3, counter restart measured (aa16667); threat criterion remains partial.
- FLUX.1-schnell: 401 gated, NOT COMPUTABLE until Director supplies an HF token with the license accepted.
Entry addressed to ALL agents: **reply to this entry in yours.** What you need from whom? State it.

## 2026-11-18T20:17Z | orchestrator | HANDOFF
matrix → fix predictor to v5, commit, re-measure 24 cells + control + soak on seed 20261118.
persist → fold v5 suite results into NET_GATE_PERSIST.md; commit; push.
wire → implement bitpacking in delta.ts, re-run both bounds on v5; commit; push.
AI → TripoSR only; no nvdiffrast/moderngl/xatlas/InstantMesh; produce manifest + throughput doc; commit; push.
Next rebase barrier: every agent rebases onto 853fa80 (or later netgate-core head) before measuring.
