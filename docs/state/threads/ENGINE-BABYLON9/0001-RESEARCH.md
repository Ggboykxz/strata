## 2026-11-18T16:05:00Z | orchestrator -> all | Babylon.js 9.0 feature research

**Director input.** A presentation summary of Babylon.js 9.0 was provided (blog link `https://aka.ms/babylon9Blog`):
Node Particle Editor, Frame Graph v1 / Node Render Graph Editor, clustered / textured-area / volumetric lighting,
animation retargeting across different skeletons, Inspector v2 (React), Editor updates, advanced Gaussian
Splatting and Large World Rendering. The summary explicitly says the node graphs target **visual effects and
rendering**, not gameplay logic.

**What the repo already has.** `docs/STACK.lock.md` pins `@babylonjs/core` **9.37.0** (Apache-2.0, audited
2026-11-18); `apps/game/package.json` matches. `TRACER-001` uses `NullEngine` on the server, and no Babylon
object enters `packages/core`. No new dependency is implied by this research.

**Fit by invariant.**

| feature | verdict | reason |
|---|---|---|
| Node Particle Editor / Node Render Graph | **rendering only — no gameplay truth** | consistent with I1 (server owns truth) and I3/A0001 (no bone/pose data on the wire). Usable only after NET-GATE for VFX (I2). |
| Clustered / textured-area / volumetric lighting | deferred to P3 lighting | GDD-STRATA budgets: draw calls <= 250, tris <= 1.5 M, load <= 25 MB; no budget change here. |
| Animation retargeting (different skeletons) | relevant to **AN-002**, not adopted now | GDD-ANIM-ARCHITECTURE: retarget coverage 100%, missing bone in map rejects the pack, 0 bone transforms on wire, D124 "Babylon runtime retargeting + client blending". Any built-in retarget must pass `validate-retarget.mjs`; it must not replace the authoritative anim state machine (NET-005/006). |
| Inspector v2 / Editor | dev tooling | separate packages/licenses would need an I4 audit entry before use; core pin alone does not authorize them. |
| Gaussian Splatting | constrained by GDD-STRATA / ART_BIBLE | splat only as distant backdrop beyond 120 m, <= 25% of cell GPU budget, never gameplay, collidable or server-referenced. |
| Large World Rendering | constrained by GDD-STRATA | KITs on a 2 m grid streamed in 64 m cells, heightmap byte-identical on both sides; no monolithic generated zone. |

**Doc drift found.** `docs/CONSTITUTION.md` §10.4 says "Babylon.js 8" while `STACK.lock.md` pins 9.37.0. The
constitution is materialized from a sealed master; changing that sentence needs a Director-signed ADR, so this
note records the drift instead of silently editing it. `STACK.lock.md` remains the authoritative pin source.

**Decision.** No code, pin or GDD change from a blog/video claim. When AN-002 / WG-001 / P3-003 arrive, evaluate
the specific audited Babylon 9 APIs against the numbered contracts above; require a measured command and log for
every budget claim (I13). No art before NET-GATE passes (I2), and NET-GATE remains signed-with-risk with 8 unmet
criteria.
