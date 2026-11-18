# A0012 — Director-ordered I2 suspension for asset generation (AI-001)

| field | value |
|---|---|
| status | **ACCEPTED — 2026-11-18**, Director blanket override, recorded verbatim; revocable at any time |
| accepted_by | Director (`2026-11-18-s02`) |
| date | 2026-11-18 |
| task | AI-001 |
| parties | Director vs I2 (no art before NET-GATE readiness) |
| supersedes | the I2 hold **for AI-001 only** |

## Director statements (verbatim, 2026-11-18)

> bypass et fais en sorte que l'art passe a tout pris on doit gagnier du temps

> tu vas fix tout ce qui bloque

Recorded exactly as spoken. Not a signature of readiness, not a gate pass, not a waiver of honesty.

## Decision

1. I2 / A0008 ("no art before NET-GATE") is **suspended for AI-001 only**: the T4 may be used to generate one
   hero mesh (and, if credentials permit, one hero image) with the audited stack.
2. **No gate weakens.** `node scripts/validate-netgate.mjs` stays honest; `--assert-ready` stays exit 1 until the
   eight NET-GATE criteria are measured. NET-GATE remains `SIGNED — RISK ACCEPTED, NOT READY`. This ADR suspends
   a barrier to work, not a claim about the gate.
3. Everything else stays out of scope: WG-001, AN-001, P3-###, P4-### are still blocked. Only AI-001 artifacts
   may be generated.
4. Provenance is mandatory: every generated asset carries `asset_manifest v1` data (asset_id, licence_id, model
   revision, prompt hash, tier, measured throughput, sha256). Unmanifested assets are quarantined, not used.
5. Outputs are **smoke-quality AI generations** under a bypass, not production art and not gate evidence.
   No art asset may be presented as "gate-passed" or "signed".
6. Rollback: deleting `/content/ai` and the generated files leaves the repo unchanged except for text evidence
   and manifests. I2 can be re-imposed by the Director at any time; this ADR does not preempt that.

## Known blockers at time of decision (2026-11-18, probed)

| blocker | state | evidence owner |
|---|---|---|
| NET-GATE readiness | 8/10 unmet — bypassed by this ADR, not satisfied | `docs/qa/prototypes/NET_GATE.md` |
| FLUX.1-schnell weights | repo is license-gated; anonymous `GET`/`HEAD` on `transformer/diffusion_pytorch_model-00001-of-00003.safetensors` returns **HTTP 401**; no HF token present in the environment (`get_token()` → False) | orchestrator probes 2026-11-18 (logs to be filed under `docs/state/evidence/<utc>-AI-001/`) |
| ComfyUI | not installed | `docs/qa/AI_READINESS.md` §3.2 |
| Blender | `blender` not installed (apt candidate 4.0.2 available) | same |
| Approved geometry weights (InstantMesh large, TripoSR) | anonymous range requests return **302** (redirect to CDN), i.e. public | same probes |

## Consequences

- AI-001 proceeds under a bypass: throughput and outputs are recorded as measured, with failures left
  failing, in `docs/qa/AI_THROUGHPUT.md`.
- If the Director supplies an HF token and the FLUX.1-schnell license is accepted, the hero image can be
  produced in the same run; otherwise the image step remains **NOT COMPUTABLE** and is recorded as such.
- This ADR does not authorize committing binaries to git; `.gitignore` already blocks `.glb`/`.safetensors`.
  Binaries live under `/content/ai`; manifests and text evidence live in the repo.
