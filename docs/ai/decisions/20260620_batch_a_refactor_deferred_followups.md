# Decision: Batch A Refactoring Deferred Follow-ups

**Date:** 2026-06-20

**Context:** During Stage 1 (Role Locks & Characterization Tests) of the modularity refactoring, certain refactoring tasks were identified as exceeding Stage 1 scope and were deferred to their appropriate later stages to preserve safety and testability.

---

## 1. Geospatial Overlays Hook Extraction (Stage 2)

- **Target Component:** `client/src/components/GeospatialExplorer.tsx`
- **Current State:** A structural characterization test was written and verified in `tests/unit/GeospatialExplorer.test.ts` to lock the component's markup and child routing without changing the code itself.
- **Modularity Violation:** `GeospatialExplorer.tsx` exceeds the 300 line-count threshold (currently 324 lines).
- **Decision:** Defer the extraction of the geospatial overlays hooks (specifically `useGeospatialOverlays`) to **Stage 2 (Pure Extraction)**.

---

## 2. WiGLE Request Ledger Query Relocation (Stage 4)

- **Target Route / Service:** `server/src/api/routes/v1/admin/wigle/ledger.ts` and `server/src/services/wigleRequestLedger.ts`
- **Current State:** Verified existing tests (`tests/unit/wigleLedgerRoutes.test.ts` and `tests/unit/services/wigleRequestLedger.test.ts`) are green. The file was left untouched (no SQL extraction occurred) to ensure Stage 1 locks current behavior first.
- **Modularity Violation:** Direct SQL query constructions (`buildEvtQuery` and `buildRunQuery`) are defined/executed inside the routing file.
- **Decision:** Defer the extraction and relocation of query logic to **Stage 4 (SQL Split)**, moving query definitions to `server/src/repositories/` and database operations to the corresponding service layer.
