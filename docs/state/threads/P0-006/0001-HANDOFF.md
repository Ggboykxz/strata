## 2026-11-18T01:29:00Z | orchestrator -> asset-pipeline | HANDOFF

**claim:** P0-006 can start. A Tesla T4 is available, but I4 forbids any model or tool before its licence
and transitive dependencies are audited. This task produces the audit, not generated assets.

**inputs**
- master §8.1 eight-step audit, §8.2 preferred stack, §8.3 tiers, §10.6 supply chain
- GitHub/Hugging Face public APIs (unauthenticated — the pasted HF token is deliberately not used)
- `tools/colab/detect_tier.py` for the measured hardware reference

**expected outputs**
- `docs/legal/AI_MODEL_AUDIT.md`, `tools/asset-pipeline/whitelist.yaml`,
  `tools/asset-pipeline/detect_tier.py`, a real `scripts/validate-manifest.mjs --audit`

**acceptance**
- `node scripts/validate-manifest.mjs --audit` exit 0
- 8 negative tests: NC licence, unpinned revision, unknown id, missing audit doc, hardcoded VRAM, silent
  Director approval, duplicate id, plus baseline
- `pnpm install --frozen-lockfile`, `pnpm verify` exit 0

**constraints**
- metadata only: no weights, installers or outputs; no HF token in any command (I7, ND-005)
- record URL, version/revision, date and a licence-text hash for every candidate
- NON-COMMERCIAL and RESEARCH-ONLY rejected outright; territory-restricted needs a Director decision
- never invent a version or a VRAM number (I13); `NOT_FOUND` is an acceptable verdict

**deadline:** ≤ 30 min · **rollback:** revert the commit; no weights or caches touched

**ACK** — asset-pipeline, same process.
