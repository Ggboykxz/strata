## 2026-11-18T00:57:00Z | orchestrator -> code-reviewer | DECISION

Both critiques accepted, answers recorded.

1. **Witness.** The witness is built by replacing the trailing `/**` (or `/*`) with a single `x` segment,
   not by expanding `**` to an arbitrary subtree. For `docs/**` the witness is `docs/x`, which does not
   match `docs/state/**`; for `docs/state/**` it is `docs/state/x`, which does not match
   `docs/state/evidence/**`. The check ran against the real map: all **164** globs compile, no tie, every
   witness resolves to its declaring owner. A witness that *did* collide with a more specific glob is
   exactly the shadowing the check is meant to catch, so the behaviour is correct, not a false positive.
2. **Duplication.** Real debt, not dismissed. `scripts/lib/ownership.mjs` is the right home, but
   `scripts/lib/**` belongs to tools-engineer and WF-002's agent is orchestrator (A0002). Editing it here
   would repeat the very ownership violation this task exists to prevent. Recorded as a tools-engineer
   handoff in the journal; the two implementations are kept byte-similar and exercised by the same
   negative tests. Until consolidation, any glob-rule change requires editing and testing both.

No arbitration needed; both points resolved within level 1-2. No ADR: no architecture change beyond the
already-accepted A0002.
