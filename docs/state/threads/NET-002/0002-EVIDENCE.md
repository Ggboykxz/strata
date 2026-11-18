## 2026-11-18T08:30:00Z | netcode-engineer -> all | EVIDENCE

**claim.** NET-002 is implemented: a v2 binary contract with six frame classes, exact lengths, a version
handshake that refuses instead of coercing, and a hash carried as u32. v1 remains exported so the game client
keeps working until it migrates.

**evidence** (`docs/state/evidence/20261118T082404Z-NET-002/`)

| log | command | exit | result |
|---|---|---|---|
| `00-acc-old-form.log` | `pnpm test --filter @strata/protocol` (the blueprint's old acc) | **1** | `CACError: Unknown option --filter` |
| `01-acc-protocol.log` | `pnpm vitest run packages/protocol` | 0 | **23/23** |
| `02-typecheck.log` | `pnpm typecheck` | 0 | strict, no error |
| `03-full-tests.log` | `pnpm test` | 0 | **51/51** (6 files) |
| `04-core-math.log` | `node scripts/lint-core-math.mjs` | 0 | 0 clock · 0 RNG · 0 transcendental · 0 foreign import |
| `05-verify.log` | `pnpm verify` | 0 | **17/17** |
| `06-gdd.log` | `node scripts/validate-gdd.mjs` | 0 | 32 modules |
| `07-blueprint.log` | `node scripts/validate-blueprint.mjs` | 0 | 63 tasks, 12 declared warnings |
| `08-tracer.log` | `pnpm tracer --assert` | 0 | equal hashes, desync rejected |
| `09-frame-size.log` | `pnpm vitest run packages/protocol -t "1 551"` | 0 | the 64-entity snapshot is exactly 1 551 bytes |

**what the tests actually prove.**
- Every class round-trips: intent, snapshot, hash ack, hello, welcome, reject — including negative millimetres
  and `0xFFFFFFFF` seq.
- Frame sizes are exact constants: 11 / 13 / 4 / 3 / 4 bytes; snapshot 15 + 24 per entity.
- An unknown frame type, an empty frame, a truncated frame, a trailing byte, an axis outside {-1,0,1}, a
  non-integer millimetre, an int32 overflow, a malformed hash, and >64 entities are each **rejected**.
- `negotiate(1)`, `negotiate(0)`, `negotiate(3)` and `negotiate(99)` all return `reject{version}`, never a
  coerced welcome.
- `snapshotFromWorld` carries the hash of the state it describes, so the frame can be acked; the header
  `appliedSeq` is the highest per-entity seq.

**the budget number, stated plainly.** 64 entities × 24 B + 15 B = 1 551 B. At 30 Hz that is 46 530 B/s,
**3.9× over** the 12 KB/s down budget. The codec is a correctness codec; AoI and delta encoding are NET-101.
No average is quoted to hide it.

**defect repaired in the same commit.** NET-002's blueprint acc was still `pnpm test --filter @strata/protocol`,
which cannot run (`CACError`, logged as `00-acc-old-form.log`). Repaired to
`pnpm vitest run packages/protocol`. **11 other accs still carry the broken form** (count re-measured this
session: the earlier "11 after NET-001" was one short; the real count was 12 at that point). They are listed
by id in `docs/state/NEXT_SESSION.md` §3 — no path is guessed for a package that does not exist yet.

**documented defect fixed while here.** `NEEDS_DIRECTOR.md` had ND-010's "SIGNED" status appended under the
ND-004 update heading, which read as if the token rotation had been resolved by the gate signature. ND-004 is
restored to **OPEN**; the gate status stays in ND-010.

**honest limits.** No delta, no bit-packing, no AoI, no compression, no encryption, no rate limit (SEC-001),
no message-class router (NET-003), no prediction (NET-004). v1 and v2 coexist; the client still speaks v1 until
its migration task. Tick p95 remains unmeasured (NET-006).

**locks.** 7 globs, one sorted commit on `state/locks`: netcode-engineer (5 paths), orchestrator (blueprint +
generated gates).
