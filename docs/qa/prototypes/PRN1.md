# PR-N1 — local load and framed-byte measurement

| field | value |
|---|---|
| date | 2026-11-18 |
| task | PR-N1 (A0005: the deferred measurement from NET-004) |
| evidence | `docs/state/evidence/20261118T092125Z-PR-N1/01-acc-harness.log` |
| command | `pnpm vitest run tools/sim/load/test/prn1.test.ts --reporter=verbose` |
| exit | 0 (3/3) |

## What was measured

The harness runs the **server's own code path** — `stepWorld` → `hashWorld` → `snapshotFromWorld` →
`encodeFrame` — for 180 ticks with 64 entities, discarding the first 20 warmup ticks, seeded at 1337 with an
integer intent script. Same seed and script give the same hash chain and frame sizes on every run.

| metric | value | meaning |
|---|---|---|
| tick CPU p50 | **0.1625 ms** | local simulation CPU, step + hash + encode |
| tick CPU p95 | **0.2109 ms** | local simulation CPU, after 20 warmup ticks |
| full snapshot frame | **1 551 bytes** | 15 B header + 64 × 24 B entity |
| framed byte rate | **46 530 B/s** | 1 551 × 30 Hz, full snapshots, no AoI/delta |
| budget | 12 288 B/s | master §6 down budget at 64 AoI entities |
| over budget | **3.79×** | unchanged from NET-002; NET-101 owns AoI/delta |

## What this is NOT

- **Not network RTT.** No sockets, no clients, no loss or jitter injection.
- **Not a 30-minute soak.** The blueprint names one; this is a 180-tick local harness. The soak is not performed.
- **Not a stable performance guarantee.** A second local run in the same session reported p95 **0.761 ms** on
  the same machine. CPU timing is noisy; the byte figures are exact, the timings are a local sanity check only.
- **Not a GPU/TPU result.** This runtime has neither (Director statement, ND-011/A0005).

## Assertions (structural, not tunable budgets)

The command exits 0 when the run is deterministic, every frame decodes back to the world hash, the frame is
exactly 1 551 bytes and within `MAX_FRAME_BYTES`, and the reported label says it is not network RTT. It does
**not** assert that 46 530 B/s meets the 12 KB/s budget — that would be false, and NET-101 owns the fix.

## Blueprint acc repair

`pnpm sim prn1 --assert` could not run: there is no `sim` script in `package.json`. The acc is now the vitest
command above. This is the eighth distinct broken acc form found in this project.
