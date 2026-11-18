# GDD-AI-ASSETS — DRAFT

| field | value |
|---|---|
| id | GDD-AI-ASSETS |
| version | 0.2 |
| owner | asset-pipeline |
| status | DRAFT |

> DRAFT carries all 19 mandatory fields (docs/design/GDD.md). SIGNED is required before content ships.

## 1. Identity, version, owner, status

ID GDD-AI-ASSETS, version 0.2, owner asset-pipeline, status **DRAFT**. Derived from VISION v1.0 and the locked HIGH_CONCEPT.

## 2. Player-facing outcome

Every generated asset carries a licence id and a measured throughput, and unapproved models cannot be imported.

## 3. High Concept link

I4 licence audit before use; D3 provenance for every asset.

## 4. Deterministic rules

1. No model or tool is imported unless its id is APPROVED in tools/asset-pipeline/whitelist.yaml.
2. Every asset manifest records the licence id, model revision, prompt hash and measured throughput.
3. A tier bump or model version change requires a new audit entry before use.

## 5. Numbers with source

- approved entries = 9, blocked = 0, rejected = 11 | SOURCE: AUDIT-2026-11-18-P0-006
- measured device = Tesla T4, 15360 MiB reported, nominal 16 GB | SOURCE: tools/colab/detect_tier.py
- assets per session = NOT COMPUTABLE until AI-001 measures throughput | SOURCE: metrics.json
- one job at a time, chunk <= 60 min, checkpoint per asset | SOURCE: master §7 long-job rules

## 6. State machine

CANDIDATE → AUDITED → WHITELISTED → GENERATED → MANIFESTED → CHECKPOINTED → IMPORTED.

## 7. Data contract

asset_manifest v1 {asset_id, licence_id, model_revision, prompt_hash, tier, throughput, sha256}. The manifest cites AUDIT-2026-11-18-P0-006. Migration: a new model revision creates a new manifest, never overwrites an old one.

## 8. Edge cases

1. Model licence is NON-COMMERCIAL: manifest refused by validate-manifest --audit.
2. Tier detection reports NO_GPU: CPU-safe procedural fallback is selected, no model call.
3. Two generations in one job: second is refused; one job at a time is enforced.
4. Rejected entry has no fallback mapping: validator exits 1 before the task starts.
5. Generated asset has no licence id: import is refused, asset is quarantined.

## 9. Failure states

1. Audit missing: model is not imported; NOT_FOUND is terminal, never guessed.
2. Checkpoint lost: job resumes from the last asset manifest, not from scratch.
3. Territory-restricted licence: blocked pending Director; agent cannot approve it.

## 10. Interaction matrix

AI-ASSETS × ANIM-ARCHITECTURE: generated clips require a retarget audit. AI-ASSETS × SECURITY: no token in logs or binaries.

## 11. Feedback per state change

Each generation emits one manifest line with licence id and measured throughput; no claim without a log.

## 12. Accessibility

Asset metadata is textual and keyboard accessible in the GM dashboard.

## 13. Localization

Licence ids and model revisions are tokens; no localized text in the manifest.

## 14. Telemetry and success metric

assets_per_session, throughput_measured, licence_audit_id, checkpoint_count. Success metric: 0 unlicensed imports.

## 15. Acceptance tests

- GIVEN a rejected model id WHEN validate-manifest --audit runs THEN it exits 1 and names the id.
- GIVEN no GPU WHEN detect_tier runs THEN the policy prints NO_GPU and no model is called.
- GIVEN a generated asset WHEN imported THEN its manifest cites a licence id and a measured source.

## 16. Perf budget impact

one job at a time; chunk <= 60 min; checkpoint per asset; GPU memory freed between jobs.

## 17. Explicit out of scope

No NC or research-only model, no Mixamo asset, no binary in git, no model before NET-GATE for scene generation.

## 18. Open questions

| question | owner | deadline |
|---|---|---|
| W | h | a |
| A | r | e |

## 19. Changelog

| version | date | change | by |
|---|---|---|---|
| 0.1 | 2026-11-18 | STUB created by GDD-001 | game-designer |
| 0.2 | 2026-11-18 | DRAFT: all 19 fields and sourced economy numbers | GDD-004 |
