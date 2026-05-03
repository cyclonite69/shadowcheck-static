# Active Workstreams — 2026-05-03

Update this file manually when handing off a task or starting a new session. Agents read it at session start to avoid stepping on in-progress work.

---

## Current Status

**In progress — 2026-05-03**: WiGLE Import Runs table fixes. Changes made, unit tests passing, lint/tsc clean. Pending: full unit-test run + commit approval.

### In-Progress: `fix(import-runs)` branch changes

| File                                                       | Change                                                                                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/services/wigleImport/runRepository.ts`         | Source filter (`NOT IN v3_manual/v3_batch/v3_auto`) in `listImportRuns`; new `deleteImportRun` fn; sort direction default fixed to ASC |
| `server/src/services/wigleImportRunService.ts`             | `deleteImportRun` imported and re-exported                                                                                             |
| `server/src/api/routes/v1/wigle/search.ts`                 | `DELETE /search-api/import-runs/:id` endpoint added                                                                                    |
| `client/src/api/wigleApi.ts`                               | `deleteImportRun()` client method added                                                                                                |
| `client/src/components/admin/hooks/useWigleRuns.ts`        | `deleteRun` action added                                                                                                               |
| `client/src/components/admin/components/WigleRunsCard.tsx` | TrashIcon + delete button (completed/cancelled/failed rows only); target cell shows search term only (no state prefix)                 |
| `client/src/components/admin/tabs/WigleSearchTab.tsx`      | `deleteRun` + sort props wired to WigleRunsCard                                                                                        |
| `client/src/config/apiTestEndpoints.ts`                    | Entry added for DELETE import run endpoint                                                                                             |

**Next step**: Run all unit tests (`npx jest --testPathPatterns="tests/unit" --globalSetup="" --globalTeardown=""`), then show diff + commit message for approval.

---

## Standing Rules (non-negotiable)

**Testing Requirements** (must pass before commit):

1. Run `npm run lint` — all files must pass ESLint
2. Run `npx tsc --noEmit` — no TypeScript errors
3. Run `npm test` — all tests must pass (or skip only with explicit justification)
4. **Behavior changes** require regression tests
5. **New features** require test coverage (70% threshold enforced)
6. **SQL changes** require JSDoc on query functions + schema docs update
7. **New endpoints** require entry in `client/src/config/apiTestEndpoints.ts`

---

## Recently Completed (this session — 2026-05-03)

| Task                                                       | Status |
| ---------------------------------------------------------- | ------ |
| Server-side sort for V3 enrichment catalog                 | ✅     |
| Server-side sort + pagination for orphan networks          | ✅     |
| Server-side sort + pagination for WiGLE import runs        | ✅     |
| Column chooser + sticky headers on all three tables        | ✅     |
| Orphan obs count display fix (reads observations_imported) | ✅     |
| Duplicate Recent Imports section removed from v3 tab       | ✅     |
| Enrichment phantom run source/version fix + migration      | ✅     |
| http_status logging on ledger events                       | ✅     |
| apiTestEndpoints entries for all new routes                | ✅     |
| JSDoc on all modified route handlers and repositories      | ✅     |
| Schema doc created for wigle_ledger_events                 | ✅     |

---

## Canonical Files & Standing Documentation

- **`client/src/config/apiTestEndpoints.ts`** — single source of truth for all API endpoint registry entries. Every new route MUST get an entry here before merge.
- **`docs/workflow/TESTING_STANDARDS.md`** — unified testing standards and requirements for all agents (new this session).
- **`AGENTS.md` § Testing Requirements** — codified testing gate before any commit (new this session).

---

## Recently Completed (prior sessions)

| Commit     | What shipped                                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —          | feat(admin-ui): V3 enrichment + orphan networks + import runs server-side sort, pagination, column chooser, sticky headers; obs count + phantom run fixes; ledger event http_status logging  |
| —          | feat(tooltip): add WiGLE source badge, local match badge, precision warning, pattern chips to shared renderNetworkTooltip; delete dead wigleTooltipNormalizer/Renderer files                 |
| —          | docs: full audit + enrichment — FILTERS.md pipe syntax, schema indexes/MVs/tables, API auth fix, Vite 8, admin tabs, DATABASE_RADIO_ARCHITECTURE warning, DATA_QUALITY_FILTERING orphan note |
| `4f88b3dd` | fix(tooltip): unify WiGLE observation popup to shared renderNetworkTooltip pipeline                                                                                                          |
| `ccbafab2` | feat: unify tooltip rendering across KML, WiGLE V2/V3, and Geospatial                                                                                                                        |
| `b056d6af` | docs(agents): add endpoint and query documentation standards to all three agent files                                                                                                        |
| `28c8136a` | docs(wigle): JSDoc on aggregated and extent route handlers + query builders                                                                                                                  |
| `c459fbfa` | feat(admin): API test tab data-driven via `client/src/config/apiTestEndpoints.ts`                                                                                                            |

---

## Refactor Backlog (Audit 2026-04-29)

All 10 items verified complete as of 2026-05-01.

| Priority | File                                             | Issue                             | Status                                              |
| -------- | ------------------------------------------------ | --------------------------------- | --------------------------------------------------- |
| 1        | client/src/components/admin/types/admin.types.ts | DEAD CODE                         | ✅ DONE — deleted                                   |
| 2        | server/src/api/routes/v1/wigle/utils.ts          | DEAD CODE + DUPLICATION           | ✅ DONE — deleted                                   |
| 3        | server/src/errors/AppError.ts                    | DEAD CODE                         | ✅ DONE — only 4 classes remain                     |
| 4        | 5 wigle service files                            | DUPLICATION (credential encoding) | ✅ DONE — canonical in wigleRequestUtils.ts         |
| 5        | server/src/services/v2Service.ts                 | ORCHESTRATOR CANDIDATE            | ✅ DONE — v2Types.ts + v2Repository.ts extracted    |
| 6        | server/src/services/exportService.ts             | REPOSITORY VIOLATION              | ✅ DONE — delegates to exportRepository             |
| 7        | server/src/services/mobileIngestService.ts       | REPOSITORY VIOLATION              | ✅ DONE — delegates to mobileIngestRepository       |
| 8        | server/src/services/keplerService.ts             | ORCHESTRATOR CANDIDATE            | ✅ DONE — keplerRepository.ts extracted             |
| 9        | server/src/api/routes/v1/wigle/search.ts         | THIN ROUTER VIOLATION             | ✅ DONE — getSavedSsidTerms() in wigleSearchService |
| 10       | server/src/api/routes/v1/settings.ts             | THIN ROUTER VIOLATION             | ✅ DONE — setAwsRegion() in adminSettingsService    |
