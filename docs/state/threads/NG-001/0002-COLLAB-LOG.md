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

## 2026-11-18T20:29Z | backend-engineer (worktree /tmp/strata-persist) | PHASE-START (v5 rebase + rerun)
Read before work: 0001-COLLAB.md §1–§6 (v5 protocol facts, ownership, mandatory discussion) and the newest 0002 on origin/session/20261118-netgate-core (bb969b8, entries through 20:22Z status correction). Rebase done clean: local branch replayed 5f52330 + db7f7da onto bb969b8; no conflicts, no shared files edited.
About to run: `pnpm install --frozen-lockfile`, `pnpm vitest run apps/server/test/netgate/` (3× stability), `pnpm test`, `pnpm verify` (quiet CPU only; every EXIT= recorded in a new evidence dir), then update NET_GATE_PERSIST.md with fresh v5 one-liners and drift vs 32.83 ms / 319.08 ms / 1 663 606 B.
Need from: matrix — confirm v5 targetTick harness is the only source of four-client desync numbers; persist stays partial until the parent integrates.
Addressed to ALL: persist is re-measuring on the v5 integration tip now; do not cite my pre-v3 numbers as current (they stay in the report as historical only).

## 2026-11-18T20:36Z | backend-engineer (worktree /tmp/strata-persist) | PHASE-DONE (v5 rebase + rerun)
Read: 0001-COLLAB.md §1–§6 and newest 0002 on origin/session/20261118-netgate-core (bb969b8, including the 20:17Z OPEN/HANDOFF, 20:19Z persist done, 20:22Z status correction). Rebased clean onto bb969b8 (two local commits replayed, no conflicts); no shared files edited.
Commands + exits (all logs in `docs/state/evidence/20261118T203007Z-NETGATE-PERSIST/`, EXIT= as last line): `pnpm install --frozen-lockfile` 0; `pnpm vitest run apps/server/test/netgate/ --reporter=verbose` ×3 → 0,0,0; `pnpm test` 0 (45 files / 330 tests); `pnpm typecheck` 0; `pnpm verify` → **1,0,0** (first red = reconnect test 30 s timeout under concurrent matrix soak; retries green 19/19). No acceptance was softened.
Fresh v5 numbers (last suite run): reconnect entityId 2, appliedSeqAtDisconnect 45 == onResume 45, resumeLatencyMs 45.013, hashAtCommonTick tick64 `da2ca178` matches peer+server, desyncEvents 0. Crash SIGKILL: restoreMs 985.219 ms, processWallMs 2227.41 ms, dataset 1 663 606 B (600 intents / 10 150 ledger tx), restored tick150 hash `0e8bf73f` seq150, drift 0, published RPO 5000 ms; across the 3 runs one processWall was 3058.768 ms (>3 s strict end-to-end) — recorded, in-process restore assertion passed each time. Latency drift 32.83→45.013 ms and restore drift 319.08→985.219 ms are CPU-load effects, not harness changes.
Report updated: `docs/qa/prototypes/NET_GATE_PERSIST.md` §2a carries verbatim v5 one-liners, drift, v3 historical numbers retained, join-timeout and 54-vs-55 race explanations; criteria remain measured-partial.
Reply to 20:17Z OPEN: persist needs nothing from matrix for its own criterion; I confirm my harness sends v5 `targetTick` and compares the room audit hash (viewHash A0010 is per-client, not claimed here). Question to parent: does measured-partial reconnect require a per-client viewHash assertion before it can be upgraded, or is peer+server audit-hash equality sufficient?
Blocker: only the loaded CPU (matrix soak) and the OpenCode usage cap; commit + push follow this entry.

## 2026-11-18T20:39Z | backend-engineer (worktree /tmp/strata-persist) | PUSH-BLOCKED
Commit d444b6f is local and green. `git push origin session/20261118-netgate-persist` failed EXIT 128: `could not read Username for 'https://github.com'`. No token or credential was used or printed (0001 §6 / I7). Parent owns the push: integrate d444b6f (rebased on bb969b8) with your credentials, or supply an authenticated remote without exposing a secret. Stop point: all measurements, report and evidence committed; only the remote push remains.

## 20261118T2030Z | netcode-engineer (worktree /tmp/strata-wire) | PHASE-START (v2 rebase + acceptance)
Read before work: 0001-COLLAB.md §3/§6 and the full 0002-COLLAB-LOG.md from origin/session/20261118-netgate-core via git show (the files were not yet in this worktree until the rebase).
Did: committed the parent-authored v2 bit-packed chaining rewrite of packages/protocol/src/delta.ts + its tests + tools/netgate/wire (85b1596, rebased to d77efb6), then `git fetch origin && git rebase origin/session/20261118-netgate-core` → EXIT=0, clean, onto bb969b8. Integration protocol is v5 (INTENT_BYTES 15, snapshot header 19), so the wire control will be re-measured, not assumed from v1.
Blocker: none yet; tests not run at this point.
To ALL: answering orchestrator OPEN — wire does not need matrix data; the v2 dense-vs-budget answer follows in this file after the acceptance run. Persist: noted your v5 reconnect/crash numbers; no dependency on wire.

## 20261118T2034Z | netcode-engineer (worktree /tmp/strata-wire) | PHASE-DONE (v2 acceptance green)
Read: own PHASE-START above; no other agent's file edited.
Did: first v2 acceptance (evidence `docs/state/evidence/20261118T203045Z-NETGATE-WIRE/`) EXIT install 0 / tests 1 / typecheck 0. Real defect found: the parent's "6 B" packed entry wrote id u16 + dx/dz i8 + vx/vz i8 + seqDelta u8 = 7 B, overrunning the DataView. Fixed honestly in delta.ts only: vpack is now one byte of two 4-bit velocity steps (0 = 0, 1 = +50, 0xF = -50 mm/tick), low nibble vx / high nibble vz, with unknown nibbles refused and non-step velocities sent as the 22 B absolute fallback. Control expectations moved to the rebased v5 protocol: 1 555 B snapshot -> 46 650 B/s down, 15 B intents + 13 B ack -> 840 B/s up. Re-run: 30/30 tests green. Measured dense v2 down: best 7 258.7 / average 9 385.475 / worst 11 755.6 B/s — all under 12 288. Four-client: 1 627 / 1 798.475 / 1 951.4 B/s. Up 840 B/s both. Final evidence dir follows.
Blocker: none.
To ALL: answering persist's question — persist does not depend on wire; wire v2 down bound now passes locally. Matrix: v2 byte figures are local only; your RTT/loss matrix remains the gate evidence, not this harness.

## 20261118T2036Z | netcode-engineer (worktree /tmp/strata-wire) | PHASE-START (docs + integration)
Read: own PHASE-DONE above and the final v2 JSON report in `docs/state/evidence/20261118T203438Z-NETGATE-WIRE/04-measurement-report.log`.
Did: rewrote docs/qa/prototypes/NET_GATE_WIRE.md with the measured v2 layout (21 B header, 6 B nibble-packed entry, 22 B absolute fallback), both bounds, the plain statement that dense average PASSES 12 288 B/s at 9 385.475 B/s, and the v1 miss retained as the superseded baseline. No gate claim: local bytes only. No 16 m sensitivity run because 32 m passed both bounds.
Blocker: none; commit and push are the remaining actions.
To ALL: parent — wire is ready to merge; please do not restate v1's 1.205× miss as current. Matrix — the dense worst is 11 755.6 B/s with 532.4 B/s headroom; sustained loss re-anchors via keyframes, so your matrix remains the real loss evidence.

## 20261118T2036Z | netcode-engineer (worktree /tmp/strata-wire) | PHASE-DONE / BLOCKED (push)
Read: own PHASE-START above; git status and remote auth state.
Did: committed green integration at 0976d51 (trailers Agent: netcode-engineer / Task: GATE:NET) after the rebased parent commit d77efb6. Acceptance final: install 0 / vitest 30-of-30 0 / typecheck 0 / verbose report 0 / tool typecheck 0. Attempted `git push --force-with-lease origin session/20261118-netgate-wire` → **EXIT=128**: `could not read Username for https://github.com`. No credential helper, no GITHUB_TOKEN in env, gh not logged in. Per directive no token is used or printed. Log: `docs/state/evidence/20261118T203438Z-NETGATE-WIRE/06-push-blocked.log`.
Blocker: **PUSH BLOCKED — parent must push the branch** (or supply an env-injected credential to the orchestrator, never to an agent command line). Local branch contains all v2 work; nothing was force-pushed.
To ALL: parent — please push session/20261118-netgate-wire from /tmp/strata-wire with force-with-lease; local head 0976d51, origin still 8f03cce. Matrix/persist — no dependency on this push for your own branches.
