# LOCALIZATION — STRATA

| field | value |
|---|---|
| id | LOCALIZATION |
| version | 1.0 |
| owner | localization-manager |
| status | ACTIVE |
| authority | master §6 policy, WORLD_BIBLE glossary, UX_SPEC |
| validated by | `node scripts/validate-docs.mjs` |

## 1. Language pairs

FR and EN are the shipped pair. Every proper noun comes from `docs/design/WORLD_BIBLE.md` §5 with both
forms and one stable id. A key without both forms is a P1 defect and blocks the PR.

## 2. No concatenation

UI strings are complete sentences with placeholders, not assembled fragments. Grammatical gender and plural
forms live in the locale bundle, never in code. A missing placeholder fails the check.

## 3. Locale-independent logic

Core, protocol and ledger use integer minor units and fixed numeric formats. Only presentation formats
numbers and dates. A locale-dependent parse in `packages/core` is an I14 defect.

## 4. Coverage gate

| metric | threshold | source |
|---|---|---|
| glossary entries with FR and EN | 100 % | WORLD_BIBLE §5 |
| untranslated UI keys | 0 | localization bundle |
| locale-dependent numeric parses in core | 0 | lint + review |

## 5. Process

A new string is added to both bundles in the same PR as its code. The localization-manager reviews any PR
touching FR/EN pairs. A behaviour change that adds a string without a pair is refused.

## 6. Change log

| version | date | change | by |
|---|---|---|---|
| 1.0 | 2026-11-18 | FR/EN policy, no concatenation, coverage gate | localization-manager |
