# Architectural Modularity & Coupling Audit (2026-05-28)

This document provides a detailed structural assessment of the `shadowcheck-web` repository, evaluating modules based on their intended architectural roles, responsibility boundaries, side effects, and coupling profiles.

---

## 1. Executive Summary

This modularity audit assesses the repository's modules by their architectural roles rather than arbitrary line-count thresholds.

Key structural findings:

- **Embedded Rule Engines**: The `siblingDetectionQueries.ts` query builder contains advanced business rule scoring equations, including fuzzy matches and partner/family count penalties.
- **Domain Leaks in Repositories**: The `surveillanceDetectionRepository.ts` data access file hardcodes specific Law Enforcement and SIGINT manufacturer BSSID/OUI lists, coupling query syntax to business rules.
- **Overloaded State Coordinators**: The frontend hook `useGeospatialExplorerState.ts` aggregates 23 separate hooks. Any failure within style loading, geocoder, or sub-hooks creates a high blast-radius coordinator that affects the overall explorer panel layout.
- **Graph Algorithms in UI Hooks**: `useSiblingLinks.ts` implements adjacent-edge graph traversal algorithms directly within a hook intended for chunked asynchronous row hydration.
- **Obsolete Database Stored Logic**: `sql/functions/refresh_network_sibling_pairs_v3.sql` remains in the source tree but is no longer executed by any service runner.

---

## 2. Role Classification Matrix

The major modules are classified below by their architectural roles, evaluating whether each file complies with its role definition.

| File Path / Module                                      | Intended Architectural Role   | Responsibility Purity | Side-Effect Profile                                                                                      | Coupling Profile                                                                               | Role Compliance Verdict                                                                                                     |
| ------------------------------------------------------- | ----------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `SiblingDetectionOrchestrator.ts`                       | **Orchestrator**              | Medium                | Inserts/updates `sibling_runs`; updates `network_sibling_pairs`; deletes sequential component overflows. | Couples to query templates, state managers, and database query adapters.                       | **Partial Compliance**: Overloaded with transaction-bound Connected Component sequential rules pruning logic.               |
| `app.find_sibling_radios` (Function)                    | **Rule Engine**               | Medium                | None (Declared `STABLE` function).                                                                       | Direct dependencies on `app.networks` table schema.                                            | **Partial Compliance**: Acts as a monolithic SQL rules registry; combining Cradlepoint, Mist, and Cisco rules in one block. |
| `siblingDetectionQueries.ts`                            | **Query Builder**             | Low                   | None (Returns SQL strings).                                                                              | Imports penalty constants and OUI groupings lists.                                             | **Violation**: Implements complex business rule scoring equations inside raw SQL template strings.                          |
| `surveillanceDetectionRepository.ts`                    | **Repository**                | Low                   | None (Executes read queries).                                                                            | Hardcodes direct strings matching Axon, ShotSpotter, and Flock Safety hardware signatures.     | **Violation**: Houses hardware manufacturer OUI groupings instead of retrieving them from lookup tables.                    |
| `useGeospatialExplorerState.ts`                         | **Frontend Hook Coordinator** | Low                   | Propagates local state; controls sidebar panels; triggers geocoding map fly-tos.                         | Imports and calls 23 distinct sub-hooks, Mapbox gl Map references, and Zustand filter actions. | **Violation**: Acts as a high blast-radius coordinator; mixes UI configurations, map actions, and hydration links.          |
| `useSiblingLinks.ts`                                    | **Frontend Hook**             | Medium                | Executes chunked, paginated API requests to hydrate off-page sibling rows.                               | Couples to `networkApi`, `siblingGroupGraph`, and `siblingTopologyDebug` utilities.            | **Violation**: Implements local graph-traversal adjacency algorithms inside a React asynchronous effect.                    |
| `20260528_prune_invalid_cradlepoint_fleet_siblings.sql` | **Cleanup Script**            | High                  | Deletes targeted invalid fleet pairs from `app.network_sibling_pairs`.                                   | Joined to live network tables using strict MAC parity logic.                                   | **High Compliance**: Properly transaction-bounded with default rollback.                                                    |
| `03_reference_radio_manufacturers.sql`                  | **Registry / Reference Data** | High                  | Seeds static OUI definitions in database table on build.                                                 | None.                                                                                          | **High Compliance**: Large file size (74,046 lines) is justified; contains static SQL seeds.                                |
| `findSiblingRadios.test.ts`                             | **Test Harness / Fixture**    | High                  | Pre-populates database test tables; mocks coordinates.                                                   | Depends on live test DB database pool query handlers.                                          | **High Compliance**: Large size (522 lines) is justified; acts as a test fixture.                                           |

---

## 3. Responsibility Purity & Architectural Boundary Audit

### 1. `SiblingDetectionOrchestrator`

- **Current Role**: Orchestrator/Coordinator.
- **Actual Responsibilities**:
  - Initializes runs tracking inside `app.sibling_runs`.
  - Runs the chunked cursor loop to fetch and upsert sibling pairs.
  - Enforces hardware size boundaries (dropping OUI/SSID cliques $\ge 17$).
  - Enforces 16-node sequential rule connected component ceilings.
  - Triggers post-job runs (refreshing OUI profiles and running `ANALYZE`).
- **Side Effects**:
  - Write: Inserts/updates `app.sibling_runs`.
  - Write: Bulk upserts `app.network_sibling_pairs`.
  - Write: Deletes sequential rules overflowing component edges.
- **Dependencies**: `logging/logger`, `siblingDetectionQueries.ts`, `siblingDetectionState.ts`, `extraRules.ts`, `adminQueryAdapter.ts`.
- **Modularity Assessment**: **Not fully modular**. An orchestrator should delegate operations to focused components. Embedding recursive graph-pruning SQL queries directly in the class method violates the separation of concerns.
- **Size Context**: 363 lines.
- **Recommended Action**: Extract connected components and hardware overflow ceiling pruning queries into `SiblingPruningService`.
- **Risk Level**: **Medium**. Pruning rules have complex recursive steps.
- **Tests Required Before Refactoring**: `tests/unit/siblingDetectionAdminService.test.ts` and integration checks.

---

### 2. `app.find_sibling_radios` Stored SQL Function

- **Current Role**: Rule Engine.
- **Actual Responsibilities**:
  - Identifies sibling candidate radios matching spatial, frequency, and octet constraints.
  - Classifies candidates into rules (Cradlepoint MAC parity, Mist, Cisco, AirLink, Sierra).
- **Side Effects**: None.
- **Dependencies**: Database table structure of `app.networks`.
- **Modularity Assessment**: **Not fully modular**. The function operates as a monolithic SQL rules registry. It groups Mist, Cradlepoint fleet, and Cisco quad-radio rules in a single `CASE` statement.
- **Size Context**: 234 lines.
- **Recommended Action**: Break down vendor classification rules into separate inline table-valued SQL functions, making the main function a thin routing wrapper.
- **Risk Level**: **High**. Regressions can disrupt baseline sibling detection accuracy.
- **Tests Required Before Refactoring**: `tests/integration/findSiblingRadios.test.ts` (Mist, Cisco, AirLink, Sierra, and Cradlepoint integration fixtures).

---

### 3. `siblingDetectionQueries.ts`

- **Current Role**: Query Builder.
- **Actual Responsibilities**:
  - Assembles parameterized SQL strings dynamically.
  - Applies forensic audit configurations (`pairAudit` CTEs).
  - Computes final scoring weights, SSID normalization, fuzzy match bonuses, and common partner penalties.
- **Side Effects**: None.
- **Dependencies**: `siblingDetectionConstants.ts`.
- **Modularity Assessment**: **Violation**. A query builder should only handle query compilation. Imbedding scoring equations, SSID regexp normalization, and partner penalty parameters (`PARTNER_PENALTY_VALUES`, `FAMILY_PENALTY_VALUES`) inside SQL string templates mixes business rule logic into string construction.
- **Size Context**: 364 lines.
- **Recommended Action**: Separate raw SQL structures from rules parameters. Pass scoring parameters as variables rather than hardcoding them in string templates.
- **Risk Level**: **Low**. Refactoring maintains the identical SQL execution path.
- **Tests Required Before Refactoring**: `tests/unit/siblingDetectionQueries.test.ts`.

---

### 4. `surveillanceDetectionRepository.ts`

- **Current Role**: Repository.
- **Actual Responsibilities**:
  - Executes queries to fetch surveillance candidates.
  - Compiles candidate statistics.
  - Houses massive hardcoded OUI lists and BLE manufacturer matching IDs.
- **Side Effects**: None.
- **Dependencies**: `pg` Pool helper, `surveillanceFilterPredicates`.
- **Modularity Assessment**: **Violation**. The repository operates as a domain classifier. It embeds law enforcement and camera vendor OUI groupings directly in query filter strings.
- **Size Context**: 463 lines.
- **Recommended Action**: Move the static OUI groups and BLE manufacturer profiles to a dedicated lookup database table (`app.oui_grouping`).
- **Risk Level**: **Medium**. Changes can affect threat score calculations.
- **Tests Required Before Refactoring**: `tests/unit/mlModelScoring.test.ts`.

---

### 5. `useGeospatialExplorerState.ts`

- **Current Role**: Frontend Hook Coordinator.
- **Actual Responsibilities**:
  - Declares map heights, styles, and building visibility state.
  - Synchronizes search inputs to Zustand filters.
  - Calls geocoding API triggers.
  - Tracks manual sibling overrides and coordinates table sorting.
- **Side Effects**: Updates global filter state and coordinates Mapbox map zooms.
- **Dependencies**: 23 composable sub-hooks, Zustand filters store.
- **Modularity Assessment**: **Violation**. The hook coordinator acts as a high blast-radius coordinator. It mixes Mapbox events, local state variables, search handlers, and sibling overrides instead of delegating to thin, decoupled sub-hooks.
- **Size Context**: 535 lines.
- **Recommended Action**: Modularize the coordinator by extracting separate hooks: `useRadiusFilter.ts`, `useMapPreferences.ts`, and `useQuickSearch.ts`.
- **Risk Level**: **Medium**. Can cause map initialization or rendering failures.
- **Tests Required Before Refactoring**: Full frontend build compilation (`npm run build:frontend`).

---

### 6. `useSiblingLinks.ts`

- **Current Role**: Frontend Hook.
- **Actual Responsibilities**:
  - Coordinates quickSearch prefix parameters.
  - Normalizes BSSIDs.
  - Traverses adjacency lists to build sibling component group maps.
  - Initiates chunked batch API requests to hydrate off-page sibling rows.
  - Handles unresolved search, missing DB, and non-renderable BSSID arrays.
- **Side Effects**: Hydrates grid tables via chunked asynchronous requests.
- **Dependencies**: `networkApi.ts`, `siblingGroupGraph.ts`, `siblingTopologyDebug.ts`.
- **Modularity Assessment**: **Violation**. Implements complex business graph algorithms directly in a React effect loop, making it difficult to test graph construction in isolation from the React rendering engine.
- **Size Context**: 475 lines.
- **Recommended Action**: Move BSSID normalization and graph edge building (`addUndirectedEdge`, `buildSiblingGroupMap`) to `client/src/components/geospatial/utils/siblingGroupGraph.ts` with direct unit test coverage.
- **Risk Level**: **Low**. Covered by extensive unit tests.
- **Tests Required Before Refactoring**: `tests/unit/useSiblingLinks.test.ts` (uses Node require mocks to test the hook).

---

### 7. `sql/scripts/` Cleanups

- **Current Role**: Operational / Cleanup Script.
- **Actual Responsibilities**:
  - Performs transaction-bounded, targeted database cleanup operations.
  - Outputs pre-cleanup candidate rows and post-cleanup counts.
- **Side Effects**: Targeted deletes on `app.network_sibling_pairs`.
- **Dependencies**: Joins network tables and sibling pairs.
- **Modularity Assessment**: **High Compliance**. Intended as a one-off database maintenance runner. Its structure is review-first and transaction-bounded (defaults to `ROLLBACK`), preventing unintended data mutation.
- **Size Context**: 125 lines.
- **Recommended Action**: Keep as is. Execute only after manual review of candidates.
- **Risk Level**: **Low** (Defaults to rollback).
- **Tests Required Before Execution**: Staged dry-runs.

---

## 4. Modularity Risk Register

| Risk Identification                 | Affected Files / Modules             | Severity   | Architecture Impact                                                                           | Direct Evidence                                 | Recommended Action                                                     |
| ----------------------------------- | ------------------------------------ | ---------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| **Graph Pruning in Orchestrator**   | `SiblingDetectionOrchestrator.ts`    | **HIGH**   | Sequential rules prune queries could hit recursion limits, failing the background job midway. | `SiblingDetectionOrchestrator.ts:211-306`       | Extract pruning logic into `SiblingPruningService`.                    |
| **Monolithic Stored Rules Sieve**   | `app.find_sibling_radios`            | **MEDIUM** | Changes to Cradlepoint fleet rules risk breaking Mist or Cisco enterprise rules.              | `20260528_021_cradlepoint_fleet_mac_parity.sql` | Modularize by splitting vendor-specific rules into separate functions. |
| **Domain Logic Leak in Repository** | `surveillanceDetectionRepository.ts` | **MEDIUM** | Hardcoded OUI groups prevent dynamic updates to law enforcement signatures.                   | `surveillanceDetectionRepository.ts:3-67`       | Move OUI groups to `app.oui_grouping` lookup table.                    |
| **Overloaded Hook State**           | `useGeospatialExplorerState.ts`      | **HIGH**   | A failure in a sub-hook blocks the entire explorer layout initialization.                     | `useGeospatialExplorerState.ts:85-125`          | Split into small composable hook units.                                |
| **Graph Traversal in Effect Loop**  | `useSiblingLinks.ts`                 | **MEDIUM** | Makes graph traversal algorithms hard to test in isolation from the React engine.             | `useSiblingLinks.ts:139-205`                    | Move traversal to `siblingGroupGraph.ts`.                              |

---

## 5. Categorization Matrix (A/B/C/D/E)

### A. Confirmed Role Violations

- **`siblingDetectionQueries.ts`**: Owns business rule scoring equations (SSID fuzzy match bonuses, common partner penalties) inside raw SQL template strings.
- **`surveillanceDetectionRepository.ts`**: Houses hardcoded law enforcement and camera vendor OUI groupings directly inside query filters.
- **`useGeospatialExplorerState.ts`**: An overgrown hook coordinator that acts as a high blast-radius coordinator by managing local variables, styles, map controls, and geocoder fly-to maps.
- **`useSiblingLinks.ts`**: Houses adjacent-edge graph traversal algorithms inside a hook responsible for UI data hydration.

### B. Large-but-Legitimate Files

- **`03_reference_radio_manufacturers.sql`** (74,046 lines): The size is completely justified; it contains static SQL seeds for radio manufacturers.
- **`findSiblingRadios.test.ts`** (522 lines): The size is justified; it acts as a test fixture containing comprehensive integration mock setups.
- **`20260528_prune_invalid_cradlepoint_fleet_siblings.sql`** (125 lines): Highly compliant operational cleanup script; properly transaction-gated with default rollback.

### C. Suspected Mixed-Responsibility Files Needing Deeper Review

- **`WiglePage.tsx`** (545 lines): Integrates Mapbox GL events, coordinates search states, and invokes multiple overlays in a single presentation component. Needs review to split map configurations from UI layouts.
- **`adminOrphanNetworksService.ts`** (322 lines): Directly imports `wigleDetailService` instead of using the container, bypassing the DI boundary.
- **`sql/functions/refresh_network_sibling_pairs_v3.sql`**: Candidate for archival/removal after verifying migration history, deployment scripts, and any manual DBA/runbook references.

### D. Safe First Refactors

- **Extract Graph Helpers from `useSiblingLinks.ts`**: Move BSSID normalization and graph edge building (`addUndirectedEdge`, `buildSiblingGroupMap`) to `siblingGroupGraph.ts` with direct unit test coverage. High safety due to excellent unit tests in `useSiblingLinks.test.ts`.

### E. Risky Refactors to Defer

- **Modularizing `app.find_sibling_radios`**: Splitting the stored function into separate vendor-specific helper functions. Requires extreme care and live integration tests to prevent regression in sequential rules.
- **Pruning Extraction from `SiblingDetectionOrchestrator`**: Splitting Connected Component deletes into a separate service requires careful database transaction controls.
