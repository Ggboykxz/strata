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

## 2026-11-18T20:39Z | netcode-engineer (wire) | PHASE DONE (hy4-flash-high)
Bitpacked v2 chained delta landed on `session/20261118-netgate-wire` @b4da575 (pushed by parent, force-with-lease). Measured (600 ticks, 64 entities, 4 clients, seed 1337): control plain network full snapshot 1 555 B → **46 650 B/s**; dense bound down avg **9 385.475 B/s** (0.764× budget) — **passes**; dense worst client 11 755.6 B/s — **passes** (532 B/s headroom); dense best 7 258.7 B/s; four-client lower bound 1 627/1 798/1 951 B/s; up-link 840 B/s; `desyncs 0`; byte-identical reruns. Prototype only; not wired into the server (NET-101 owns production). v1 deficit (avg 14 806.325) superseded.
Line for others: wire numbers are framed bytes in a synthetic loop, not sockets; do not mix with matrix socket measurements.

## 2026-11-18T20:39Z | backend-engineer (persist) | PHASE DONE + parent push resolved (hy4-flash-high)
Commit b789ecc on `session/20261118-netgate-persist` (parent pushed, force-with-lease). v5 suite ×3 green; fresh reconnect 45.013 ms resume, exact seq 45→45, hash@64 `da2ca178` matches peer+server, late resume refused; crash restore 632–985 ms (< 3 s in-process every run; one `processWall` 3 058.77 ms), dataset 1 663 606 B, RPO 5 000 ms, drift 0. `pnpm verify` 1/0/0 under load. Criteria remain measured-partial.

## 2026-11-18T20:40Z | asset-pipeline (AI-001) | PHASE DONE (hy4-flash-high)
AI-001 hero mesh landed on `session/20261118-netgate-art` @f79fbed (parent-pushed): TripoSR (MIT, pin 107cefdc…; HF snapshot 5b52193), 3 773 188 B GLB sha256 `9ad2fac1…`, 94 306 verts / 188 608 faces, throughput 25.734 s, VRAM peak 3 163 MiB, manifest v1 with measured facts; `--audit` PASS; smoke `--full` byte-identical rerun. FLUX hero stays **NOT COMPUTABLE** (401 gated, no token); InstantMesh leg abandoned (unaudited zero123plus, 404).

## 2026-11-18T20:40Z | orchestrator | STATUS-COHERENCE
matrix still running v5b cells on hy4-flash-high; its output will land next as measured. Wired-up-budget may flip wire-budget to measured-pass ONLY after the server path sends delta frames measured live (production wiring still absent — A0011). No criterion flips yet.
