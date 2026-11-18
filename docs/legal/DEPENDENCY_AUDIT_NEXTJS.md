# DEPENDENCY AUDIT — NEXT.JS / REACT / REACT-DOM FOR THE DASHBOARD

| field | value |
|---|---|
| audit id | AUDIT-2026-11-18-DASH-NEXT |
| date | 2026-11-18 |
| authority | I4 (constitution): no model or tool before a licence + transitive-dependency audit; non-commercial and research-only are rejected |
| scope | Adding `next`, `react`, `react-dom` to `apps/dashboard` in preparation for a Vercel deployment |
| status | **BINDING for the recorded pins** — a version bump, a new package or a new lockfile resolution is a new audit |
| verdict | **APPROVED for use in this PR** — mitigated pins `next@14.2.35` / `react@18.3.1` / `react-dom@18.3.1` pass the gate with `forbidden=0` (§8). The earlier **REJECTED** finding for `next@16.4.6` is kept as history at §4.3 and §7. |
| mitigation | Pin change, **not a waiver** — the forbidden-class policy (§5) is unchanged (§8) |
| evidence | `docs/state/evidence/20261118T164400Z-DASH-NEXT/01-dependency-audit.log` |
| gate script | `tools/qa/audit-dashboard-deps.mjs` (dependency-free, Node built-ins only, fail-closed) |

## 1. Purpose and hard exclusions

This audit answers one question: may the three pinned npm packages be added to the STRATA dashboard under I4
without introducing a forbidden licence class? It is a **software dependency audit only**.

- **No model, no art, no asset is involved.** This audit covers source-code dependencies of a read-only
  dashboard. It does not touch the AI-model whitelist (`docs/legal/AI_MODEL_AUDIT.md`), does not run a model,
  does not generate or inspect a 3D asset, texture, motion or scene, and does not change NET-GATE status.
- **No deployment is performed.** Vercel is the intended future target; nothing here deploys, pushes, or
  provisions anything. This document is a precondition check, not a release authorisation.

## 2. Original exact versions (HISTORICAL — superseded by §8)

Versions were resolved with `pnpm view <pkg> version` against the live npm registry on 2026-11-18. This
table records the **original pin set**, which was later REJECTED (§4.3, §7) and replaced by the pins in §8.
It is retained as history; it is not the final approved set.

| package | pinned version | resolution command |
|---|---|---|
| `next` | `16.4.6` | `pnpm view next version` → `16.4.6` |
| `react` | `19.3.1` | `pnpm view react version` → `19.3.1` |
| `react-dom` | `19.3.1` | `pnpm view react-dom version` → `19.3.1` |

`react@19.3.1` satisfies Next 16.4.6's peer range (`^18.2.0 || 19.0.0-rc-… || ^19.0.0`).

> HISTORICAL: this pin set is the one that triggered the LGPL blocker. The final approved pins are in §8.

## 3. Direct-package licence table (HISTORICAL — original pin set; final pins in §8)

Licences were read from the registry with `pnpm view <pkg> license` (also re-queried at the exact pin, e.g.
`pnpm view next@16.4.6 license`). Each was checked against the forbidden-class policy in §5.

| package | pin | declared licence | forbidden class present? | verdict |
|---|---|---|---|---|
| `next` | `16.4.6` | **MIT** | none | APPROVED |
| `react` | `19.3.1` | **MIT** | none | APPROVED |
| `react-dom` | `19.3.1` | **MIT** | none | APPROVED |

**Result:** all three direct packages are MIT (permissive, commercial use allowed). **No NON-COMMERCIAL,
RESEARCH-ONLY, UNLICENSED or GPL-family licence is present in any direct package.** (Note: SPDX `UNLICENSED`
= no licence granted and is rejected; the permissive public-domain `Unlicense` is a different, allowed
string. The gate matches `UNLICENSED`, not `Unlicense`.)

## 4. Transitive audit method and result

### 4.1 Method

The gate `tools/qa/audit-dashboard-deps.mjs` is the transitive auditor. It is dependency-free and offline:
it reads only local `package.json` metadata from the pnpm virtual store and never contacts a registry.

1. **Presence / exact-pin check (fail-closed).** For each of the three pinned packages it looks for an
   installed copy at the exact version under `node_modules/.pnpm/`. If any is absent or at a different
   version it prints `NOT INSTALLED` and exits **1** — it cannot silently pass before integration.
2. **Full-tree walk.** It enumerates every package directory under `node_modules/.pnpm/*/node_modules/`
   (including scoped `@scope/pkg` packages), deduplicates by `name@version`, and reads each `license`
   field (string, array or object form; legacy `licenses` array; missing field = UNLICENSED).
3. **Forbidden-class match.** Every licence string is matched against the §5 patterns. Any hit, or any
   missing licence, is a violation: the offending `name@version`, licence string, matched classes and file
   path are printed and the script exits **1**.
4. **Pass condition.** Only when all three pinned packages are installed at the exact pins **and** zero
   forbidden licences are found across the whole installed tree does it print a single `SUMMARY: PASS …`
   line, `RESULT=PASS EXIT=0`, and exit **0**.

The script was run twice around the original integration (the later, mitigated re-runs are in §8):

- **Pre-install run (recorded):** exit **1**, `REASON=NOT_INSTALLED`, listing all three pins as missing.
  This proves the fail-closed property required by I5 — an unaudited stack cannot pass the gate.
- **Post-install run (recorded in the evidence log):** after the root-integration agent installed the pinned
  dependencies, the gate scanned **62** package records, found all **3/3** pins installed, and exited **1**
  with `REASON=FORBIDDEN_LICENCE` because of one LGPL transitive package. See §4.3 and §6. The gate is
  therefore **not green as installed** and cannot be used to declare an APPROVED verdict.

### 4.2 Registry-declared dependency surface (for context)

`next@16.4.6` declares:

- dependencies: `postcss@8.5.23`, `@next/env@16.4.6`, `styled-jsx@5.1.6`, `@swc/helpers@0.5.23`,
  `caniuse-lite@^1.0.30001579`, `baseline-browser-mapping@^2.9.19`;
- optional dependencies: `sharp@^0.35.5` and the platform-specific `@next/swc-*` binaries;
- peer dependencies: `sass`, `react`, `react-dom`, `@playwright/test`, `@opentelemetry/api`,
  `babel-plugin-react-compiler`.

Registry-declared licences for this surface (queried with `pnpm view <pkg> license`):

| package | licence | class |
|---|---|---|
| `postcss@8.5.23` | MIT | permissive |
| `@next/env@16.4.6` | MIT | permissive |
| `styled-jsx@5.1.6` | MIT | permissive |
| `@swc/helpers@0.5.23` | Apache-2.0 | permissive |
| `caniuse-lite` | CC-BY-4.0 | permissive (attribution only — not a forbidden class) |
| `baseline-browser-mapping` | Apache-2.0 | permissive |
| `sharp@0.35.5` | Apache-2.0 | permissive |
| `@next/swc-linux-x64-gnu@16.4.6` | MIT | permissive |
| `scheduler` (React runtime) | MIT | permissive |

**Registry-level result:** no forbidden licence class in the declared transitive surface. The authoritative
result is the installed-tree walk in the evidence log (§6), which covers the fully resolved closure in the
committed lockfile, not just the declared surface. That full closure **does** contain a forbidden class —
see §4.3. The declared-surface table above is therefore not sufficient on its own; this is why the gate
walks the installed tree rather than trusting declared metadata.

### 4.3 Real finding — LGPL in the fully resolved closure (BLOCKER)

The post-install gate run found exactly **one** violation among 62 scanned records:

| package | version | licence | matched class | path in tree |
|---|---|---|---|---|
| `@img/sharp-libvips-linux-x64` | `1.3.4` | **LGPL-3.0-or-later** | GPL-FAMILY | `node_modules/.pnpm/@img+sharp-libvips-linux-x64@1.3.4/.../package.json` |

Resolution chain: `next@16.4.6` declares `sharp@^0.35.5` as an **optional** dependency;
`sharp@0.35.5` (Apache-2.0) depends on `@img/sharp-linux-x64@0.35.5` (Apache-2.0), which declares
`@img/sharp-libvips-linux-x64@1.3.4` as an optional dependency. That final prebuilt **libvips** binary is
licensed **LGPL-3.0-or-later**, which is in the forbidden GPL family (§5). It is installed by pnpm's default
`optional=true` resolution and is present in `pnpm-lock.yaml`.

This is a genuine policy violation, not a false positive: the script matched `LGPL-3.0-or-later` on the
`license` field and the registry query independently confirms the same string. The dashboard is read-only and
uses no `next/image` optimisation, so `sharp` is not functionally required — but that does not remove it from
the installed tree, and I5 forbids treating an unneeded package as if it were absent. Permissive alternatives
in the chain (`sharp`, `@img/sharp-linux-x64` = Apache-2.0) do not change the licence of the libvips binary.

## 5. Forbidden-class policy

The following licence classes are rejected outright. Detection is case-insensitive on the licence field.

| class | matched by (examples) | rationale |
|---|---|---|
| NON-COMMERCIAL | `Non-Commercial`, `CC-BY-NC`, `CC-BY-NC-SA`, `CC-BY-NC-ND` | I4: non-commercial rejected |
| RESEARCH-ONLY | `Research-Only`, `Research Use Only`, any `research` licence class | I4: research-only rejected |
| UNLICENSED | `UNLICENSED`, `No License`, missing/empty `license` field | no grant of rights; fail closed |
| GPL-FAMILY | `GPL-2.0`, `GPL-3.0`, `AGPL-3.0`, `LGPL-2.1`, `LGPL-3.0-or-later`, `SSPL-1.0`, `GFDL` | copyleft incompatible with shipping the dashboard; forbidden by policy (LGPL included) |
| CC-NC | any `CC-*-NC*` token | commercial-use restriction |
| PROPRIETARY | `Proprietary`, `Commercial License` | rights not granted for redistribution |

Permissive licences observed and accepted: MIT, Apache-2.0, BSD-3-Clause, ISC, MPL-2.0, CC-BY-4.0, Unlicense.
Dual licences are accepted when at least one branch is permissive and no branch matches a forbidden class.
A licence bump or a new transitive package that matches any forbidden class flips the verdict to REJECTED.

## 6. Real gate run and evidence

Evidence log: `docs/state/evidence/20261118T164400Z-DASH-NEXT/01-dependency-audit.log`
(every entry carries a `COMMAND`, `UTC` and `EXIT` line, plus the captured output).

Recorded runs, in order:

1. Direct version/licence queries — all exit 0 (§2, §3).
2. `next@16.4.6` dependency / optional / peer metadata queries — all exit 0 (§4.2).
3. `node tools/qa/audit-dashboard-deps.mjs` **pre-install** — exit **1**, `REASON=NOT_INSTALLED`.
4. `node tools/qa/audit-dashboard-deps.mjs` **post-install** — exit **1**,
   `REASON=FORBIDDEN_LICENCE`, `SUMMARY: scanned=62 pinned=3/3 forbidden=1`, naming
   `@img/sharp-libvips-linux-x64@1.3.4 [LGPL-3.0-or-later]`.
5. Registry confirmation of the chain (`sharp` = Apache-2.0, `@img/sharp-linux-x64` = Apache-2.0,
   `@img/sharp-libvips-linux-x64` = LGPL-3.0-or-later) — all exit 0.

(HISTORICAL — original pin set only; superseded by §8.) The gate failed post-install, so the verdict in §7
was **REJECTED as installed**. That finding was not waived or overridden by an agent; it was resolved by the
pin change recorded in §8.

## 7. Verdict on the ORIGINAL pins (HISTORICAL — superseded by §8)

**REJECTED as installed.** The three direct pins (`next@16.4.6`, `react@19.3.1`, `react-dom@19.3.1`) are all
MIT and clean, but the fully resolved transitive closure contains `@img/sharp-libvips-linux-x64@1.3.4`
licensed **LGPL-3.0-or-later**, a GPL-family class that §5 forbids outright. Under I4/I5 the licence gate is
a hard stop: the dashboard must not ship with the dependency tree in its current state, and no agent may
waive this.

Honest mitigation paths (none executed here — this audit is read-only and changed no lockfile or install):

1. **Remove the optional `sharp` chain** from the installed tree / lockfile (e.g. install with pnpm optional
   dependencies disabled, or otherwise exclude `sharp` for this image-free static dashboard), then re-run
   `node tools/qa/audit-dashboard-deps.mjs`. If it exits 0 with 3/3 pins present and `forbidden=0`, this
   audit can be reissued with an APPROVED verdict for that exact tree.
2. A **Director-signed ADR** explicitly accepting LGPL for this transitive binary — only if a higher
   authority amends the forbidden-class policy. No agent asserts that decision.

Any version change, added package or lockfile re-resolution requires a new audit and a new passing gate run.
This verdict covers licensing only; it is not a security, build-size or deployment review.

**No model or art is involved. No deployment is performed.**

Prepared by agent — **Director decision still required for external deployment**. (No signature is asserted.)

---

## 8. Mitigation by pin change and FINAL verdict (2026-11-18)

### 8.1 What changed — and what did not

The LGPL blocker from §4.3 was removed by **changing the pins**, not by a waiver. Root integration
re-pinned `apps/dashboard-next/package.json` and regenerated `pnpm-lock.yaml`:

| package | original pin (REJECTED, §2/§7) | final pin (APPROVED) | registry licence |
|---|---|---|---|
| `next` | `16.4.6` | `14.2.35` | MIT (`pnpm view next@14.2.35 license`) |
| `react` | `19.3.1` | `18.3.1` | MIT (`pnpm view react@18.3.1 license`) |
| `react-dom` | `19.3.1` | `18.3.1` | MIT (`pnpm view react-dom@18.3.1 license`) |

The type packages also moved to `@types/react@18.3.28` and `@types/react-dom@18.3.7`.

**Reason for the downgrade:** `next@16.4.6` declares `sharp@^0.35.5` as an optional dependency, and its
platform package pulled `@img/sharp-libvips-linux-x64@1.3.4` (**LGPL-3.0-or-later**, GPL family) into the
resolved tree (§4.3). `next@14.2.35` has **no optional `sharp`/libvips chain** — its `optionalDependencies`
are only the `@next/swc-*` platform binaries (registry query recorded in the evidence log). The
forbidden-class policy in §5 is **unchanged**: no licence rule was relaxed and no exception was granted.

The temporary `.npmrc optional=false` experiment is **not** cited as mitigation: it did not change pnpm 12
fresh installs and was removed.

### 8.2 Independent re-verification (this audit, agent)

Recorded in the same evidence log with `COMMAND` / `UTC` / `EXIT` lines and captured output:

- `pnpm install --frozen-lockfile` → **EXIT 0** ("Lockfile is up to date, resolution step is skipped").
- `node tools/qa/audit-dashboard-deps.mjs` (mitigated pins) → **EXIT 0**:
  `SUMMARY: PASS scanned=74 pinned=next@14.2.35,react@18.3.1,react-dom@18.3.1 forbidden=0 missing_license=0`,
  `RESULT=PASS EXIT=0`.
- `pnpm view next@14.2.35 optionalDependencies --json` → EXIT 0; only `@next/swc-*` binaries, no `sharp`.
- Installed-tree check → `NONE: no sharp/libvips packages installed`.
- Registry licence queries for all three new pins → all `MIT`.

The current gate also performs a manifest-drift check, so it fails if `apps/dashboard-next/package.json`
pins diverge from the pins this audit approved. The measured clean closure is **74** packages with
**zero** forbidden licences and **zero** missing licence fields.

### 8.3 FINAL VERDICT

**APPROVED for use in this PR** — for the exact pins `next@14.2.35`, `react@18.3.1`, `react-dom@18.3.1` and
the lockfile resolved at audit time. The verdict rests on the measured clean closure (§8.2), **not on any
agent waiver**. The earlier **REJECTED** finding (§4.3, §7) is retained as history and was resolved only by
the pin change above. Any future pin, package or lockfile re-resolution requires a new audit and a new
passing gate run.

Unchanged limits:

- **No deployment is performed.** Vercel remains a future target; a **Director decision is still required
  for external deployment**.
- **Token rotation ND-004/005 remains outstanding** and is not resolved by this audit.
- **No model or art is involved**; NET-GATE status is unchanged.
- This verdict covers licensing only — not security, build size or operational readiness.

Prepared by agent — **Director decision still required for Vercel deployment**. (No signature is asserted.)
