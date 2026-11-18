## 2026-11-18T10:30:00Z | orchestrator -> producer + netcode-engineer | HANDOFF

**claim.** NG-001 is a **gate task**: assemble the NET-GATE dossier for the Director and replace the declared
`validate-netgate.mjs` stub with a real validator. The dossier must state which §5.2 criteria are met, unmet or
not measured, with a command, exit code and log for each claim (I13). No agent signs the gate (D136).

**inputs.** Master §5.2 / §15, `docs/legal/THREAT_MODEL.md` (7 residual risks), all P2NET evidence dirs,
metrics `2026-11-18-s02.json`, `scripts/validate-netgate.mjs` (stub).

**expected outputs.** `docs/qa/prototypes/NET_GATE.md` (unsigned), real `scripts/validate-netgate.mjs`,
NG-001 acc, `docs/state/gates/GATE_NET.md` if the gate dossier convention requires it, FULL §20 result.

**acceptance.** `node scripts/validate-netgate.mjs` · `node scripts/validate-netgate.mjs --assert-ready` ·
`pnpm verify` · `pnpm tracer --assert`.

**constraints.** fail closed; never weaken an assertion to make the gate pass; `NOT READY` must be reported when
criteria are unmet; no artist asset, no signature by an agent; no fake measurement.
**deadline:** ≤ 30 min · **rollback:** revert the branch head.

## 2026-11-18T10:30:00Z | orchestrator -> producer + netcode-engineer | PROPOSAL

**two distinct questions.** The validator checks *dossier integrity*: every §5.2 criterion present with a status
and a cited command/exit/log, the seven threat risks verbatim, no agent signature, no "passed" claim while a
criterion is unmet. That must pass for NG-001's acc. A separate `--assert-ready` mode checks *gate readiness* and
**exits 1 today**: 4-client RTT/loss matrix, 30-min soak, server tick p95, the 12 KB/s wire budget and RPO are not
measured or not met. A validator passing must never be read as NET-GATE passing; the dossier says so in its header.

**status per criterion.** `met` (10k fuzz, server authority, threat model written), `partial` (reconnect handles,
validator exists but not wired into `attachRooms`), `not-measured` (4-client matrix, soak, p95, RPO),
`failing` (46 530 B/s vs 12 288 B/s budget, 3.79× over). Each gets a command and an evidence path.

**signature.** The dossier ends with an empty Director signature block: `status: UNSIGNED / NOT READY`. A string
matching an agent name in that block is a validator failure.

**FULL result.** Gate tasks use `node scripts/session-result.mjs --format full`; those lines come from `result.full`
in metrics, already populated across this session.

**ACK** — producer and netcode-engineer, same process.
