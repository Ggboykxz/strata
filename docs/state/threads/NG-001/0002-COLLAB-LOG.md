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

## 2026-11-18T20:19Z | backend-engineer (worktree /tmp/strata-persist) | PHASE-DONE
Read: 0001/0002. Done: repaired v5 harness (welcome-event join, intents carry targetTick, buffer drained before seq sample), suite green 3/3 on v5, fresh run full: reconnect 32.83 ms exact seq 44→44 hash 374b6a91@64; crash SIGKILL restore 319.08 ms, dataset 1 663 606 B, RPO 5000 ms, drift 0; report rewritten with v5 numbers (v3 kept as historical); commit pushed.
Need from: matrix — confirm the harness under v5 sends targetTick (your pre-fix baseline of 7000+ desyncs is a broken pipeline, not a v5 result).
Need from: wire — after bitpacking, whether dense bound still misses; persist criterion partial either way.
Blocker: none. verify on quiet CPU pending.

## 2026-11-18T20:19Z | orchestrator | PUSH-NOTE
`git push --force-with-lease` on session/20261118-netgate-persist was required after the parent rebased the branch onto netgate-core (074db10 → 88bfcd9 → 8b3a5cb). No one else consumes this session's prototype branch; lease protected it in case origin had moved. Recorded, not hidden.

## 2026-11-18T20:22Z | orchestrator | STATUS-CORRECTION
All agent relaunches via the subagent tool are dying on the OpenCode free-usage cap ("Free usage limit reached", instant, confirmed 4× today). No agent is running right now. The parent executes centrally; anything an agent owns does not regress, just moves slower.

Executing centrally now:
- matrix v5 rerun launched in background on commit 49ded86: 24 cells (15 s), control (60 s), soak (1800 s @ 300 ms/5%/30 ms), seed 20261118, world seed 1337. Evidence in `docs/state/evidence/<UTC>-NETGATE-MATRIX-V5/`. Prior 24-cell run was a broken-pipeline baseline (harness pre-`targetTick`), kept as baseline only.
- persist: done and pushed (8b3a5cb): fresh v5 reconnect 32.83 ms exact seq, crash restore 319.08 ms, RPO 5000 ms, suite 3/3.
- wire: parent-implemented bitpacking next (agents blocked).
- AI-001: agent died mid-install (nvdiffrast abandoned per directive); parent completes the TripoSR path.

Ask to Director: the subagent cap is a hard block; for parallel teams to keep working, a provider/plan with execution quota (or a model the cap allows) is required. Until then one session executes.

## 2026-11-18T20:19Z | asset-pipeline (AI-001) | ACK + BEFORE PHASE A
Read: 0001 §3/§6 and 0002 through origin/session/20261118-netgate-core baab942 (incl. PUSH-NOTE). Worktree /tmp/strata-art, branch session/20261118-netgate-art. GPU idle (0 MiB, 0 %).
Acknowledged binding correction: nvdiffrast / moderngl / xatlas / InstantMesh / sudo-ai/zero123plus-* must NOT be used or downloaded further. InstantMesh is BLOCKED (unaudited zero123plus; anonymous HEAD on the UNet returns HTTP 404). Audited path is TripoSR only (MIT, pin 107cefdc244c39106fa830359024f6a2f1c78871, already cloned at /content/ai/graph/TripoSR).
Note for the record: my nvdiffrast build had already COMPLETED and INSTALLED (nvdiffrast==0.4.0 from git @253ac4fc, EXIT=0, evidence 15/16) before the correction arrived — it was not compiled against or used. Abandoning it now: /content/ai/venv-mesh will be removed entirely; no nvdiffrast artifact will be used, imported or shipped. InstantMesh weights already fetched earlier under A0012 (base 1 253 574 354 B sha256 22701cd2…, large 1 514 818 077 B sha256 329f7aae…, evidence 08/09) remain unused and will not be downloaded further; no zero123plus, no FLUX (401), no rembg model (u2net unaudited → --no-remove-bg).
Plan this phase: remove venv-mesh (abandon nvdiffrast), create /content/ai/venv-trisr (py3.13.16), install minimal TripoSR deps with logged exit codes, then weights → one inference → GLB → manifest → AI_THROUGHPUT.md → commit → push.
Line for the others: matrix/wire — AI-001 makes no gate claim and touches no netgate file; if any of you needs the measured T4 VRAM envelope for sizing, ask here and I will answer from the evidence logs, not from memory.

## 2026-11-18T20:31Z | asset-pipeline (AI-001) | RE-LAUNCH / BEFORE WEIGHTS PHASE
Read again (mandatory §6): 0001 §6 and 0002 at origin/session/20261118-netgate-core bb969b8, plus the parent's relaunch directive. Worktree /tmp/strata-art, branch session/20261118-netgate-art. Carried forward my 20:19Z ACK entry above (drafted in this worktree before the parent's central-status entry); did not edit any other agent's entry.
State found: parent-central logs 21..24 in evidence/20261118T202814Z-TRIPOSR-RUN (gen_input_white EXIT 0, shims written, `uv venv --system-site-packages` EXIT 2 because my venv already exists, `transformers==4.35.0` EXIT 1: tokenizers==0.14.1 sdist unparseable on py3.13). My earlier work (logs 01..30 in evidence/20261118T200329Z-AI-001) installed and then ABANDONED nvdiffrast per directive: venv-mesh was deleted (17-nvdiffrast-abandon.log), no nvdiffrast artifact is used.
Resolution found and measured: transformers==4.36.2 + tokenizers==0.15.2 have cp313 wheels and import cleanly (`from transformers.models.vit.modeling_vit import ViTModel` verified by the real TripoSR code path); kept exact versions for the report. venv-trisr is kept as-is (torch 2.15.0+cu132, CUDA True). Shims /content/ai/shim/{rembg,torchmcubes}.py exist and will be first on PYTHONPATH; rembg model is never fetched (--no-remove-bg).
Next phase: weights `hf download stabilityai/TripoSR` (anonymous 302 verified) → sha256 → ONE inference with VRAM polling → GLB → manifest → AI_THROUGHPUT.md → commit → push. No InstantMesh, Zero123++, FLUX, git-lfs or gate-file edits.
Line for the parent/orchestrator: transformers==4.35.0 is un-installable on this py3.13 runtime (tokenizers sdist EXIT 1); I am using 4.36.2 + tokenizers 0.15.2, both cp313 wheels, with the real ViT encoder (no stub) — please do not re-attempt 4.35.0 centrally.

## 2026-11-18T20:34Z | asset-pipeline (AI-001) | WEIGHTS DONE / BEFORE INFERENCE
Read: 0001 §6, 0002 at bb969b8 (re-read this phase). Worktree /tmp/strata-art.
Done this phase (all EXIT= lines in evidence/20261118T202814Z-TRIPOSR-RUN): 25-env-shims EXIT 0 — venv-trisr kept, real `transformers.models.vit.modeling_vit.ViTModel` confirmed, both shims first on PYTHONPATH, gen_input_white.py sha256 3037084e…, white input sha256 effe6dbe… (256×256 RGB, corner pixel 216,216,216); 26-hf-api-model-info EXIT 2 (hf 1.33.0 has no such subcommand) and 27-hf-api-sha EXIT 0 — HF snapshot sha 5b521936b01fbe1890f6f9baed0254ab6351c04a, private False, gated False, tags license:mit; 29-download-triposr-weights EXIT 0; 30-triposr-weights-sha256 EXIT 0 — model.ckpt 1 677 246 742 B sha256 429e2c6b…, config.yaml 987 B sha256 74ca708c…. No git-lfs, no token, no FLUX, no unaudited model fetched.
Blocker: none for inference. transformers 4.35.0 remains un-installable on py3.13 (tokenizers 0.14.1 sdist); using 4.36.2 + tokenizers 0.15.2 with the REAL ViT encoder — no stub, no faked encoder.
Next: ONE inference with --no-remove-bg and VRAM poll, then GLB stats, manifest, throughput doc, commit, push.
Line for the parent: TripoSR weights are MIT-labelled and un-gated; manifest will carry the measured HF snapshot sha above plus local sha256/bytes — no invented revision.

## 2026-11-18T20:37Z | asset-pipeline (AI-001) | INFERENCE + DELIVERABLES DONE
Read: 0001 §6, 0002 at bb969b8 (re-read before this phase). Worktree /tmp/strata-art. GPU idle after every run (0 MiB).
Commands + exits (all in docs/state/evidence/20261118T202814Z-TRIPOSR-RUN, `EXIT=` last line): 31 inference attempt 1 EXIT 1 at `import xatlas` (5.257 s, no GPU work); 32 refusal shims xatlas/moderngl EXIT 0; 33 attempt 2 EXIT 1 after successful compute (32.418 s, peak 3163 MiB) — upstream run.py bug: `--no-remove-bg` never creates output/0; 34 mkdir EXIT 0; **35 final inference EXIT 0 — wall 25.734 s**; 37 peak VRAM **3163 MiB** (102 samples @250 ms), GPU free after; 39 mesh **94 306 vertices / 188 608 faces / 3 773 188 B**, GLB sha256 9ad2fac1…, 0 animation tracks; 40 HEAD probes EXIT 0 — FLUX 401, InstantMesh ckpt 302, TripoSR ckpt 302; 41 json.tool EXIT 0; 42 validate-manifest --audit EXIT 0; 43 plain validator EXIT 64 (by design); 44 smoke default EXIT 1 (path bug), 45 fixed EXIT 0; 46 smoke --full EXIT 0 (21.292 s, 3163 MiB, **byte-identical GLB sha256**).
Deliverables written (text only): tools/asset-pipeline/smoke.py, tools/asset-pipeline/manifests/ai-001-hero-mesh-0001.json, docs/qa/AI_THROUGHPUT.md (full report incl. FLUX NOT COMPUTABLE, InstantMesh abandonment, defect list, EXIT summary), plus gen_input.py/gen_input_white.py/mesh requirements from earlier phases. Committing A0012 as instructed. No binary in repo; all binaries under /content/ai.
Line for ALL: AI-001 is measured and done; **no gate claim** — NET-GATE --assert-ready still exits 1 in the parent's records. FLUX hero image remains NOT COMPUTABLE (401 gated; no token). To the parent: if you need the T4 numbers, they are 25.734 s / 3163 MiB for one TripoSR GLB; no file under docs/state/metrics/** was edited.

## 2026-11-18T20:38Z | asset-pipeline (AI-001) | PHASE DONE
GLB generated: `/content/ai/output/0/mesh.glb` 3 773 188 B, sha256 `9ad2fac19c9f10b4c9fca17f8f2dbb7845283b65e02adc3c04734e707e0ee05d` (94 306 vertices, 188 608 faces). Throughput: 25.734 s wall, VRAM peak 3 163 MiB (102 samples), deterministic rerun 21.292 s byte-identical. Manifest v1 at tools/asset-pipeline/manifests/ai-001-hero-mesh-0001.json; `node scripts/validate-manifest.mjs --audit` PASS; smoke default + `--full` PASS; AI_THROUGHPUT.md written. FLUX stays NOT COMPUTABLE (401).

## 2026-11-18T20:39Z | asset-pipeline (AI-001) | DELIVERY NOTE (FINAL)
Read: 0001 §6 + 0002 at bb969b8 and the pushed head of this branch. Parent committed and pushed centrally as **f79fbed** `feat(A0012): AI-001 hero mesh smoke via audited TripoSR path` (Agent: asset-pipeline, Task: AI-001, 68 text files, 0 binaries); origin/session/20261118-netgate-art == f79fbed verified. This entry is the only local delta and is being committed/pushed as its own small docs commit.
Measured delivery: one TripoSR mesh, 94 306 vertices / 188 608 faces / 3 773 188 B, GLB sha256 9ad2fac19c9f10b4c9fca17f8f2dbb7845283b65e02adc3c04734e707e0ee05d, wall 25.734 s, peak 3163 MiB (250 ms poll), GPU free (0 MiB) after both the run and the `--full` reproduction. Acceptances: json.tool 0, validate-manifest --audit 0, plain validator 64 by design, smoke.py 0, smoke.py --full 0 (byte-identical GLB). Manifest/licence TRIPOSR revision 107cefdc244c39106fa830359024f6a2f1c78871; HF snapshot 5b521936b01fbe1890f6f9baed0254ab6351c04a.
**Hero image still NOT COMPUTABLE** — FLUX.1-schnell is HTTP 401 gated; no token was requested, obtained or used. InstantMesh/Zero123++ abandoned; nvdiffrast/xatlas/moderngl/rembg models unused (refusal shims only). No gate weakened, no gate file edited, no binary in git.
Line for ALL: AI-001 closes here with evidence, not assertions; the parent owns the integration/gate record.

## 2026-11-18T20:41Z | asset-pipeline (AI-001) | PUSH BLOCKED — PARENT ACTION
The final delivery-note commit was created locally, but `git push origin session/20261118-netgate-art` failed with EXIT 128: `fatal: could not read Username for 'https://github.com': No such device or address` (evidence 20261118T202814Z-TRIPOSR-RUN/47-push-attempt.log). No credential helper and `gh auth status` reports not logged in; no token was requested, printed or used (I7). origin/session/20261118-netgate-art remains at f79fbed (the parent's central commit, which already contains all AI-001 artifacts); the local commit with this entry must be pushed by the parent who owns the credentials. No gate work or repo-content change beyond this log.
