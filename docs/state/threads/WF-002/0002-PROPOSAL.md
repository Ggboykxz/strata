## 2026-11-18T00:55:00Z | orchestrator -> all | PROPOSAL

Make the two P0-002 stubs real.

- **Ownership validator**: compile every glob; reject identical globs with different owners; build a
  *witness path* from each glob and require `ownerOf(witness)` to resolve back to the declaring owner —
  this catches a specific glob silently shadowing a general one; check every task's `out` paths against
  `owner ∪ co` with the printed scaffold exemption; guard A0002 so the two validators cannot drift back
  to tools-engineer.
- **Lock validator**: check schema and watchdog arithmetic (`heartbeat < ttl`), require referenced owner
  and task to exist, reject expired-but-active locks and duplicate active path globs. An empty registry is
  valid and must be reported as such, not waved through silently.

Both use the shared strict YAML parser and fail closed (exit 2 on unreadable input). The glob compiler is
deliberately a mirror of validate-blueprint B2, not a new shared library: `scripts/lib/**` is
tools-engineer territory and this task cannot edit it (I6). Consolidation is a handoff, recorded below.
