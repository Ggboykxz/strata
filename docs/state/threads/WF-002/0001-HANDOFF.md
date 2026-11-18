## 2026-11-18T00:54:00Z | orchestrator -> orchestrator | HANDOFF

**claim:** WF-002 is executable after A0002; its two outputs are now orchestrator-owned. L2 ceremony:
CI-enforced process tooling is architecture, so the full thread and a different reviewer are required.

**inputs**
- `docs/state/OWNERSHIP.yaml` (32 owners, 164 globs after A0002), `docs/state/LOCKS.yaml` (empty registry)
- `docs/blueprint/BLUEPRINT.yaml` (63 tasks), `scripts/lib/yaml.mjs` (shared strict parser)
- `docs/adr/A0002_workflow-validator-ownership.md` (accepted), `docs/WORKFLOW.md` §1/§2

**expected outputs**
- `scripts/validate-ownership.mjs` — map structure, glob ties, witness self-resolution, task outputs,
  A0002 regression guard
- `scripts/validate-locks.mjs` — registry schema, referenced identities, active-lock intervals and collisions

**acceptance**
- both validators exit 0 on the real repo
- 8 negative tests must make them exit 1: 4 ownership (tie, out-of-domain output, A0002 regression,
  plus baseline) and 4 lock (bad ttl, duplicate active glob, unknown owner, plus baseline)
- no stub banner may remain in either file

**constraints**
- the mutex stays git on `state/locks`; the validator checks the registry's shape, it does not replace git
- orchestrator may write only these two `scripts/**` files (A0002); `scripts/lib/**` stays tools-engineer's
- fail closed: unreadable document → exit 2, any violation → exit 1, no silent pass (I5)
- one process wears every hat until the Director installs reviewers; the critique below is recorded anyway

**deadline:** this session · **rollback:** revert the WF-002 commit; docs/state unchanged

**ACK** — orchestrator, same process.
