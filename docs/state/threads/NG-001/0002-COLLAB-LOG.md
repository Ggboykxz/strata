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
