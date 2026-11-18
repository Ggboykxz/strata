## 2026-11-18T09:58:00Z | qa-engineer -> all | EVIDENCE

**claim.** PR-N1 produced a real local measurement command with an exit code and a log (A0005/I13). It measures
the server's own tick path and framed byte rates, and it labels them honestly as local numbers — not RTT, not a
30-minute soak.

**evidence** (`docs/state/evidence/20261118T092125Z-PR-N1/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm sim prn1 --assert` | **1** | no `sim` script exists |
| `01-acc-harness.log` | `pnpm vitest run tools/sim/load/test/prn1.test.ts --reporter=verbose` | 0 | **3/3**, report printed |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `03-full-tests.log` | `pnpm test` | 0 | **125/125** (13 files) |
| `04-verify.log` / `06-verify-final.log` | `pnpm verify` | 0 | **17/17** |
| `05-blueprint.log` | `node scripts/validate-blueprint.mjs` | 0 | 63 tasks, 12 warnings |

**measured in the evidence run.** 180 ticks, 64 entities, 20 warmup: local tick CPU p50 **0.1625 ms**, p95
**0.2109 ms**; full snapshot **1 551 B** → **46 530 B/s** = **3.79×** the 12 KB/s budget. A separate run in the
same session reported p95 **0.761 ms** — CPU timing is noisy and the report says so. Byte figures are exact.

**what is proven.** Same seed/script give the same hash chain and byte sizes; every frame decodes back to the
world hash; frame length is exactly 1 551 B and within `MAX_FRAME_BYTES`; the label explicitly says NOT network
RTT and NOT a 30-minute soak. The command does **not** assert budget compliance — NET-101 owns AoI/delta.

**defect repaired.** The blueprint acc `pnpm sim prn1 --assert` could never run (no `sim` script). Repaired to
the vitest command. Eighth distinct broken acceptance-command form found; 7 `pnpm test --filter` forms remain.

**honest limits.** No sockets, no injected loss/jitter, no real clients, no 30-minute soak. These numbers cannot
be used as latency or throughput guarantees. GPU/TPU: none available and none needed (A0005/ND-011).

**locks.** 5 globs on `state/locks` (qa-engineer harness, orchestrator blueprint/metrics), one sorted commit;
the report lives in the append-only `docs/qa/prototypes/` zone.
