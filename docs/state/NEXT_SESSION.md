# NEXT SESSION

| field | value |
|---|---|
| written | 2026-11-18T20:32Z |
| branch | `session/20261118-hc-001-high-concept` — **PR #1** (draft), **PR #2** dashboard truth repair |
| open integration PR | **PR #17** — `session/20261118-netgate-core` → session branch (Director approves; fast-forward) |
| mode | RESUME |
| tier | current `S0`, authorized **`S1`** |
| last task | **NET-GATE re-measurement session** — v4 hash per client (A0010), v5 target-tick contract (NET-GATE work), collaboration protocol, AI-001 under A0012 |
| next task | **NET-GATE closure + integration of PR #17** (Director merge), then P2-SYS |
| blocker | **No agent-selectable task:** everything actionable is either measured in-flight or pending Director approval (PRs #4/#5/#17, PR approvals, HF token for FLUX) |

---

## 0b. GPU handoff (read first on the new runtime)

The T4 exists and works. `docs/state/GPU_HANDOFF.md` remains the hardware bridge; **ND-012 is resolved as hardware availability** (T4, 15 360 MiB, CUDA 13.0 verified).

**Art is still not unblocked by hardware.** I2 remains in force except for the single, explicitly granted AI-001 bypass:

- **A0012 (verbatim Director, 2026-11-18)**: "bypass et fais en sorte que l'art passe a tout pris on doit gagnier du temps" + "tu vas fix tout ce qui bloque". AI-001 smoke only; outputs are smoke-quality, with full provenance manifests. No gate passes by this.
- **FLUX.1-schnell stays NOT COMPUTABLE** (HF license gate, HTTP 401; no HF token supplied with the license accepted). Any hero 2D waits for Director credentials. `ND-004/005` rotation still comes first.
- InstantMesh was infeasible: its pipeline hard-requires `sudo-ai/zero123plus-v1.2` — unaudited, anonymous access HTTP 404. **TripoSR (MIT) is the executed path**; results land in `docs/qa/AI_THROUGHPUT.md` on branch `session/20261118-netgate-art` (report pending at this writing).
- A0006 stands: NET-GATE `--assert-ready` is exit 1 until the eight criteria are measured.

## 0. Long-term quality doctrine (A0008, Director)

Unchanged. Server truth before visuals; evidence over adjectives; audited stack; vertical slice before scale. Current order still: P2-SYS → GATE:P2 → P3-ART.

## 1. State at hand-off (2026-11-18T20:32Z)

`pnpm verify` **19/19 enabled steps green** · NET-GATE integrity **PASS**, readiness **exit 1** · 2 of 10 criteria met at signature, re-measurement in flight.

Branch map (all pushed):

| branch | contents | status |
|---|---|---|
| `session/20261118-netgate-core` | v4 (A0010), v5, docs/ADRs, collaboration contract (required/0002 log), gate doc appendix | merged clean; rides PR #17 |
| `session/20261118-net-target-tick` | v5 input contract (a1e5961) — merged into netgate-core | merged |
| `session/20261118-netgate-matrix` | 4-client real-socket harness + v5 adaptation; measurement in progress | pending measurement |
| `session/20261118-netgate-persist` | reconnect (32.83 ms exact) + crash/RPO (319.08 ms, RPO 5 000 ms) v5 numbers | committed |
| `session/20261118-netgate-wire` | AoI+delta measurement; **chained bitpacked v2 codec (6 B entries) rewritten, tests pending** | pending verification |
| `session/20261118-netgate-security` | HMAC/TLS/flood prototype (aa16667) | committed; rebase onto v5 pending |
| `session/20261118-netgate-art` | AI readiness dossier + A0012; TripoSR in flight | pending report |
| `session/20261118-net-101-plan` | A0011 + wire plan (Director-pre-authorized NET-101 override; not implemented) | committed |

Criteria (2026-11-18T20:32Z): four-client-matrix = in rerun; soak-30min = in run; desync-correction = in rerun; server-tick-p95 = in rerun; wire-budget = **failing** (46 650 B/s); reconnect-restore = measured-partial; crash-restore-rpo = measured-partial; threat-and-anticheat = measured-partial; authoritative-server + ledger-fuzz = met.

## 2. Art handoff — what changed, what did not

Changed: GPU exists; tier probes green; T4 genuinely available; AI-001 bypass under A0012; A0011 unblocks NET-101 order-of-execution when Director re-decides.

Not changed: no art is scheduled; no art is production; nothing in `assets/` is new; NET-GATE's signature-time verdict is untouched; `validate-netgate --assert-ready` exit 1 remains the only truthful readiness signal; PR approvals belong to the Director.

## 3. What the Director must do

1. **PR approvals**: #17 (integration), #4/#5 (pre-existing). No agent may merge its own PR.
2. **FLUX.1-schnell**: provide an HF token with the license accepted, or formally accept "hero 2D: NOT COMPUTABLE for this session".
3. **ND-004/005** token rotation — still standing from before this session.
4. If the 8 re-measured criteria pass, either re-affirm the risk-accepted signature or revoke it — Director's call, never an agent's.

## 4. Immediate verification commands at next resume

```bash
pnpm install --frozen-lockfile && pnpm verify
node scripts/validate-netgate.mjs                 # integrity (must pass)
node scripts/validate-netgate.mjs --assert-ready   # readiness (expect 1 until measured green)
cat docs/state/threads/NG-001/0002-COLLAB-LOG.md   # agent handoffs and stops
tail docs/state/metrics/20261118-netgate-matrix.json
```
