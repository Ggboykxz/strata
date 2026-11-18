# A0015 — Zero123++ re-audit: sudo-ai/zero123plus-v1.2 is UNUSABLE (no license)

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18** (record of an audit, no usage authorized) |
| author | orchestrator, after a HEAD-level probe |
| date | 2026-11-18 |
| decision owner | Director (D-AUDIT applies) |
| supersedes | the part of the AI-001 narrative that claimed "sudo-ai/zero123plus-v1.2 does not exist (HTTP 404)" |

## Context

Sprint notes said InstantMesh could not run because `sudo-ai/zero123plus-v1.2` returned HTTP 404 for
`raw/main/README.md`. That was a **path-level 404 on a missing file**, not proof the repository is absent —
the repository exists, is public and ungated, and has 13 959 downloads. This ADR corrects the record.

The probe, repeated on this date:

```
curl -s "https://huggingface.co/api/models/sudo-ai/zero123plus-v1.2"
```

returns `id=sudo-ai/zero123plus-v1.2, sha=2da07e89919e1a130c9b5add1584c70c7aa065fd, private=false,
gated=false, region US, library_name=diffusers`, with these weight/config files:
`feature_extractor_clip/preprocessor_config.json`, `feature_extractor_vae/preprocessor_config.json`,
`model_index.json`, `scheduler/scheduler_config.json`, `text_encoder/model.safetensors`,
`tokenizer/*`, `unet/diffusion_pytorch_model.safetensors`, `vae/diffusion_pytorch_model.safetensors`,
`vision_encoder/model.safetensors`.

**There is no `LICENSE` file anywhere in the repository.** `.gitattributes` and `*.json` artifacts reference
no licence. `license` does not appear in `model_index.json`'s `_class_name` fields either.

## Decision

1. By §8.1 (and AUDIT-2026-11-18-P0-006's standing rule: no row APPROVED means not usable),
   `sudo-ai/zero123plus-v1.2` is **NOT USABLE** — code, weights, and the implied third-party VAE
   dependencies are all unauditable here. Anonymous access (200/302/redirect-to-CDN) does **not** authorize use.
2. The InstantMesh path therefore stays closed exactly as before. No workaround is legal by bypassing
   the pipeline interface; an SDK shim or local custom-pipeline code from the TencentARC InstantMesh tree
   (Apache-2.0) is **not sufficient** because the weights remain unlicensed.
3. The audited fallback remains **TRIPOSR** (MIT). All TripoSR-based work (AI-001 mesh and props) proceeds.
4. **FLUX.1-schnell remains NOT COMPUTABLE** for the same reason class: the weights are committee/gated
   (HTTP 401 anonymous). Using them requires a Director-supplied HF token and the acceptance of the licence;
   neither happened. No other 2D model in the approved set exists (Kokoro=TTS, jsfxr=SFX) — the audit says so.
5. The record in AI_THROUGHPUT.md and AI_PROPS.md is updated by an appendix noting the 404-path misreport
   correction; no other past claim is invalidated.

## Consequences

- AI-001 hero mesh done under A0012 bypass stands (TRIPOSR) — unaffected.
- The `"sudo-ai/zero123plus-v1.2 404"` line in docs is hereby corrected; the decisive fact is the **absence of
  any license**.
- If the Director wants InstantMesh eventually, it requires a written license for the sudo-ai repository
   (author-to-you), or a different, audited Zero123++-lineage release with an explicit permissive license adopted into
   a new whitelist row (D-AUDIT step recorded). Neither happened on this date.
- No workflow, no model, no mirror may be used to launder this into "approved"; every artifact produced so
   far (mesh, inputs, manifests) cites the accounts for itself.
