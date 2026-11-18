# NET-GATE security prototype — real sockets, HMAC, TLS, persistent counters

| field | value |
|---|---|
| task | GATE:NET |
| date | 2026-11-18 |
| status | **PROTOTYPE — measured, NOT production wiring, NOT a NET-GATE pass** |
| owner | security-auditor |
| branch | `session/20261118-netgate-security` |
| production code changed | **none** (`apps/server/src/**` is untouched) |

> **Reading rule.** This document measures a harness. The live server still uses plain `ws://`, has no
> authentication, and keeps its counters in memory. Nothing here certifies the network as secure, closes a
> NET-GATE criterion, or authorises art (I2). The NET-GATE dossier row `threat-and-anticheat` remains `partial`
> and is deliberately not edited by this task.

## 1. Question

SEC-001 built a counted message gate and a 30-per-window rate limit. SEC-002 put it on the live `attachRooms`
path. The remaining uncertainty was narrow and testable:

1. Does the gate behave the same over a **real socket** under a 200-message burst?
2. Can a **credential be verified before `attachRooms`** creates membership?
3. Does an **encrypted transport** work, and does plaintext fail against it?
4. Do the counters **survive a restart** at all?

This prototype answers those four questions on loopback. It does not answer production authentication, PKI,
multi-process limits, loss/latency/jitter, or a 30-minute soak.

## 2. What was built (harness only)

All files are under `apps/server/test/netgate/`:

| file | purpose |
|---|---|
| `hmac-token.ts` | HMAC-SHA256 tokens over `node:crypto`; payload binds `clientId`, `roomId`, `expiresAt`; `timingSafeEqual` comparison; 256-bit secret generated per run |
| `auth-rooms.ts` | harness-only wrapper: verifies the token, then re-emits the connection to a private relay owned by the unchanged `attachRooms`; bad credentials never reach it |
| `tls-cert.ts` | runtime `openssl req -x509` self-signed certificate in a temporary directory; nothing committed |
| `persistent-security.ts` | `MessageGate` plus atomic JSON persistence of rejection counts, rate window and audit entries; corrupt state fails closed |
| `harness.ts` | real HTTP(S) servers, loopback `ws` clients, frame tracking and timeouts |
| `hmac-auth.test.ts`, `flood.test.ts`, `persistence.test.ts`, `tls.test.ts` | the nine measurements below |

The wrapper is not imported by `apps/server/src/main.ts` or `apps/server/src/rooms/**`. `attachRooms` itself
is unchanged production code.

## 3. Evidence

| command | exit | log |
|---|---|---|
| `pnpm install --offline --frozen-lockfile` | 0 | `docs/state/evidence/20261118T195202Z-NETGATE-SECURITY/01-install.log` |
| `pnpm vitest run apps/server/test/netgate/ --reporter=verbose` | 0 | `docs/state/evidence/20261118T195202Z-NETGATE-SECURITY/02-acc-netgate.log` |
| `pnpm vitest run --config tests/security/vitest.config.ts` | 0 | `docs/state/evidence/20261118T195202Z-NETGATE-SECURITY/03-acc-security.log` |
| `pnpm vitest run apps/server/test/netgate/` (exact acceptance) | 0 | `docs/state/evidence/20261118T195202Z-NETGATE-SECURITY/10-acc-netgate-exact.log` |
| `pnpm vitest run --config tests/security/vitest.config.ts` (exact acceptance) | 0 | `docs/state/evidence/20261118T195202Z-NETGATE-SECURITY/11-acc-security-exact.log` |
| targeted `tsc --noEmit` on all nine harness files | 0 | `docs/state/evidence/20261118T195202Z-NETGATE-SECURITY/04-typecheck-harness.log` |
| `pnpm verify` | 0 | `docs/state/evidence/20261118T195202Z-NETGATE-SECURITY/05-verify.log` |
| `pnpm vitest run` (full suite) | 0 | `docs/state/evidence/20261118T195202Z-NETGATE-SECURITY/06-full-suite.log` |
| `node scripts/validate-netgate.mjs` | 0 | `docs/state/evidence/20261118T195202Z-NETGATE-SECURITY/07-netgate-validator.log` |

The acceptance run was **4 files / 9 tests passed**. The read-only SEC-001 suite was **1 file / 10 tests passed**.
The full regression suite was **46 files / 311 tests passed**; `pnpm verify` was **19/19**.

## 4. Real-socket flood — measured

One authenticated `ws` client sent **200 intent frames** (11 bytes each, 2 200 bytes up) in one fixed window
to a real loopback `WebSocketServer` carrying the unchanged SEC-002 path. A prototype-only observer recorded
the verdict of the real `MessageGate.accept`; the wire carried 170 reject frames (4 bytes each, 680 bytes down).

| measurement | value |
|---|---|
| messages sent | 200 |
| admitted by `MessageGate` | **30** |
| refused with `rate-limited` | **170** |
| reject frames observed on the wire | 170 |
| wire reject reason | `malformed` (adapter maps every gate refusal to this — see risk 7) |
| wall-clock duration (send loop through 170th reject) | **26.65 ms** |
| room entity `seq` after one tick | 30 |
| hash before tick | `3824b21e` |
| hash after tick | `fa607989` |
| reference room, exactly 30 intents | `fa607989` (match) |
| reference room, all 200 intents | `9033ebd1` (no match) |

The hash equality with the 30-intent reference and inequality with the 200-intent reference is the evidence
that the 170 refused frames never entered the room. The duration is one loopback run, not a packets/s or
server-tick benchmark; it is dominated by the client send loop and scheduling.

## 5. TLS — measured

| measurement | value |
|---|---|
| `openssl` probe | `OpenSSL 3.0.13 30 Jan 2024` |
| certificate | self-signed RSA-2048, CN/SAN `127.0.0.1`, generated at runtime into a temp dir, removed afterwards |
| certificate or private key committed | **no** |
| client verification | `rejectUnauthorized: false` (test-only, because self-signed) |
| negotiated protocol | **TLSv1.3** |
| negotiated cipher | **TLS_AES_256_GCM_SHA384** |
| encrypted room handshake | `hello` → `welcome` over `wss://` |
| plaintext `ws://` to the same TLS port | **failed** (`socket hang up`) |

This proves the harness can carry the gated room path over TLS. It does **not** prove production PKI, hostname
verification, certificate rotation or a trusted CA.

## 6. HMAC token — measured

| case | result |
|---|---|
| valid token, matching room, unexpired | admitted; room created; `hello` → `welcome`; 1 member |
| missing token | refused `unauthorized`; 0 rooms created |
| tampered payload | refused `unauthorized`; 0 rooms created |
| forged 32-byte signature | refused `bad-signature` in the unit test; wrapper refused `unauthorized` |
| token issued for another room | refused `unauthorized`; 0 rooms created |
| expired token | refused `unauthorized`; 0 rooms created |

The secret is a per-run 256-bit value, never printed. The token is signed over `v1.<payload>`, and the HMAC
digest is compared with `crypto.timingSafeEqual` after a length check. Four socket-level refusals produced
`roomsCreated: 0`: verification happens before `attachRooms`.

## 7. Counter restart — measured

The persistent gate received 32 intents at tick 100: **30 admitted, 2 rate-limited**. It wrote a 469-byte JSON
state file with the rate counter at `{window: 3, count: 30}` and one audit entry. A new gate was constructed in
the same process over that file:

1. the `rate-limited` count was still 2 and the audit entry still existed;
2. a 33rd intent in the same window was refused again (count became 3, proving the budget was not reset);
3. an intent at tick 130 (next fixed window) was admitted;
4. a second restart still showed 3 rate-limited events and 2 audit entries.

A corrupt JSON file and a counter of 31 (> the 30 limit) both throw on load instead of silently starting from
zero. The state file is written to a temp file, fsynced, atomically renamed and created with mode `0600`.

## 8. What this changes, and what it does not

Measured better: the gate is real-socket tested, an HMAC credential can be checked before room membership,
TLS carries the room path, and file-backed counters can survive an in-process restart.

Still true in production: `apps/server/src/main.ts` serves `ws://` with no token check; `attachRooms` accepts
`?room=<id>&nonce=<n>`; the rate/audit state is in memory; the adapter still reports every refusal as
`malformed`. The NET-GATE criterion `threat-and-anticheat` therefore remains **partial**. This prototype
reduces uncertainty; it is not a gate signature and no criterion status is changed.

## 9. Residual risks that still block production

1. **Production has no authentication.** The HMAC wrapper exists only in tests. The live endpoint still accepts
   an unauthenticated `nonce` and mints membership.
2. **The token design is not production auth.** Tokens travel in the URL query string (proxy/access-log leak),
   there is no identity provider, revocation list, key id, rotation, audience check against the room's internal
   client id, or attempt throttling.
3. **Secret lifetime is per process.** A per-run secret invalidates every session on restart; there is no KMS,
   HSM or overlapping-key rotation.
4. **TLS is test-only.** The certificate is self-signed and the client disables verification. There is no CA
   chain, hostname verification, pinning, rotation or downgrade policy in the live server.
5. **Persistence is a single-writer file.** No Redis, no inter-process lock, no cross-shard limit, no retention.
   Sequence anti-replay state is not persisted: after a restart, `MessageGate.lastSeq` starts empty, so old
   sequence numbers can be replayed until a newer one is observed.
6. **The limiter is per room client id, not per authenticated principal.** The token's `clientId` is a harness
   label; the room assigns its own client id. `forget()` on logout/reset also drops the limiter state by design.
   Multiple connections or reconnects are not bounded globally.
7. **Wire reasons are lossy.** `ws-adapter.ts` sends `reason: 'malformed'` for every gate refusal, including the
   170 rate-limited frames. Clients and operators cannot distinguish rate limiting from malformed bytes.
8. **No DoS beyond the per-window count.** 170 refused frames still cost read/decode/handler time; there is no
   connection cap, backpressure, IP reputation or global budget.
9. **Audit retention remains OPS-001.** The file prototype keeps entries but has no 90-day retention, rotation,
   tamper-evident chain or off-host copy.
10. **No anti-cheat beyond plausibility.** PR-N4 range/cooldown/LOS checks remain the only behavioural checks;
    there is no statistical or profiling detection.
11. **One client, loopback, no adverse network.** No 4-client matrix, no loss/latency/jitter, no 30-minute soak,
    no measured server tick p95 under this load, and no multi-attacker memory-growth test.

## 10. Reproduce

```bash
pnpm install --offline --frozen-lockfile
pnpm vitest run apps/server/test/netgate/ --reporter=verbose
pnpm vitest run --config tests/security/vitest.config.ts
```

The TLS test logs `NETGATE_TLS {"status":"NOT MEASURED"}` and passes with an explicit gap if `openssl` is not
on `PATH`. No certificate is written into the repository.
