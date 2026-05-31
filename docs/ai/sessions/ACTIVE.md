# Active Workstreams — 2026-05-31

Update this file manually when handing off a task or starting a new session. Agents read it at session start to avoid stepping on in-progress work.

---

## Current Status

_No active workstreams. Decoupling hook logic (Gap 2), database-driven surveillance OUI refactoring (Gap 4), and VisINT pipeline extraction (Gap 1) successfully completed as of 2026-05-31._

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

## Recently Completed (this session — 2026-05-31)

| Task                                                                                 | Status |
| ------------------------------------------------------------------------------------ | ------ |
| VisINT auto-correlation pipeline (`d149d1ef`)                                        | ✅     |
| Flock Falcon new firmware fingerprint reverse-engineered and integrated              | ✅     |
| `exec()` → `execFile()` command injection hardening on all EXIF extraction paths     | ✅     |
| Forensic tooltip removal from OrphanNetworksPanel (`7c38dac7`)                       | ✅     |
| Decouple graph traversal / extract pure utils from useSiblingLinks (`72bd3dc7`)      | ✅     |
| Migration 031: Add surveillance OUI metadata and seed oui_device_groups (`e1d1318e`) | ✅     |
| Refactor surveillance query to use app.oui_device_groups lookup table (`24922d98`)   | ✅     |
| Decouple VisINT pipeline from observationService into services/visint/ (`cd972894`)  | ✅     |

---

## Open Backlog Items

- **UI Integration**: Wire `VisIntUploader` component into a dashboard tab/page (no entry point yet).
- **Forensic Visualization**: Add map representation/marker query for `VISINT_UNMATCHED` cellular ghost nodes.
- **Local Dev Configs**: Commit `.env.example`, `.gitignore`, `docker-compose.dev.yml`, and `local-dev-aliases.sh` as a separate, clean commit.
- **Sibling Verification**: Run/verify `20260528_prune_invalid_laa_vehicle_class_b_siblings.sql` against migration `030`, then commit sibling test changes separately.
- **Credential Rotation**: Verify Grafana credential rotation script (written, never executed on EC2).

---

## Recently Completed (prior session — 2026-05-03)

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
| `1b7b8e8a` | fix(import-runs): filter phantom enrichment rows, add delete action, strip state prefix from target cell; context loading order updated in all agent files                                   |
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
