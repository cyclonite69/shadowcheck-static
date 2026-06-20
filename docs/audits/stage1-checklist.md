# Stage 1 Checklist — Role Locks & Characterization Tests

This file tracks the status of Stage 1 (Role Locks & Characterization Tests) targets identified in the architecture roadmap.

---

## Sequencing Contract

`Role locks → Pure extraction → Side-effect isolation → SQL split → Cruft removal`

---

## Batch A — Policy-Failure Fixes (Completed)

- [x] `client/src/components/admin/hooks/useGeocodingCache.ts`
  - **Rationale:** maxFunctionLines is 167; configured threshold is 160. hook module exceeds: 167 largest function lines > 150.
  - **Required Verification:** `npm run policy:modularity; Add or identify focused characterization tests before refactoring.; npm run type-check`

- [x] `client/src/components/admin/tabs/ConfigurationTab.tsx`
  - **Rationale:** lineCount is 238; documented threshold is 220.
  - **Required Verification:** `npm run policy:modularity`

- [x] `client/src/components/GeospatialExplorer.tsx` — **Extraction Deferred to Stage 2** (Characterization lock test written and passing in `tests/unit/GeospatialExplorer.test.ts`)
  - **Rationale:** lineCount is 324; documented threshold is 300. Static fan-out is 21 internal modules. component module exceeds: 22 imports > 20; 301 largest function lines > 260.
  - **Required Verification:** `npm run policy:modularity; Add or identify focused characterization tests before refactoring.; npm run type-check`

- [x] `server/src/api/routes/v1/wigle/ledger.ts` — **SQL Split Deferred to Stage 4** (Role locked; existing service/route unit tests verified passing)
  - **Rationale:** Route module contains 2 SQL keyword occurrences. route module exceeds: 205 largest function lines > 140.
  - **Required Verification:** `npx jest tests/unit/services/wigleRequestLedger.test.ts --no-coverage --runInBand; npx jest tests/unit/wigleLedgerRoutes.test.ts --no-coverage --runInBand`

- [x] `server/src/services/geocodingCacheService.ts`
  - **Rationale:** maxExports is 9; configured threshold is 8. maxFunctionLines is 206; configured threshold is 150. service module exceeds: 206 largest function lines > 180.
  - **Required Verification:** `npm run policy:modularity; npx jest tests/unit/geocodingCacheService.test.ts --no-coverage --runInBand; npx jest tests/unit/services/geocodingCacheService.expanded.test.ts --no-coverage --runInBand`

- [x] `server/src/utils/routeMounts.ts`
  - **Rationale:** maxFunctionLines is 154; configured threshold is 140.
  - **Required Verification:** `npm run policy:modularity`

---

## Batch B — Dependency Injection & Orchestrator Backbone (In Progress / Next)

_DI backbone and high-leverage orchestration dependencies must be role locked before modularity refactors on service layers scale._

- [x] `server/src/config/container.ts`
  - **Rationale:** Static fan-out is 57 internal modules. other module exceeds: 57 imports > 18.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [x] `server/src/utils/serverDependencies.ts`
  - **Rationale:** Static fan-out is 37 internal modules. other module exceeds: 42 imports > 18.
  - **Required Verification:** `npx jest tests/unit/utils/serverDependencies.test.ts --no-coverage --runInBand`

- [x] `tests/unit/utils/serverDependencies.test.ts`
  - **Rationale:** Static fan-out is 38 internal modules. test module exceeds: 40 imports > 30.
  - **Required Verification:** `npx jest tests/unit/utils/serverDependencies.test.ts --no-coverage --runInBand`

- [x] `client/src/components/geospatial/hooks/useGeospatialExplorerState.ts`
  - **Rationale:** Static fan-out is 33 internal modules. hook module exceeds: 505 lines > 350; 36 imports > 15; 437 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [x] `client/src/components/WiglePage.tsx`
  - **Rationale:** Static fan-out is 34 internal modules. component module exceeds: 666 lines > 500; 38 imports > 20; 42 functions > 28; 616 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

---

## Batch C — Core Route Handler & API Client Locks (Unstarted)

_Locks down API clients and core query-heavy route modules._

- [x] `server/src/api/routes/v1/admin/detectionEvidence.ts`
  - **Rationale:** Route module contains 1 SQL keyword occurrences.
  - **Required Verification:** `npx jest tests/unit/detectionEvidenceRoutes.test.ts --no-coverage --runInBand`

- [x] `server/src/api/routes/v1/health.ts`
  - **Rationale:** Route module contains 1 SQL keyword occurrences.
  - **Required Verification:** `npx jest tests/integration/api/v1/health.test.ts --no-coverage --runInBand; npx jest tests/unit/health.test.ts --no-coverage --runInBand`

- [x] `server/src/api/routes/v1/wigle/detail.ts`
  - **Rationale:** Route module contains 1 SQL keyword occurrences.
  - **Required Verification:** `npx jest tests/integration/api/v1/wigleDetail.test.ts --no-coverage --runInBand; npx jest tests/unit/services/wigle/detail.test.ts --no-coverage --runInBand; npx jest tests/unit/services/wigleDetailService.test.ts --no-coverage --runInBand; npx jest tests/unit/services/wigleDetailTransforms.test.ts --no-coverage --runInBand`
  - **Note:** Mock-based test design of `tests/integration/api/v1/wigleDetail.test.ts` was identified as a unit test in integration clothing. Transitioning mock-integration routes to the DB-hitting integration runner environment is explicitly deferred to Stage 3.

- [ ] `client/src/api/adminApi.ts`
  - **Rationale:** other module exceeds: 69 functions > 28.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/api/networkApi.ts`
  - **Rationale:** other module exceeds: 29 functions > 28.
  - **Required Verification:** `npx jest tests/unit/geospatial/networkApiAuth401.test.ts --no-coverage --runInBand`

- [ ] `client/src/api/wigleApi.ts`
  - **Rationale:** other module exceeds: 36 functions > 28.
  - **Required Verification:** `npx jest tests/unit/services/wigleApi.test.ts --no-coverage --runInBand`

---

## Batch D — Geolocation & Map Hook Locks (Unstarted)

_Locks down geospatial analysis, mapping, and link-tracing hooks._

- [ ] `client/src/components/geospatial/hooks/useCoreObservationLayers.ts`
  - **Rationale:** hook module exceeds: 198 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/hooks/useMapLayers.ts`
  - **Rationale:** hook module exceeds: 407 lines > 350; 377 largest function lines > 150.
  - **Required Verification:** `npx jest tests/unit/useMapLayers.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/geospatial/hooks/useMapLayersToggle.ts`
  - **Rationale:** hook module exceeds: 274 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/hooks/useMapStyleControls.ts`
  - **Rationale:** hook module exceeds: 433 lines > 350; 401 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/hooks/useNetworkContextMenu.ts`
  - **Rationale:** hook module exceeds: 29 functions > 20; 318 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/hooks/useNetworkNotes.ts`
  - **Rationale:** hook module exceeds: 209 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/hooks/useSiblingLinks.ts`
  - **Rationale:** React hook contains graph/adjacency algorithm signals alongside hydration or effect coordination. hook module exceeds: 359 lines > 350; 21 functions > 20; 332 largest function lines > 150.
  - **Required Verification:** `npx jest tests/unit/useSiblingLinks.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/geospatial/hooks/useSummaryLayers.ts`
  - **Rationale:** hook module exceeds: 174 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/hooks/useWigleLayers.ts`
  - **Rationale:** hook module exceeds: 378 lines > 350; 27 functions > 20; 310 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

---

## Batch E — Core Tab & Component Locks (Unstarted)

_Locks down tab layouts, UI modal controls, and core frontend pages._

- [ ] `client/src/components/admin/components/WigleRunsCard.tsx`
  - **Rationale:** component module exceeds: 618 lines > 500; 37 functions > 28; 408 largest function lines > 260.
  - **Required Verification:** `npx jest tests/unit/wigleRunsCardJurisdiction.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/admin/tabs/ApiTestingTab.tsx`
  - **Rationale:** component module exceeds: 590 lines > 500; 524 largest function lines > 260.
  - **Required Verification:** `npx jest tests/unit/apiTestingTabSafety.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/admin/tabs/AwsTab.tsx`
  - **Rationale:** component module exceeds: 271 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/tabs/BadgeStudioTab.tsx`
  - **Rationale:** component module exceeds: 47 functions > 28; 347 largest function lines > 260.
  - **Required Verification:** `npx jest tests/unit/badgeStudioTabMarkup.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/admin/tabs/data-import/ImportHistory.tsx`
  - **Rationale:** component module exceeds: 29 functions > 28.
  - **Required Verification:** `npx jest tests/unit/importHistoryStatusMeta.test.ts --no-coverage --runInBand; npx jest tests/unit/services/adminImportHistoryService.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/admin/tabs/data-import/KmlImportCard.tsx`
  - **Rationale:** component module exceeds: 510 lines > 500.
  - **Required Verification:** `npx jest tests/unit/kmlImportCard.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/admin/tabs/data-import/OrphanNetworksPanel.tsx`
  - **Rationale:** component module exceeds: 40 functions > 28; 437 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/tabs/data-import/V3EnrichmentManagerTable.tsx`
  - **Rationale:** component module exceeds: 720 lines > 500; 56 functions > 28; 566 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/tabs/DbStatsTab.tsx`
  - **Rationale:** component module exceeds: 881 lines > 500; 42 functions > 28; 820 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/tabs/SigintLibraryTab.tsx`
  - **Rationale:** component module exceeds: 307 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/tabs/UsersTab.tsx`
  - **Rationale:** component module exceeds: 261 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/tabs/WigleDetailTab.tsx`
  - **Rationale:** component module exceeds: 704 lines > 500; 655 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/tabs/WigleSearchTab.tsx`
  - **Rationale:** component module exceeds: 863 lines > 500; 48 functions > 28; 776 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/AdminPage.tsx`
  - **Rationale:** Static fan-out is 21 internal modules. component module exceeds: 22 imports > 20.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/DashboardPage.tsx`
  - **Rationale:** component module exceeds: 382 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/modals/NetworkNoteModal.tsx`
  - **Rationale:** component module exceeds: 516 lines > 500; 488 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/networkTable/cellRenderers.tsx`
  - **Rationale:** component module exceeds: 691 lines > 500; 33 functions > 28.
  - **Required Verification:** `npx jest tests/unit/networkTableCellRenderers.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/geospatial/table/NetworkTableBodyGrid.tsx`
  - **Rationale:** component module exceeds: 32 functions > 28; 396 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/modals/NetworkTimeFrequencyModal.tsx`
  - **Rationale:** component module exceeds: 32 functions > 28; 409 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/StartPage.tsx`
  - **Rationale:** component module exceeds: 279 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

---

## Batch F — Other Services & Auxiliary Module Locks (Unstarted)

_Long-tail services, utilities, ETL scripts, and remaining files._

- [ ] `client/src/components/admin/hooks/useApiTesting.ts`
  - **Rationale:** hook module exceeds: 354 lines > 350; 329 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/hooks/useConfiguration.ts`
  - **Rationale:** hook module exceeds: 484 lines > 350; 36 functions > 20; 443 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/hooks/useDataImport.ts`
  - **Rationale:** hook module exceeds: 157 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/admin/hooks/useWigleSearch.ts`
  - **Rationale:** hook module exceeds: 280 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/analytics/components/AnalyticsCharts.tsx`
  - **Rationale:** component module exceeds: 542 lines > 500; 442 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/analytics/hooks/useCardLayout.ts`
  - **Rationale:** hook module exceeds: 174 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/badgeStudio/useBadgeConfigs.ts`
  - **Rationale:** hook module exceeds: 24 functions > 20.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/networkTagMenu/DetectionEvidenceModal.tsx`
  - **Rationale:** component module exceeds: 355 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/geospatial/utils/siblingGroupGraph.ts`
  - **Rationale:** other module exceeds: 37 functions > 28.
  - **Required Verification:** `npx jest tests/unit/siblingGroupGraph.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/hooks/useAgencyOffices.ts`
  - **Rationale:** hook module exceeds: 351 lines > 350; 21 functions > 20; 161 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/hooks/useFederalCourthouses.ts`
  - **Rationale:** hook module exceeds: 417 lines > 350; 25 functions > 20; 187 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/Navigation.tsx`
  - **Rationale:** component module exceeds: 267 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/visint/VisIntUploader.tsx`
  - **Rationale:** component module exceeds: 857 lines > 500; 33 functions > 28; 807 largest function lines > 260.
  - **Required Verification:** `npx jest tests/unit/visintUploaderApiPath.test.ts --no-coverage --runInBand`

- [ ] `client/src/components/wigle/mapHandlers.ts`
  - **Rationale:** other module exceeds: 230 largest function lines > 200.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/wigle/useWigleMapInit.ts`
  - **Rationale:** hook module exceeds: 151 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/components/wigle/WigleLedgerPanel.tsx`
  - **Rationale:** component module exceeds: 289 largest function lines > 260.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/constants/network.ts`
  - **Rationale:** Static fan-in is 34 modules with 15 exports. other module exceeds: 568 lines > 500.
  - **Required Verification:** `npx jest tests/integration/api/v1/networks.test.ts --no-coverage --runInBand; npx jest tests/integration/networkMediaEndpoint.test.ts --no-coverage --runInBand; npx jest tests/integration/networks-data-integrity.test.ts --no-coverage --runInBand; npx jest tests/property/networking/repository.test.ts --no-coverage --runInBand`

- [ ] `client/src/hooks/useKeplerDeck.ts`
  - **Rationale:** hook module exceeds: 31 functions > 20; 302 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/hooks/useNetworkData.ts`
  - **Rationale:** hook module exceeds: 21 functions > 20; 190 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/hooks/useObservations.ts`
  - **Rationale:** hook module exceeds: 151 largest function lines > 150.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/stores/filterStore.ts`
  - **Rationale:** store module exceeds: 601 lines > 450; 43 functions > 24; 331 largest function lines > 180.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `client/src/utils/geospatial/renderNetworkTooltip.ts`
  - **Rationale:** other module exceeds: 614 lines > 500; 405 largest function lines > 200.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `etl/load/fbi-locations.ts`
  - **Rationale:** etl module exceeds: 858 lines > 700; 38 functions > 35.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `etl/transform/process-agencies.ts`
  - **Rationale:** etl module exceeds: 288 largest function lines > 240.
  - **Required Verification:** `npx jest tests/unit/etl/transform/process-agencies.test.ts --no-coverage --runInBand`

- [ ] `scripts/audit/api-route-audit.ts`
  - **Rationale:** script module exceeds: 1134 lines > 700; 85 functions > 35.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `scripts/db-audit/generate-audit-report.js`
  - **Rationale:** script module exceeds: 902 lines > 700; 46 functions > 35.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `scripts/enrichment/enrich-multi-source.ts`
  - **Rationale:** script module exceeds: 42 functions > 35.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `scripts/enrichment/enrichment-system.ts`
  - **Rationale:** script module exceeds: 42 functions > 35.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `scripts/generate-coverage-report.js`
  - **Rationale:** script module exceeds: 37 functions > 35.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `server/src/api/routes/v1/admin.ts`
  - **Rationale:** Static fan-out is 24 internal modules. route module exceeds: 29 imports > 15.
  - **Required Verification:** `npx jest tests/integration/api/v1/admin.test.ts --no-coverage --runInBand; npx jest tests/integration/api/v1/adminManagement.test.ts --no-coverage --runInBand; npx jest tests/unit/admin/networkTagCore.test.ts --no-coverage --runInBand; npx jest tests/unit/admin/networkTagOui.test.ts --no-coverage --runInBand`

- [ ] `server/src/api/routes/v1/admin/import/kml.js`
  - **Rationale:** route module exceeds: 180 largest function lines > 140.
  - **Required Verification:** `npx jest tests/unit/kmlImportCard.test.ts --no-coverage --runInBand; npx jest tests/unit/kmlImportUtils.test.ts --no-coverage --runInBand; npx jest tests/unit/repositories/kmlImportRepository.test.ts --no-coverage --runInBand; npx jest tests/unit/services/wigleKmlSyncService.test.ts --no-coverage --runInBand`

- [ ] `server/src/api/routes/v1/networks/observations.ts`
  - **Rationale:** route module exceeds: 514 lines > 350.
  - **Required Verification:** `npx jest tests/integration/api/v1/observations.test.ts --no-coverage --runInBand; npx jest tests/unit/api/routes/v1/networks/observations.test.ts --no-coverage --runInBand; npx jest tests/unit/api/routes/v1/wigle/observations.test.ts --no-coverage --runInBand; npx jest tests/unit/etl/load/sqlite/importObservations.test.ts --no-coverage --runInBand`

- [ ] `server/src/api/routes/v1/wigle/search.ts`
  - **Rationale:** route module exceeds: 415 lines > 350.
  - **Required Verification:** `npx jest tests/integration/api/v1/wigleSearch.test.ts --no-coverage --runInBand; npx jest tests/unit/services/wigleSearchCache.test.ts --no-coverage --runInBand; npx jest tests/unit/useQuickSearchFilterSync.test.ts --no-coverage --runInBand`

- [ ] `server/src/api/routes/v2/filteredHelpers.ts`
  - **Rationale:** route module exceeds: 363 lines > 350.
  - **Required Verification:** `npx jest tests/unit/filteredHelpers.test.ts --no-coverage --runInBand`

- [ ] `server/src/repositories/surveillanceDetectionRepository.ts`
  - **Rationale:** repository module exceeds: 332 largest function lines > 180.
  - **Required Verification:** `npx jest tests/integration/repositories/surveillanceDetectionRepository.test.ts --no-coverage --runInBand`

- [ ] `server/src/repositories/wigleQueriesRepository.ts`
  - **Rationale:** repository module exceeds: 453 lines > 450.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `server/src/services/admin/dataQualityAdminService.ts`
  - **Rationale:** Service contains 10 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/admin/dataQualityAdminService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/admin/importExportAdminService.ts`
  - **Rationale:** Service contains 6 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/admin/importExportAdminService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/admin/networkTagCore.ts`
  - **Rationale:** Service contains 21 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/admin/networkTagCore.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/admin/networkTagOui.ts`
  - **Rationale:** Service contains 14 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/admin/networkTagOui.test.ts --no-coverage --runInBand; npx jest tests/unit/repositories/adminNetworkTagOuiRepository.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/admin/networkTagsAdminService.ts`
  - **Rationale:** Service contains 8 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/admin/networkTagsAdminService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/admin/settingsAdminService.ts`
  - **Rationale:** Service contains 5 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/admin/settingsAdminService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/admin/siblingDetection/orchestrators/SiblingDetectionOrchestrator.ts`
  - **Rationale:** service module exceeds: 192 largest function lines > 180.
  - **Required Verification:** `Add or identify focused characterization tests before refactoring.; npm run type-check`

- [ ] `server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState.ts`
  - **Rationale:** Service contains 4 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/admin/siblingDetection/use-cases/reconcileSiblingState.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/admin/siblingDetection/use-cases/startSiblingRefresh.ts`
  - **Rationale:** Service contains 7 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/admin/siblingDetection/use-cases/startSiblingRefresh.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/adminDbStatsService.ts`
  - **Rationale:** Service contains 8 SQL keyword occurrences and direct query calls. service module exceeds: 212 largest function lines > 180.
  - **Required Verification:** `npx jest tests/unit/services/adminDbStatsService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/adminImportHistoryService.ts`
  - **Rationale:** Service contains 19 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/adminImportHistoryService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/adminMaintenanceService.ts`
  - **Rationale:** Service contains 5 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/adminMaintenanceService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/adminOrphanNetworksService.ts`
  - **Rationale:** Service contains 5 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/adminOrphanNetworksService.test.ts --no-coverage --runInBand; npx jest tests/unit/services/adminOrphanNetworksService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/adminSettingsService.ts`
  - **Rationale:** Service contains 8 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/adminSettingsService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/adminSiblingService.ts`
  - **Rationale:** Service contains 9 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/adminSiblingService.test.ts --no-coverage --runInBand; npx jest tests/unit/services/adminSiblingService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/adminUsersService.ts`
  - **Rationale:** Service contains 9 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/adminUsersService.test.ts --no-coverage --runInBand`

- [ ] `server/src/services/aiInsightsService.ts`
  - **Rationale:** Service contains 4 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/aiInsightsService.test.js --no-coverage --runInBand`

- [ ] `server/src/services/analytics/coreAnalytics.ts`
  - **Rationale:** Service contains 4 SQL keyword occurrences and direct query calls.
  - **Required Verification:** `npx jest tests/unit/services/analytics/coreAnalytics.test.ts --no-coverage --runInBand`
