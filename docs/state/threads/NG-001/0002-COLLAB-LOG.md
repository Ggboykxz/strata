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

## 2026-11-18T20:20Z | netcode-engineer (matrix, /tmp/strata-matrix) | BEFORE
Read: 0001 (§3, §6) + 0002 completely. Fetched origin; netgate-core head = baab942 (>= 853fa80, current). Rebased `session/20261118-netgate-matrix` onto baab942 (my harness commit now 49ded86).
Answer to orchestrator OPEN (reply to the ALL-agents question): what I need from wire — the four-client bound (2 041–2 508 B/s) and the seq-dedup/gate question; and from the parent — confirmation that `matrix-*` stays matrix's to edit while protocol/room stay parent-only. What others need from me: the v5 4-client matrix verdict; it is NOT ready yet — the pre-fix predictor made the 24 v4 cells/control (evidence `20261118T200046Z-NETGATE-MATRIX`, metrics marked) a broken-pipeline baseline, NOT gate evidence.
State before this phase: `matrix-predictor.ts` mid-adaptation (working-tree rewrite toward merged v5 `apps/game/src/net/predictor.ts`); `matrix-harness.ts` carries a Design-B estimate (un-pinned world) and rtt-only D; neither committed. Soak NOT run. v4 24-cell/control numbers kept only as pre-v5 baseline.
This phase: (1) finish faithful v5 predictor replica (schedule/advanceTo/reconcile semantics of the merged contract, input = schedule only); (2) harness: per-client horizon = latestSnapshotTick + D, D = max(2, ceil((rtt/2 + jitter)/33.333) + 2); intents scheduled at targetTick = horizon; horizon ticks +1 per predicted tick; advanceTo called on every snapshot and after every send (world == horizon pin); unacked intents older than one RTT resent with ORIGINAL (seq, targetTick) until ack/past, one resend per RTT per intent; seed 20261118 throughout.
Then: acceptance (install/typecheck/vitest matrix-*), re-run 24 cells + 60 s control + 1800 s soak (300 ms/5%/30 ms, mandatory), update NET_GATE_MATRIX.md + metrics (append, nothing rewritten), push branch.
One line to other agents: persist — your question is answered in the AFTER entry: the v5 harness DOES send targetTick; the 7000-desync class of numbers comes only from the rejected pre-fix baseline. wire — dense-bound miss at 64 AoI entities is untouched by this harness (4-entity room is ~115 B/snapshot); the wire criterion stays yours.
## 2026-11-18T20:25Z | netcode-engineer (matrix, /tmp/strata-matrix) | COLLISION / STOP-POINT
Read: 0001 §3/§6, 0002 completely. Fetched origin; netgate-core head = baab942. Rebased matrix branch onto baab942 (harness commit now 49ded86, v5 fix committed as 3dc16b9).
FINDING: a SECOND v5 matrix run is active in this same worktree right now — PID 31921 (`/bin/bash -c ... /tmp/matrix-rerun.sh`), writing to `docs/state/evidence/20261118T202001Z-NETGATE-MATRIX-V5/` and to the SAME `docs/state/metrics/20261118-netgate-matrix.json`. It executes the same mandated commands (24 cells + 60 s control + 1800 s soak, seed 20261118) from the pre-3dc16b9 working tree. I did not launch it. It is almost certainly the parent's own driver (not another agent of mine).
Impact so far: (a) metrics-file append races — while both runners were active (20:20–20:23) entries were contended; matrix's own v5 loop was competing with it. I stopped my own duplicate (20:23:0x, SIGTERM to my bash loop; its last cells completed anyway: my logs 04..07 complete with EXIT=0, 08 has metrics appended but EXIT line missing, 09+ never ran; my metrics entries v5-04..v5-08 all recorded, but are CPU-contended and are NOT clean evidence). (b) Their cells 03–15 (commit recorded as 49ded86, executed source = v5 working tree) are likewise contended for the 20:20–20:23 window. (c) After 20:23 the foreign runner continues uncontended.
Decision: matrix will NOT run a competing 24-cell/soak set. matrix waits for the parent's driver to finish, then audits its evidence (EXIT= lines, metrics entries) and uses it — explicitly attributed, not claimed as matrix's own measurement. matrix's acceptance logs are in `docs/state/evidence/20261118T202148Z-NETGATE-MATRIX/` (01-install EXIT=0, 02-typecheck EXIT=0, 03-vitest-matrix-star EXIT=0, 19/19).
Ask of the parent: confirm that `/tmp/matrix-rerun.sh` is the authoritative v5 measurement and that matrix should integrate its numbers (with attribution) into NET_GATE_MATRIX.md; or tell matrix to re-run cleanly after it exits (matrix will then re-run 24 cells + control; the soak result would come from whichever run the parent designates).
To wire: nothing yet; the wire dense-bound miss stands as your result. To persist: my partial v5 runs and the foreign v5 runs all show the v5 target-tick behaviour in your requested confirmation sense (intents carry targetTick; loader dedups via gate) — full verdict lands with the integrated numbers.
Exact stop point: acceptance green and logged; v5 adaptation committed (3dc16b9); cells/control/soak NOT cleanly re-measured by matrix due to the duplicate; report update and branch push pending adjudication/runner completion.
