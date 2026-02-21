# Codebase Issue Task Proposals

This document captures four concrete follow-up tasks discovered during a repository review.

## 1) Typo Fix Task

**Title:** Fix test command file-extension typo in integration test docs

**Issue:** `tests/integration/README.md` tells contributors to run `*.test.js` files, but the actual integration tests in this repo are TypeScript `*.test.ts` files.

**Why this matters:** Copy/pasting the documented commands can fail or create confusion for contributors.

**Suggested task:**

- Update command examples from `.test.js` to `.test.ts` in `tests/integration/README.md`.
- Re-run the listed commands locally to verify they resolve correctly.

---

## 2) Bug Fix Task

**Title:** Fix Jest setup TypeScript global augmentation error

**Issue:** Running Jest currently fails before tests execute because `tests/setup.ts` declares `declare global { ... }` without making the file an external module.

**Evidence:** `TS2669: Augmentations for the global scope can only be directly nested in external modules or ambient module declarations.`

**Why this matters:** This blocks test execution and hides real regressions.

**Suggested task:**

- Add `export {};` to `tests/setup.ts` (or move the global declaration to an ambient `.d.ts` file loaded by ts-jest).
- Run a representative Jest command to confirm tests initialize.

---

## 3) Code Comment / Documentation Discrepancy Task

**Title:** Align integration test documentation with current repository paths

**Issue:** `tests/integration/README.md` states SQL-injection fixes are in `src/repositories/baseRepository.js` and `src/repositories/networkRepository.js`, but current files are under `server/src/repositories/*.ts`.

**Why this matters:** The README describes outdated paths and language, reducing trust in docs and slowing onboarding.

**Suggested task:**

- Replace stale `.js`/`src/` references with current `server/src/repositories/baseRepository.ts` and `server/src/repositories/networkRepository.ts` paths.
- Quickly scan the rest of the file for additional stale module references.

---

## 4) Test Improvement Task

**Title:** Replace tautological “CONCLUSION” unit test with behavior assertions

**Issue:** `tests/unit/observationCountMin-investigation.test.ts` contains a test that only asserts `expect(true).toBe(true)`.

**Why this matters:** This test cannot catch regressions and inflates confidence without validating behavior.

**Suggested task:**

- Remove the tautological test.
- Replace it with assertions that verify meaningful behavior (for example, whether `observationCountMin` is ignored/applied in expected query modes and appears in `appliedFilters`/SQL as appropriate).
