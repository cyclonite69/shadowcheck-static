# Architectural Modularity Refactor Roadmap (2026-05-28)

This document presents a staged, safe, and incremental refactor roadmap for the `shadowcheck-web` platform, aligning codebase structures with their architectural roles.

---

## Staged Refactor Execution Plan

```
Stage 1 (Role Locks) ──> Stage 2 (Extract Decision Logic) ──> Stage 3 (Isolate DB Mutators) ──> Stage 4 (Split SQL Sieve) ──> Stage 5 (Documentation)
```

---

### Stage 1: Role Locks & Characterization Tests

- **Goal**: Establish strict baseline characterization tests to lock down active behavior of sibling-detection rules, candidate maps, and hook data hydration.
- **Likely Files**:
  - `tests/integration/findSiblingRadios.test.ts`
  - `tests/unit/useSiblingLinks.test.ts`
  - `tests/unit/surveillanceDetectionRepository.test.ts`
- **Risk Level**: **Low**. No source code is modified.
- **Prerequisite Tests**: All unit tests (`npm test`).
- **Verification Commands**:
  - `RUN_INTEGRATION_TESTS=true npx jest tests/integration/findSiblingRadios.test.ts --no-coverage`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm test -- --no-coverage`
- **Rollback Strategy**: Git checkout modified tests.
- **Expected Outcome**: absolute locks protecting sequential matching logic, Mist rules, Cisco enterprise rules, and Cradlepoint MAC parity constraints.

---

### Stage 2: Extract Pure Decision Logic

- **Goal**: Extract graph traversal and parsing out of hooks (`useSiblingLinks.ts`) and scoring algorithms out of template strings (`siblingDetectionQueries.ts`) into pure, testable helper functions.
- **Likely Files**:
  - `client/src/components/geospatial/hooks/useSiblingLinks.ts` $\rightarrow$ `client/src/components/geospatial/utils/siblingGroupGraph.ts`
  - `server/src/services/admin/siblingDetectionQueries.ts`
- **Risk Level**: **Low**. High safety due to isolated characterization tests.
- **Prerequisite Tests**: Stage 1 characterization locks.
- **Verification Commands**:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm test -- --no-coverage`
- **Rollback Strategy**: Git revert pure helper extraction commits.
- **Expected Outcome**: Sibling graph algorithms and scoring equations live in isolated helper files with zero React state side effects.

---

### Stage 3: Isolate DB-Mutation Side Effects (Deferred / Risky)

- **Goal**: Extract Connected Component sequential rules pruning and hardware size limit deletes out of `SiblingDetectionOrchestrator.ts` into a transaction-bounded service.
- **Likely Files**:
  - `server/src/services/admin/siblingDetection/orchestrators/SiblingDetectionOrchestrator.ts` $\rightarrow$ `SiblingPruningService.ts`
- **Risk Level**: **High**. Deletes rows dynamically from the database. Requires careful integration checks to prevent database locks or data loss.
- **Prerequisite Tests**: Stage 1 integration rules locks.
- **Verification Commands**:
  - `RUN_INTEGRATION_TESTS=true npx jest tests/integration/findSiblingRadios.test.ts --no-coverage`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm test -- --no-coverage`
- **Rollback Strategy**: Restore original orchestrator database transaction deletes.
- **Expected Outcome**: Clean coordinator execution; batch cursor loop runs safely and delegates database sweeps to transaction-controlled pruning services.

---

### Stage 4: Split SQL Sieve (Deferred / Risky)

- **Goal**: Break down the monolithic stored function `app.find_sibling_radios` into separate, isolated vendor SQL rules.
- **Likely Files**:
  - `sql/migrations/`
  - `sql/functions/`
- **Risk Level**: **High**. Changes live database classification rules directly. Requires extreme care and extensive mock data validation.
- **Prerequisite Tests**: Stage 1 integration rules locks.
- **Verification Commands**:
  - `RUN_INTEGRATION_TESTS=true npx jest tests/integration/findSiblingRadios.test.ts --no-coverage`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm test -- --no-coverage`
- **Rollback Strategy**: Reapply migration 021 DDL structure.
- **Expected Outcome**: Highly maintainable database stored rules; Cradlepoint fleet MAC parity, Mist same-band rules, and Cisco quad rules live in readable SQL helper functions.

---

### Stage 5: Update Docs to Reflect Actual Roles

- **Goal**: Archive historical design docs and update ADRs to align with modular services.
- **Likely Files**:
  - `docs/DATABASE_RADIO_ARCHITECTURE.md`
  - `docs/adr/ADR-SIBLING-DETECTION-V2.md`
  - `docs/ai/sessions/ACTIVE.md`
- **Risk Level**: **Low**. No application code is changed.
- **Prerequisite Tests**: None.
- **Verification Commands**: None.
- **Rollback Strategy**: Git checkout docs files.
- **Expected Outcome**: Accurate developer onboarding guides, schema documents, and architectural records.
