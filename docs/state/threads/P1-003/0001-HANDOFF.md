## 2026-11-18T03:01:00Z | orchestrator -> animation-director | HANDOFF

**claim:** P1-003 can start. GDD-ANIM-ARCHITECTURE is DRAFT and the validator script is already owned by
animation-director. The ADR path `docs/adr/A0001_animation-scenes-textures.md` is **not** yet explicitly
owned and must be added before the handoff (the B2 check caught this during verification).

**expected outputs:** `docs/design/ART_BIBLE.md`, A0001, real `validate-art-bible.mjs`, committed negatives.

**acceptance:** validator 0, 6 negatives, ownership 0 ties, verify 17/17.

**constraints:** I3 separation, I2 no art before NET-GATE, numeric budgets with SOURCE, no model before P0-006.

**deadline:** ≤ 30 min · **rollback:** revert the commit
**ACK** — animation-director, same process.
