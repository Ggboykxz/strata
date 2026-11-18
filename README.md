# STRATA

STRATA is an open-source, browser-based, MMORPG-shaped systemic RPG. Its defining mechanic is
**cross-stratum consequence propagation**: a player's act rewrites a persistent world-history graph, and
later eras visibly read that graph. Burn a forest in the Stone Age and a medieval abbey never exists;
a future megacity becomes desert; the chain is permanent, attributed and replayable.

> In STRATA, every deed rewrites history: burn a Stone Age forest, no medieval abbey exists, a future megacity is desert — and the world remembers forever.

**Status: P0 in progress. Not a playable game yet.** The repository currently contains the concept, scope
ledger, Workflow OS, sealed Constitution, execution blueprint, 32 agents / 51 skills, a deterministic
one-capsule walking skeleton and 27 CI workflows. Hero art, motion generation, scene generation and the
netcode prototype are gated behind **NET-GATE**, which is unpassed. `packages/core` is greybox only.

## Build and verify

Node 22.23.4, pnpm 12.21.0 (via corepack). Exact pins are in [`docs/STACK.lock.md`](docs/STACK.lock.md).

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify            # typecheck, lint, unit, prompt drift, scope, blueprint, ownership, locks, workflows, resume drill
pnpm tracer --assert   # headless two-client state-hash equality + Babylon NullEngine render
```

Every claim in this repository is backed by a command, an exit code and a log under
`docs/state/evidence/`. A missing validator fails; it never silently passes. `concept-integrity --score`
and `scope-math --report` intentionally exit nonzero until measured data exists (I5/I13).

## Architecture

| path | role |
|---|---|
| `docs/CONSTITUTION.md` | binding kernel generated from the sealed master prompt |
| `docs/blueprint/BLUEPRINT.yaml` | execution truth: 63 tasks, 11 gates |
| `docs/state/OWNERSHIP.yaml` | single-writer map; most specific glob wins, a tie is a CI failure |
| `packages/core` | deterministic isomorphic simulation: no clock, RNG, DOM/Node or transcendentals (I14) |
| `packages/protocol` | versioned intent / snapshot / hashack messages |
| `apps/server` | authoritative headless host; owns the tick and the wall clock |
| `apps/game` | Babylon client: prediction, reconciliation, interpolation, HTML/CSS overlay |
| `scripts/` | validators, generators, the one `verify` and the tracer harness |

## Contributing

Read [`AGENTS.md`](AGENTS.md) and [`docs/WORKFLOW.md`](docs/WORKFLOW.md). One task at a time, one handoff
contract, one commit per logical unit with `Agent:` and `Task:` trailers, evidence in the same PR. Author
differs from reviewer; the Director merges. Conflicts go through the arbitration ladder, never through an
edit made anyway.

Session state: [`docs/state/SESSION.md`](docs/state/SESSION.md) and
[`docs/state/NEXT_SESSION.md`](docs/state/NEXT_SESSION.md). Questions awaiting the Director:
[`docs/state/NEEDS_DIRECTOR.md`](docs/state/NEEDS_DIRECTOR.md).

## License

Code: **Apache-2.0** (see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE)). Docs: CC-BY-4.0. Assets, once
created: CC0 / CC-BY-4.0. No model, tool or asset may be used before its license and transitive
dependencies are audited (`docs/legal/AI_MODEL_AUDIT.md`, task P0-006).

The repository is public as of 2026-11-18 by Director decision. Open development does not bypass gates.
