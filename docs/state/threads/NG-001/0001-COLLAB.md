# NG-001 — collaboration contract (all NET-GATE workers)

| field | value |
|---|---|
| id | NG-001 |
| date | 2026-11-18 |
| owner | orchestrator (parent session) |
| rule | every agent fetches origin, rebases onto the integration branch, owns only its files |
| pushes | every finishing agent pushes its branch; the parent pushes the integration branch `session/20261118-netgate-core` |

## 1. Integration base and merge order

```
session/20261118-hc-001-high-concept (session, parent works here via netgate-core)
   └─ session/20261118-netgate-core  (integration branch — parent owns it)
        ├─ v4 viewHash (A0010) .................. merged 340d67b..b184b2c
        ├─ v5 target-tick (a1e5961, RTT contract) .. merged b8d13c7
        ├─ wire AoI/delta ........................ 8f03cce (tools only; awaits re-run on v5/parent rebase)
        └─ future: production AoI+delta (A0011) ... to be scheduled after the matrix is green
```

**Protocol facts of the integration branch (measured, v5):** `PROTOCOL_VERSION = 5`;
`INTENT_BYTES = 15` (type + entity u32 + seq u32 + **targetTick u32** + dx/dz i8); snapshot header 19 B
(`hash` audit-world + `viewHash` own-entity, A0010); a v1/v4 hello is refused; `validate-netgate.mjs`
integrity PASS, `--assert-ready` **exit 1** (8/10 criteria unmet). `pnpm test` green at 327 tests on the
v5 branch before the merge; full verify on the merged tip is **pending a quiet-CPU window** and must be
recorded, never asserted.

## 2. File ownership (agents do not touch each other's files)

| agent | worktree | allowed paths |
|---|---|---|
| matrix | `/tmp/strata-matrix` | `apps/server/test/netgate/matrix-*`, `docs/qa/prototypes/NET_GATE_MATRIX.md`, `docs/state/metrics/20261118-netgate-matrix.json`, `docs/state/evidence/*-NETGATE-MATRIX/**` |
| persist | `/tmp/strata-persist` | `apps/server/test/netgate/{crash,reconnect,support,…}`, `docs/qa/prototypes/NET_GATE_PERSIST.md`, evidence `*-NETGATE-PERSIST/**` |
| wire | `/tmp/strata-wire` | `packages/protocol/src/delta.ts`, `packages/protocol/test/delta.test.ts`, `tools/netgate/wire/**`, `docs/qa/prototypes/NET_GATE_WIRE.md`, evidence `*-NETGATE-WIRE/**` |
| AI-001 | `/tmp/strata-art` (+`/content/ai/**`) | `docs/adr/A0012*`, `tools/asset-pipeline/{gen_input.py,smoke.py,manifests/**}`, `docs/qa/AI_THROUGHPUT.md`, evidence `*-AI-001/**` |
| gate (done) | `/tmp/strata-gate` | `docs/adr/A0011*`, `docs/qa/prototypes/NET_GATE_WIRE_PLAN.md` |
| security (done) | `/tmp/strata-security` | `apps/server/test/netgate/{hmac,tls,flood,…}`, `docs/qa/prototypes/NET_GATE_SECURITY.md`, `docs/legal/THREAT_MODEL.md` (measured facts only) |

Shared files (`packages/protocol/src/binary.ts`, `room.ts`, `predictor.ts`, `GDD-NETCODE.md`, `AGENTS.md`,
`NET_GATE.md`, `scripts/validate-netgate.mjs`, metrics): **parent only**, at merge time.

## 3. Collaboration protocol (all agents)

1. `git fetch origin` before any work; `git rebase origin/session/20261118-netgate-core` if stale (or ask the parent to merge).
2. Never edit another owner's files; never revert or reformat them; never delete evidence dirs.
3. Contribute measurements, not assertions: every claim cites `EXIT=<n>` in an evidence log you wrote.
4. No validator/assert weakening; no gate claims until the parent integrates; no art except AI-001 under A0012.
5. No token, no secret, no credential ever printed or committed; never download an unaudited model;
   FLUX.1-schnell stays **NOT COMPUTABLE** until the Director supplies an HF token with the license accepted.
6. If the `Free usage limit reached` error hits again, commit what is green, note the exact stop point in
   your report; the parent relaunches you with the state you left.

## 4. Measured snapshot (as of b8d13c7)

| criterion / fact | value | source |
|---|---|---|
| wire dense all-moving bound | avg 14 806.325 B/s (1.205×), worst 18 656.1 B/s — **miss** | wire `NET_GATE_WIRE.md` |
| wire four-client idle-NPC bound | 2 041–2 508 B/s — pass (lower bound, not a gate claim) | same |
| wire up-link | 720 B/s (0.234×) — pass | same |
| reconnect-restore (v3) | same entity/hash/seq, 31–33 ms; late resume refused | persist `NET_GATE_PERSIST.md` |
| crash-restore-rpo | restore 229.7 ms < 3 s; dataset 1.66 MB; RPO 5 s published | same |
| threat-and-anticheat | flood 30 admitted / 170 rate-limited; TLS 1.3 measured; counter restart proves persistence | security report |
| 4-client matrix v4 | in progress on `/tmp/strata-matrix`; **v5 measurement pending rebase** | matrix |
| AI-001 | InstantMesh leg blocked (unaudited `sudo-ai/zero123plus-v1.2`, HTTP 404); **TripoSR leg is the path** | A0012 / audit |
| NET-GATE status | `SIGNED — RISK ACCEPTED`; 8/10 unmet in `NET_GATE.md`; `--assert-ready` exit 1 | dossier |

## 5. What each next step must carry

- matrix: rebase onto merged v5, re-run the 24 cells (RTT × loss × jitter), the 60 s control and the
  1800 s soak; recompute targeting D per cell (D = ⌈RTT/2 / 33.3⌉ + 2 ticks); zero-desync target is a
  **measured claim**, not an assumption.
- persist: rebase onto v5; rerun the room-hash assertions (v4/v5 `viewHash` semantics); 3 consecutive green runs;
  `pnpm verify` on quiet CPU.
- wire: bitpacking on the relative entry (≤ 6 B), re-run dense + four-client bounds; replace estimates by measurements.
- AI-001: TripoSR only; produce `docs/qa/AI_THROUGHPUT.md` + manifest; no FLUX until Director credentials.
- parent: integrate, regen metrics (`docs/state/metrics/20261118-s03.json`), `JOURNAL.md`, `SESSION.md`,
  `NET_GATE.md` honestly lit by exits; no READY claim without `--assert-ready` = 0.
