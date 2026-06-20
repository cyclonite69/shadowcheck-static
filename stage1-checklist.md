# Stage 1 Checklist — Role Locks & Characterization Tests

This file tracks the status of Stage 1 (Role Locks & Characterization Tests) targets identified in the architecture roadmap.

---

## Sequencing Contract

`Role locks → Pure extraction → Side-effect isolation → SQL split → Cruft removal`

---

## Batch A — Policy-Failure Fixes (6 Files)

- [x] `server/src/utils/routeMounts.ts` — maxFunctionLines 125/140 (OK)
- [x] `client/src/components/admin/tabs/ConfigurationTab.tsx` — lineCount 192/220 (OK)
- [x] `client/src/components/admin/hooks/useGeocodingCache.ts` — maxFunctionLines 155/160 (OK)
- [x] `client/src/components/GeospatialExplorer.tsx` — **Extraction Deferred to Stage 2** (Characterization lock test written and passing in `tests/unit/GeospatialExplorer.test.ts`)
- [x] `server/src/services/geocodingCacheService.ts` — maxFunctionLines 110/150 (OK)
- [x] `server/src/api/routes/v1/admin/wigle/ledger.ts` — **SQL Split Deferred to Stage 4** (Role locked; existing service/route unit tests verified passing)

---

## Batch B — Dependency Injection Backbone (In Progress/Next)

- [ ] `server/src/config/container.ts`
- [ ] `server/src/utils/serverDependencies.ts`
- [ ] `tests/unit/utils/serverDependencies.test.ts`

---

## Batch C — Core Route Handler & API Client Locks (Unstarted)

- [ ] `server/src/api/routes/v1/admin/detectionEvidence.ts`
- [ ] `server/src/api/routes/v1/health.ts`
- [ ] `server/src/api/routes/v1/wigle/detail.ts`
- [ ] `client/src/api/adminApi.ts`
- [ ] `client/src/api/networkApi.ts`
- [ ] `client/src/api/wigleApi.ts`

---

## Batch D — Geolocation & Map Hook Locks (Unstarted)

- [ ] `client/src/components/geospatial/hooks/useGeospatialExplorerState.ts`
- [ ] `client/src/components/geospatial/hooks/useMapLayers.ts`
- [ ] `client/src/components/geospatial/hooks/useMapLayersToggle.ts`
- [ ] `client/src/components/geospatial/hooks/useMapStyleControls.ts`
- [ ] `client/src/components/geospatial/hooks/useNetworkContextMenu.ts`
- [ ] `client/src/components/geospatial/hooks/useNetworkNotes.ts`
- [ ] `client/src/components/geospatial/hooks/useSiblingLinks.ts`
- [ ] `client/src/components/geospatial/hooks/useSummaryLayers.ts`
- [ ] `client/src/components/geospatial/hooks/useWigleLayers.ts`

---

## Batch E — Core Tab & Component Locks (Unstarted)

- [ ] `client/src/components/WiglePage.tsx`
- [ ] `client/src/components/admin/tabs/WigleSearchTab.tsx`
- [ ] `client/src/components/admin/tabs/WigleDetailTab.tsx`
- [ ] `client/src/components/admin/tabs/DbStatsTab.tsx`
- [ ] `client/src/components/admin/tabs/ApiTestingTab.tsx`
- [ ] `client/src/components/admin/tabs/AwsTab.tsx`
- [ ] `client/src/components/admin/tabs/BadgeStudioTab.tsx`
- [ ] `client/src/components/admin/tabs/UsersTab.tsx`
- [ ] `client/src/components/admin/tabs/SigintLibraryTab.tsx`
- [ ] `client/src/components/admin/tabs/data-import/KmlImportCard.tsx`
- [ ] `client/src/components/admin/tabs/data-import/OrphanNetworksPanel.tsx`
- [ ] `client/src/components/admin/tabs/data-import/V3EnrichmentManagerTable.tsx`
- [ ] `client/src/components/admin/components/WigleRunsCard.tsx`

---

## Batch F — Other Services & Auxiliary Module Locks (Unstarted)

- [ ] `client/src/components/visint/VisIntUploader.tsx`
- [ ] `client/src/components/DashboardPage.tsx`
- [ ] `client/src/components/AdminPage.tsx`
- [ ] `client/src/components/StartPage.tsx`
- [ ] `client/src/components/Navigation.tsx`
- [ ] `client/src/constants/network.ts`
- [ ] `client/src/hooks/useNetworkData.ts`
- [ ] `client/src/hooks/useObservations.ts`
- [ ] `client/src/stores/filterStore.ts`
