# AI_AUDIO — STRATA audio smoke artifacts (task AI-001, audio line)

| field | value |
|---|---|
| date | 2026-11-18 |
| audit | AUDIT-2026-11-18-P0-006 |
| worktree / branch | `/tmp/strata-audio` / `session/20261118-audio-line` (base `netgate-core` c60a732) |
| evidence | `docs/state/evidence/20261118T2058Z-AI-AUDIO/01-*.log` … `18-*.log` (`EXIT=` last line in each) |
| scope | two **smoke** artifacts only: a jsfxr SFX pack and one Kokoro-82M intro line |

## Verdicts (honest, per deliverable)

| deliverable | verdict | why |
|---|---|---|
| 1 — jsfxr SFX pack (4 WAV) | **COMPUTABLE — smoke only** | npm `jsfxr@1.4.1` installed; its bundled `UNLICENSE` git blob SHA was recomputed as `6d9eabbb7579f19b207be0e7ed52548ffdb32c90`, exactly the audit pin. Four deterministic 16-bit/44.1 kHz WAVs rendered with exact printed params and byte-identical reruns. |
| 2 — Kokoro-82M intro sting | **COMPUTABLE — smoke only** | HF API anonymous `sha=f3ff3571791e39611d31c381e3a41a3af07b4987` (audit pin), un-gated, `license:apache-2.0`; weight `kokoro-v1_0.pth` sha256 matches the model card; one line rendered with the card's default voice `af_heart`. |

Both are smoke artifacts under the A0012/A0014-like bypass lineage, not game-ready audio. **No gate claim, no production-quality claim, no NET-GATE implication.** NET-GATE `--assert-ready` remains a parent-owned fact and was not touched.

Only the two audited tools were used: `JSFXR` and `KOKORO`. No FLUX, no InstantMesh, no TripoSR, no unaudited model or mirror was fetched for this task. No token, credential or `Authorization` header was used (anonymous HF only). No binary is in git: all WAVs and weights live under `/content/ai`.

## 1. jsfxr SFX pack

### Tool provenance (evidence 01–04)
- `npm view jsfxr` → `jsfxr@1.4.1`, `homepage https://github.com/chr15m/jsfxr`, `EXIT=0` (`01`).
- `npm view @chr15m/jsfxr` → npm `E404`, `EXIT=1` (`02`): the scoped name does not exist; the unscoped package is the one whose repository is the audited `chr15m/jsfxr`.
- `npm install jsfxr@1.4.1` outside git at `/content/ai/audio-node`, `EXIT=0` (`03`).
- The installed `UNLICENSE` git blob SHA (sha1 of `blob <len>\0` + content) = **`6d9eabbb7579f19b207be0e7ed52548ffdb32c90`**, identical to the audit revision; `EXIT=0` (`04`).
- Honest discrepancy: npm metadata labels the package `Proprietary`, while the actual shipped licence file is the Unlicense. The recomputed git blob pin decides — the audited Unlicense text is what was used. The brief's phrase "public domain, use anytime" is shorthand: the literal text is *"free and unencumbered software released into the public domain"*, commercial and non-commercial use by any means (`04`).

### Determinism method
jsfxr fills a 32-entry noise buffer with `Math.random()` inside `SoundEffect.getRawBuffer()`. `tools/asset-pipeline/sfx.mjs` therefore replaces `Math.random` with a seeded **mulberry32** PRNG per file and restores it afterwards — no unseeded `Math.random`. Parameter objects are literal constants captured from jsfxr's own preset generators under fixed seed `0x5EED1234` (pickupCoin / hitHurt / click / powerUp), so no synthesis was hand-rolled.

### Measured artifacts (evidence 05, 06, 17)
Render command `node tools/asset-pipeline/sfx.mjs` → `EXIT=0` (`05`): exact params, `prompt_hash` and WAV facts printed per file. External rerun to `/content/ai/audio-sfx-rerun` + `cmp` → `EXIT=0`, all four **byte-identical**, pack wall **0.435 s** (`06`). Independent `sha256sum`/`file(1)`/`soundfile` check → `EXIT=0` (`17`).

| file | jsfxr preset | seed | sha256 | bytes | samples | duration_ms | prompt_hash (sha256 of params JSON) |
|---|---|---|---|---|---|---|---|
| `swing.wav` | pickupCoin (coin/sword-like) | 101 | `c8dd06d9ba08aa2ee7e6c59b290735f956816cb7118b3347d6d303ff131f229a` | 8 420 | 4 188 | 94.966 | `f240172988a3b24929ce40850f8192ec70f5a851dadcd1880273b58031191d6a` |
| `impact.wav` | hitHurt (hit) | 202 | `663a4f934a04a48c550035b03718dc36db6889aac207d9442afcb74d51766c83` | 4 144 | 2 050 | 46.485 | `b243f2bc5f2e7e19877bce47fcc310452d117448ad146e20b2772765268c71a8` |
| `step.wav` | click (footstep) | 303 | `05b45ccdb127da266e264f0452f76d50f559c272f1162434f1e21f681ccbf6d7` | 27 606 | 13 781 | 312.494 | `75c9dccf0944e6ce59fce0db985dcdae4f3d8e6882e5bfc009194fa0f55bbc62` |
| `ui-confirm.wav` | powerUp (ding) | 404 | `c8eca72426ae032ffc11587a85249e7641054d6102b8c6bcd45cf042f39a359e` | 29 084 | 14 520 | 329.252 | `53adbce1411514dec31eec2fbb19eedb9abd260a884b3df40df2495af2c73ee6` |

All four: `RIFF/WAVE`, Microsoft **PCM 16-bit**, **mono**, **44 100 Hz** (`17`). Memory was not measured (irrelevant for this pack). Manifests: `tools/asset-pipeline/manifests/ai-001-sfx-{swing,impact,step,ui-confirm}.json`.

## 2. Kokoro-82M intro sting

### Model provenance (evidence 07–09)
- Anonymous HF API `GET https://huggingface.co/api/models/hexgrad/Kokoro-82M` → `id=hexgrad/Kokoro-82M`, `sha=f3ff3571791e39611d31c381e3a41a3af07b4987`, `private=False`, `gated=False`, `tags license:apache-2.0`; `EXIT=0` (`07`). This `sha` is byte-for-byte the audit revision. **Snapshot sha: COMPUTABLE** (= audit pin).
- `hf download hexgrad/Kokoro-82M --local-dir /content/ai/models/kokoro-82m`, anonymous, `EXIT=0`, wall 8 s (`08`). No token was set or printed.
- `kokoro-v1_0.pth`: 327 212 226 B, sha256 **`496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4`** — exactly the model card's published Model SHA256 (`09`). That is the snapshot weight pin; no separate git commit sha beyond the HF API `sha` above is claimed.

### Official requirements and install (evidence 11–15)
Model card usage (`https://huggingface.co/hexgrad/Kokoro-82M/raw/main/README.md`, read via WebFetch, cited here) states `pip install kokoro>=0.9.2 soundfile`, `KPipeline(lang_code='a')`, `voice='af_heart'`, `sf.write(..., 24000)`.
- `uv venv /content/ai/venv-audio --system-site-packages` → `EXIT=0` (`10`).
- `uv pip install 'kokoro>=0.9.2' soundfile` → resolved **kokoro 0.9.4**, misaki 0.9.4, espeakng-loader 0.2.4; `EXIT=0` (`11`).
- Pinned into the venv with `kokoro==0.9.4` → `EXIT=0` (`12`).
- Real defect found and recorded: kokoro's dependency resolution pulled `torch 2.15.0+cu132` into the venv while the system `torchaudio 2.11.0+cu130` is built for CUDA 13.0 → import `RuntimeError` (`13`, `14`, no cu132 torchaudio 2.11.0 wheel exists, `EXIT=1`). Resolution: removed the venv's torch/torchaudio/transformers/tokenizers/numpy/safetensors copies so the venv uses the **mutually compatible system stack** (`torch 2.14.1+cu130`, `torchaudio 2.11.0+cu130`, `transformers 5.22.1`); `EXIT=0` and `IMPORTS_OK` (`15`). No acceptance was softened and no stubs were used.

### Rendered line (evidence 16–17)
`tools/asset-pipeline/kokoro_intro.py` reads config, weights and the voice tensor from the local download — **no network at inference**. Seeds fixed (`torch.manual_seed(0)`, `np.random.seed(0)`), device CPU, `EXIT=0` (`16`).

| field | value |
|---|---|
| text | `Strata — une aventure en devenir.` |
| text sha256 | `5781d2ca04ad7b9e605a27a9b0423434db652c5119f0fd9e546929b0f5369349` |
| voice | `af_heart` (documented default of the model card), `lang_code='a'` |
| voice sha256 | `0ab5709b8ffab19bfd849cd11d98f75b60af7733253ad0d67b12382a102cb4ff` |
| output | `/content/ai/audio-intro.wav` |
| sha256 | `009ac1016dc0b5177bab0eb7c85620ac5172a0a8c3352b67f80cb16a7fb6a865` |
| bytes / frames | 123 644 / 61 800 |
| sample rate | 24 000 Hz (`PCM_16`, mono) |
| duration | 2 575.000 ms |
| wall time | 15.013 s (model load + G2P + inference + write) |

Independent verification → `EXIT=0` (`17`): `RIFF/WAVE`, `Microsoft PCM, 16 bit, mono 24000 Hz`.

Honest caveat: the line is **French**, but the task required the model card's default voice, so `lang_code='a'` with `af_heart` was used. The English G2P produced phonemes `stɹˈATə — jˈun ævˈɛnʧəɹ ˈɛn dɪvˈɛnɪɹ.` — audible accent/mispronunciation is expected. A French voice (`ff_*`, `lang_code='f'`) would be a later, separately-authored localization decision, not this smoke pack. This artifact is **not production TTS**.

Manifest: `tools/asset-pipeline/manifests/ai-001-kokoro-intro.json`.

## Repo hygiene / acceptance
- `node scripts/validate-manifest.mjs --audit` → `RESULT: PASS — 9 approved, 0 blocked, 11 rejected, 0 error(s)`, `EXIT=0` (`18`); all 5 new manifests `json.tool`-valid (`18`).
- No binary in git: WAVs and model weights stay under `/content/ai`.
- No gate file, SESSION, LOCKS or metrics file edited; no validator weakened; no push (parent owns pushes).
- Commit trailers: `Agent: asset-pipeline`, `Task: AI-001`.
