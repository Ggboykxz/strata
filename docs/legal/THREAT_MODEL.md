# STRATA threat model — P2NET (SEC-001)

| field | value |
|---|---|
| date | 2026-11-18 |
| status | **partial**: the ingress gate is wired into the room adapter (SEC-002). A harness-only GATE:NET prototype measured HMAC verification, TLS and file-backed counters over real sockets, but production still has no authentication, no TLS and in-memory counters |
| owner | security-auditor |

## Assets

1. Authoritative world state and tick: positions, hashes, entity ids (I1).
2. Player progression and money: bigint minor-unit ledger (PR-N3, D150).
3. Session resume handles: opaque handles, **not credentials** (A0004).
4. GM audit trail: actor, tick, reason, immutable entry (SEC-001).
5. Evidence chain: committed logs and metrics; a false claim is a P1 defect (I13).

## Adversaries

- **Flood client**: sends 200 intents in one 30-tick window to stall the tick.
- **Replay client**: reuses an old sequence number or a stale resume handle after logout.
- **Forger**: sends a snapshot, a hit result or a bone transform to take authority (I1/I3).
- **Version-confused peer**: speaks an old wire version and expects silent coercion.
- **Unreasoned GM action**: grants without a recorded justification.

## Surfaces and current mitigations

| surface | mitigation | evidence |
|---|---|---|
| untrusted bytes | `decodeFrame` rejects malformed lengths/types; reason `malformed` counted | `tests/security/message-gate.test.ts` |
| unknown kinds | client-sent snapshot refused (`client-snapshot`); unknown kinds refused | same |
| version | v4 only; v3/v5 refused, never coerced (GDD-NETCODE §7, A0010) | `packages/protocol/test/binary.test.ts` |
| flood | 30 intents per 30-tick window; 200-message burst → 30 admitted, 170 `RATE_LIMIT` | `tests/security/message-gate.test.ts` |
| replay | monotonic seq per client; `forget()` on logout clears seq and rate state | same |
| hit claims | no wire kind for a hit result; PR-N4 ignores `claimed` | PR-N4 evidence |
| GM action | non-empty reason required; immutable hashed entry or refusal | `tests/security/message-gate.test.ts` |
| real-socket flood (prototype only) | 200 intents over loopback `ws` → 30 admitted, 170 `rate-limited`; rejected frames excluded from the room hash | `docs/qa/prototypes/NET_GATE_SECURITY.md` §4 |
| session credential (prototype only) | HMAC-SHA256 binds `clientId`+`roomId`+expiry, constant-time compare; verified before `attachRooms`; missing/tampered/wrong-room/expired refused with 0 rooms created | `docs/qa/prototypes/NET_GATE_SECURITY.md` §6 |
| transport encryption (prototype only) | self-signed TLSv1.3, `TLS_AES_256_GCM_SHA384`; plaintext `ws://` to the TLS port failed; production remains plain `ws://` | `docs/qa/prototypes/NET_GATE_SECURITY.md` §5 |
| counters (prototype only) | atomic JSON file; rate window, rejection counts and audit entries survived an in-process restart; corrupt state fails closed | `docs/qa/prototypes/NET_GATE_SECURITY.md` §7 |

## Residual risks — NOT mitigated here

1. **No authentication.** The resume handle is an FNV-1a tamper detector, not a credential; anyone who holds one
   can attempt a resume. Authentication is a later task; A0004 and GDD-NETCODE §7 say so explicitly.
   **GATE:NET status (prototype):** a harness-only HMAC wrapper refused missing/tampered/wrong-room/expired
   tokens with 0 rooms created. The live `main.ts`/`attachRooms` path still accepts an unauthenticated `nonce`.
2. **No TLS in the harnesses.** All local tests use in-process sockets or fake sockets. No transport encryption
   is claimed.
   **GATE:NET status (prototype):** a separate harness now measures self-signed TLSv1.3 and a failed plaintext
   connection. The risk name is retained because `NET_GATE.md` quotes it verbatim; production still serves
   plain `ws://` and no trusted PKI exists.
3. **The gate is now on the live path (SEC-002).** `apps/server/src/rooms/ws-adapter.ts` routes every frame
   through `MessageGate.accept()` before `Room.handleBytes`; a refused frame gets a `reject` frame and never
   reaches the room. The remaining risk is that other ingress paths may be added later without the gate — CI
   regression test: `apps/server/test/rooms.test.ts` proves malformed refused and valid admitted.
4. **In-memory counters only.** Rate and reject counters reset on process restart; no distributed limiter, no
   persistence, no cross-shard enforcement.
   **GATE:NET status (prototype):** a single-writer JSON file preserved the rate window, rejection counts and
   audit entries across an in-process restart. It is not Redis, has no inter-process lock, and production
   counters remain in memory.
5. **No real socket flood test.** The 200-message burst is in-process. No measured packets/s, RTT or loss matrix.
   **GATE:NET status (prototype):** one loopback `ws` client sent 200 intents; 30 were admitted and 170 were
   `rate-limited` in 26.65 ms. This is not a production flood, a throughput benchmark, or a loss/jitter matrix.

6. **Audit retention is unimplemented.** The 90-day target is an OPS-001 runbook item; this task only guarantees
   entry immutability and a deterministic hash.
7. **No anti-cheat beyond plausibility.** Speed/hit validation exists in PR-N4; no behavioural profiling or
   statistical detection is claimed.

## Prototype evidence (GATE:NET) — NOT production

`docs/qa/prototypes/NET_GATE_SECURITY.md` records a harness measurement dated 2026-11-18. It changes no
production file and does not close a NET-GATE criterion.

- **Flood:** 200 intents from one authenticated loopback `ws` client → exactly 30 admitted, 170 `rate-limited`,
  room hash equal to a 30-intent reference (`fa607989`) and different from a 200-intent reference (`9033ebd1`);
  wall-clock 26.65 ms for the send loop through the 170th reject.
- **Credential:** HMAC-SHA256 over `clientId`+`roomId`+`expiresAt`, constant-time digest comparison, verified
  before `attachRooms`; 4/4 invalid cases refused, 0 rooms created; 1 valid case reached `welcome`.
- **TLS:** runtime self-signed certificate, TLSv1.3 / `TLS_AES_256_GCM_SHA384`, encrypted `hello`→`welcome`;
  plaintext `ws://` to the TLS port failed with `socket hang up`. No certificate is committed.
- **Counters:** atomic JSON file; 30/2 flood result, `{window: 3, count: 30}` and audit entries survived an
  in-process restart; a corrupt file failed closed with an exception.

These are prototype facts. The seven residual risks above remain the production assessment.

## Decision

SEC-001 closes the **validation and reason-code** part of P2NET. It does not certify the network as secure. The
NET-GATE dossier (NG-001) must carry these residual risks verbatim to the Director rather than summarising them
away. The GATE:NET prototype adds measurements but does not change that decision or the `partial` status of the
`threat-and-anticheat` criterion.
