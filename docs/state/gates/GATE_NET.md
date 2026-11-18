# GATE:NET — signed with risk acceptance

| field | value |
|---|---|
| gate | GATE:NET (blocking before art, master §5.2) |
| status | **SIGNED — RISK ACCEPTED** |
| Director statement | "je signe tout" (verbatim, 2026-11-18) |
| authority | A0006; `docs/qa/prototypes/NET_GATE.md` §6 |
| evidence verdict | **NOT READY — 8/10 criteria unmet** |
| art_allowed | true **because the Director accepted the risk**, not because criteria were measured |

## Signature

**Director signature: SIGNED — RISK ACCEPTED — 2026-11-18.** Recorded Director decision, quoted verbatim:
**"je signe tous"** (A0009). Signed by the DIRECTOR and transcribed by the orchestrator; no agent fabricated or
inferred a signature (D136). The gate dossier keeps all 10 master §5.2 criteria with their honest statuses: 2 met,
8 `not-measured`, `partial` or `failing`. This signature is a risk acceptance, not a measurement.

`node scripts/validate-netgate.mjs` passes because the dossier is honest. `node scripts/validate-netgate.mjs
--assert-ready` exits 1 because 8 criteria remain unmet. Both facts are recorded; neither is hidden.

## Unmet criteria at signature time

1. four-client RTT/loss/jitter matrix — not measured.
2. 30-minute soak — not measured.
3. desync correction p95 / rubber-band distance — not measured.
4. server tick p95 ≤ 25 ms — not measured under load.
5. wire ≤ 12 KB/s — **failing** at 46 530 B/s (3.79×).
6. reconnect exact-state proof with 4 clients — partial.
7. crash restore ≤ 3 s and RPO ≤ 60 s — partial, no measured dataset.
8. every client message validated on the live path — **mitigated after signature by SEC-002**; the 8-unmet signature-time count is retained verbatim.

## Re-measurement obligation

This signature is not a permanent certificate. After a real 4-client load harness, AoI/delta (NET-101) and RPO
evidence exist, the gate must be re-measured and either confirmed or revoked. The residual risks in
`docs/legal/THREAT_MODEL.md` stay attached to every art decision made under this gate.
