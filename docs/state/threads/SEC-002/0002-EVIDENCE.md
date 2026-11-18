## 2026-11-18T13:40:00Z | security-auditor -> all | EVIDENCE

**claim.** SEC-002 closed residual risk 3: every inbound room frame now passes `MessageGate.accept()` before
`Room.handleBytes`. A refused frame gets `reject` and never reaches the room; a valid hello is admitted.

**evidence** (`docs/state/evidence/` SEC-002 dir)

| log | command | exit | result |
|---|---|---|---|
| `01-rooms.log` | `pnpm vitest run apps/server/test/rooms.test.ts` | 0 | **18/18**, new SEC-002 integration test |
| `02-security.log` | `pnpm vitest run --config tests/security/vitest.config.ts` | 0 | **10/10** |
| `03-typecheck.log` | `pnpm typecheck` | 0 | strict |
| `04-full.log` | `pnpm test` | 0 | **167/167** (20 files) |
| `05-verify.log` / `07-verify-final.log` | `pnpm verify` | 0 | **19/19** |
| `06-docs.log` | `node scripts/validate-docs.mjs` | 0 | 8 ADRs, 0 errors |

The test simulates a real connection, sends malformed bytes and asserts the socket receives `reject` while the
room hash is unchanged, then sends a valid v3 hello and asserts `welcome`. No assertion weakened.

**docs.** GDD-SECURITY 0.4; THREAT_MODEL residual risk 3 rewritten from "not on the live path" to mitigated.
Remaining risks: no auth, no TLS, in-memory counters, no socket flood test, retention OPS-001, no statistical
anti-cheat. These cannot be closed without network/hardware/Director actions.

**locks.** 5 globs on `state/locks`, acquired; release after the commit.
