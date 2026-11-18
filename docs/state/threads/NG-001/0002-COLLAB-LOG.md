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
