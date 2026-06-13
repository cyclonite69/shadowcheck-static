# Coverage Report

- Generated: 2026-06-13T04:11:56.407Z
- Git SHA: `75076e60`
- Source: `coverage/coverage-summary.json`
- Coverage artifact modified: 2026-06-13T04:11:55.913Z
- Global threshold: 60% per metric

## Global Totals

| Metric     | Covered / Total | Actual | Threshold | Status |
| ---------- | --------------: | -----: | --------: | ------ |
| Statements |   14364 / 24543 | 58.52% |       60% | FAIL   |
| Branches   |    8165 / 15439 | 52.88% |       60% | FAIL   |
| Functions  |     2005 / 3723 | 53.85% |       60% | FAIL   |
| Lines      |   13953 / 23317 | 59.84% |       60% | FAIL   |

> Coverage totals reflect the collection scope of the source artifact. Layer aggregates are calculated from covered and total counters, not averages of file percentages.

## Layer Breakdown

### `etl/`

Files: 56

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |      449 / 3490 |   12.86% |
| Branches   |      243 / 2305 |   10.54% |
| Functions  |        75 / 545 |   13.76% |
| Lines      |      406 / 3201 |   12.68% |

| File                                                             |   Lines | Branches | Functions | Verdict   |
| ---------------------------------------------------------------- | ------: | -------: | --------: | --------- |
| `etl/load/fbi-field-offices-gov.ts`                              |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi-locations.ts`                                      |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi-offices.ts`                                        |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi-resident-agencies-foia.ts`                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi-resident-agencies-gov-legacy.ts`                   |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi-resident-agencies-gov.ts`                          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi-resident-agencies-public.ts`                       |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi-training-facilities.ts`                            |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi/importer.ts`                                       |   0.00% |  100.00% |     0.00% | UNCOVERED |
| `etl/load/fbi/loader.ts`                                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi/parser.ts`                                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi/scraper.ts`                                        |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi/transformer.ts`                                    |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/fbi/types.ts`                                          |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `etl/load/json-import.ts`                                        |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/kismet-import.ts`                                      |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/kml-import.ts`                                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/kmlImportUtils.ts`                                     |  86.00% |   72.34% |    76.92% | PARTIAL   |
| `etl/load/sqlite-import-incremental.ts`                          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/sqlite-import.ts`                                      |  83.07% |   66.66% |    70.00% | PARTIAL   |
| `etl/load/sqlite/cli.ts`                                         |  83.72% |   75.00% |    72.72% | PARTIAL   |
| `etl/load/sqlite/importObservations.ts`                          |  97.29% |   81.25% |   100.00% | COVERED   |
| `etl/load/sqlite/insertObservations.ts`                          |   8.82% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/sqlite/networkReconciliation.ts`                       |  19.56% |   13.33% |    11.11% | UNCOVERED |
| `etl/load/sqlite/preflight.ts`                                   |  82.05% |   73.33% |    60.00% | PARTIAL   |
| `etl/load/sqlite/reader.ts`                                      |  88.63% |   76.00% |   100.00% | PARTIAL   |
| `etl/load/sqlite/reporting.ts`                                   | 100.00% |   75.00% |   100.00% | PARTIAL   |
| `etl/load/sqlite/schemaSetup.ts`                                 |  20.00% |  100.00% |     0.00% | UNCOVERED |
| `etl/load/sqlite/sourceTag.ts`                                   |  82.85% |   63.63% |    75.00% | PARTIAL   |
| `etl/load/sqlite/types.ts`                                       |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `etl/load/sqlite/validateAndEnrich.ts`                           |  26.31% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/wigle/importer.ts`                                     |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/wigle/loader.ts`                                       |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/wigle/reader.ts`                                       |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/wigle/transformer.ts`                                  |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/wigle/types.ts`                                        |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `etl/loadEnv.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/promote/process-promotion.ts`                               |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/promote/refresh-mviews.ts`                                  |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/promote/run-scoring.ts`                                     |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/promote/validate-data.ts`                                   |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/repair/repair-missing-networks.ts`                          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/run-pipeline.ts`                                            |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/deduplicate.ts`                                   |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/enrich-agency-offices-coords-mapbox-forward.ts`   |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/enrich-agency-offices-coords-nominatim.ts`        |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/enrich-agency-offices-coords-opencage-forward.ts` |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/enrich-agency-offices-zip4-smarty.ts`             |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/enrich-geocoding.ts`                              |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/normalize-agency-offices-phone.ts`                |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/normalize-observations.ts`                        |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/process-agencies.ts`                              |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/process-observations.ts`                          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/utils/db.ts`                                                |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/utils/deadLetter.ts`                                        |  61.11% |   62.16% |    50.00% | PARTIAL   |
| `etl/utils/schemas.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |

### `scripts/`

Files: 50

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |       68 / 4508 |    1.50% |
| Branches   |       60 / 2554 |    2.34% |
| Functions  |        10 / 784 |    1.27% |
| Lines      |       67 / 4086 |    1.63% |

| File                                                       |  Lines | Branches | Functions | Verdict   |
| ---------------------------------------------------------- | -----: | -------: | --------: | --------- |
| `scripts/audit/api-route-audit.ts`                         |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/backup-sm-to-bitwarden.js`                        | 44.96% |   50.84% |    43.47% | PARTIAL   |
| `scripts/check-client-imports.ts`                          |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/check-modularity.js`                              |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/db-audit/generate-audit-report.js`                |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/debug-smarty-one.ts`                              |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-addresses-fast.ts`              |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-addresses-multi.ts`             |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-business-names.ts`              |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-multi-source.ts`                |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-overpass-optimized.ts`          |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrichment-system.ts`                  |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/generate-overpass-queries.ts`          |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/monitor-enrichment.ts`                 |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/forensic/siblingPairAuditBatch.ts`                |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/forensic/siblingPairAuditTargeted.ts`             |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/generate-coverage-report.js`                      |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/generate-password.ts`                             |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/generate-sitemap.js`                              |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/export-missing-geocodes.ts`             |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/geocode-addresses.ts`                   |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/geocode-batch.ts`                       |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/geocode-wigle.ts`                       |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-ap-addresses.ts`                 |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-final-geocodes.ts`               |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-geocodes.ts`                     |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-missing-geocodes.ts`             |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-network-addresses.ts`            |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/reverse-geocode-batch.ts`               |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/reverse-geocode-observations-sample.ts` |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/reverse-geocode-parallel.ts`            |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/reverse-geocode-smart.ts`               |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/import/import-wigle-parallel.ts`                  |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/loadEnv.ts`                                       |  0.00% |  100.00% |   100.00% | UNCOVERED |
| `scripts/manual-ingest.js`                                 |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/manual/run-geocoding-sample.ts`                   |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/ml/ml-logistic-regression.d.ts`                   |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/ml/ml-trainer.ts`                                 |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/rebuild-networks-precision.ts`                    |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/run_manufacturer_backfill.js`                     |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/run_targeted_siblings.js`                         |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/run-migration.ts`                                 |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/runSiblingRefreshTest.ts`                         |  0.00% |  100.00% |     0.00% | UNCOVERED |
| `scripts/score-all-hybrid.ts`                              |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/set-home.ts`                                      |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/test-smarty-us-street.ts`                         |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/trigger-report.js`                                |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/vendor-docs-extract.ts`                           |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/wigle-daemon.ts`                                  |  0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/write-robots.js`                                  |  0.00% |    0.00% |   100.00% | UNCOVERED |

### `server/src/api/routes/`

Files: 106

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     3147 / 4744 |   66.33% |
| Branches   |     1481 / 2718 |   54.48% |
| Functions  |       330 / 519 |   63.58% |
| Lines      |     3101 / 4670 |   66.40% |

| File                                                                |   Lines | Branches | Functions | Verdict   |
| ------------------------------------------------------------------- | ------: | -------: | --------: | --------- |
| `server/src/api/routes/v1/admin.ts`                                 |  81.31% |   66.66% |    33.33% | UNCOVERED |
| `server/src/api/routes/v1/admin/adminAwsHelpers.ts`                 |  28.12% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/adminGeocodingHelpers.ts`           |  98.14% |   77.96% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/adminNotesHelpers.ts`               |  53.73% |   27.65% |    57.14% | UNCOVERED |
| `server/src/api/routes/v1/admin/adminSecretsHelpers.ts`             |  50.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/aws.ts`                             |  25.00% |   11.11% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/awsInstances.ts`                    |  20.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/backup.ts`                          |  27.77% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/dbStats.ts`                         |  64.28% |   85.71% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/detectionEvidence.ts`               |  36.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/geocoding.ts`                       | 100.00% |   72.22% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import.ts`                          | 100.00% |   50.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/history.js`                  |  70.00% |   50.00% |    75.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/kml.js`                      |  91.54% |   78.94% |    83.33% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/orphans.js`                  |  90.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/import/sql.js`                      |  98.18% |   75.00% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/sqlite.js`                   | 100.00% |   76.47% |    54.54% | PARTIAL   |
| `server/src/api/routes/v1/admin/maintenance.ts`                     |  64.00% |  100.00% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/media.ts`                           |  41.30% |   30.00% |    25.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/notes.ts`                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/oui.ts`                             |  33.33% |  100.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/pgadmin.ts`                         |  28.20% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/secrets.ts`                         |  41.37% |   46.15% |    25.00% | UNCOVERED |
| `server/src/api/routes/v1/admin/settings.ts`                        |  78.03% |   63.29% |    88.23% | PARTIAL   |
| `server/src/api/routes/v1/admin/siblings.ts`                        |  97.50% |   72.41% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/tags.ts`                            |  25.37% |    9.67% |    16.66% | UNCOVERED |
| `server/src/api/routes/v1/admin/users.ts`                           |  22.03% |    0.00% |    20.00% | UNCOVERED |
| `server/src/api/routes/v1/agencyOffices.ts`                         |  77.77% |  100.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/analytics-public.ts`                      |  80.00% |   33.33% |   100.00% | UNCOVERED |
| `server/src/api/routes/v1/analytics.ts`                             |  98.55% |   62.50% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/auth.ts`                                  |  59.32% |   35.71% |    75.00% | UNCOVERED |
| `server/src/api/routes/v1/backup.ts`                                |  92.85% |   60.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/claude.ts`                                |  98.03% |   79.16% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/dashboard.ts`                             |  63.23% |   70.65% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/dataQuality.ts`                           |  36.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/deflockCameras.ts`                        |   0.00% |  100.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/explorer.ts`                              |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/api/routes/v1/explorer/index.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/explorer/networks.ts`                     |  75.75% |   64.51% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/explorer/shared.ts`                       |  98.98% |   98.64% |   100.00% | COVERED   |
| `server/src/api/routes/v1/export.ts`                                | 100.00% |   68.75% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/federalCourthouses.ts`                    |   0.00% |  100.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/geocoding.ts`                             |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/geospatial.ts`                            |  93.33% |   79.22% |    69.23% | PARTIAL   |
| `server/src/api/routes/v1/health.ts`                                |  86.48% |   67.64% |    69.23% | PARTIAL   |
| `server/src/api/routes/v1/home-location.ts`                         |  90.62% |   86.36% |   100.00% | COVERED   |
| `server/src/api/routes/v1/kepler.ts`                                |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/keplerHelpers.ts`                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/location-markers.ts`                      |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/ml.ts`                                    |  84.25% |   76.92% |    88.88% | PARTIAL   |
| `server/src/api/routes/v1/mobileIngest.ts`                          |  73.41% |   64.58% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/network-agencies.ts`                      |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/network-tags.ts`                          |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/api/routes/v1/network-tags/index.ts`                    |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/api/routes/v1/network-tags/listTags.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-tags/manageTags.ts`               |  87.36% |   90.56% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks.ts`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/index.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/handler.ts`                 |  91.66% |   50.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/networks/list/index.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parseParams.ts`             |  84.61% |   75.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/networks/list/parsers/networkIdentity.ts` |  52.17% |   20.93% |    40.00% | UNCOVERED |
| `server/src/api/routes/v1/networks/list/parsers/pagination.ts`      |  92.30% |   75.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/networks/list/parsers/signalFilters.ts`   |  65.38% |   37.50% |   100.00% | UNCOVERED |
| `server/src/api/routes/v1/networks/list/parsers/spatialFilters.ts`  |  84.21% |   81.81% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parsers/threatFilters.ts`   |  44.11% |   14.28% |    50.00% | UNCOVERED |
| `server/src/api/routes/v1/networks/manufacturer.ts`                 |  34.09% |   26.08% |    16.66% | UNCOVERED |
| `server/src/api/routes/v1/networks/notes.ts`                        |  51.06% |   33.33% |    50.00% | UNCOVERED |
| `server/src/api/routes/v1/networks/observations.ts`                 |  69.87% |   66.11% |    93.75% | PARTIAL   |
| `server/src/api/routes/v1/networks/search.ts`                       |  85.71% |   78.94% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/networks/tags.ts`                         |  95.55% |   84.21% |   100.00% | COVERED   |
| `server/src/api/routes/v1/settings.ts`                              |  75.67% |   44.44% |    66.66% | PARTIAL   |
| `server/src/api/routes/v1/settingsHelpers.ts`                       |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/settingsMultiSecretRoutes.ts`             |  80.80% |   61.70% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/settingsSecretRoutes.ts`                  |  89.65% |   70.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/shotspotterSensors.ts`                    |   0.00% |  100.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/shotspotterZones.ts`                      |   0.00% |  100.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/threat-report.ts`                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/threats.ts`                               |  78.78% |   83.33% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/wigle.ts`                                 |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/wigle/database.ts`                        |  67.62% |   58.20% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/wigle/detail.ts`                          |  32.75% |   22.85% |    20.00% | UNCOVERED |
| `server/src/api/routes/v1/wigle/enrichment.ts`                      |  68.57% |   58.82% |    66.66% | PARTIAL   |
| `server/src/api/routes/v1/wigle/index.ts`                           |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/wigle/ledger.ts`                          |  98.05% |   92.75% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/live.ts`                            |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/wigle/observations.ts`                    |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v1/wigle/search.ts`                          |  80.00% |   84.78% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/stats.ts`                           |  92.00% |   72.22% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/wigle/status.ts`                          | 100.00% |   88.88% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/validation.ts`                      |  50.00% |  100.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v2/filtered.ts`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/handlers/analytics.ts`           |  88.23% |   33.33% |   100.00% | UNCOVERED |
| `server/src/api/routes/v2/filtered/handlers/geospatial.ts`          |  22.58% |    0.00% |    33.33% | UNCOVERED |
| `server/src/api/routes/v2/filtered/handlers/list.ts`                |  12.72% |    0.00% |    14.28% | UNCOVERED |
| `server/src/api/routes/v2/filtered/handlers/observations.ts`        |  25.64% |    0.00% |    40.00% | UNCOVERED |
| `server/src/api/routes/v2/filtered/handlers/unmatchedMedia.ts`      |   0.00% |  100.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v2/filtered/index.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/observationsBuilder.ts`          |  26.08% |    0.00% |     0.00% | UNCOVERED |
| `server/src/api/routes/v2/filtered/types.ts`                        |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/api/routes/v2/filtered/utils.ts`                        |  44.82% |    4.54% |    20.00% | UNCOVERED |
| `server/src/api/routes/v2/filteredHandlers.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filteredHelpers.ts`                       |  56.32% |   18.84% |    78.57% | UNCOVERED |
| `server/src/api/routes/v2/networks.ts`                              |  59.32% |   55.00% |    50.00% | PARTIAL   |
| `server/src/api/routes/v2/threats.ts`                               |   0.00% |    0.00% |     0.00% | UNCOVERED |

### `server/src/services/`

Files: 224

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     8376 / 9112 |   91.92% |
| Branches   |     5033 / 6178 |   81.46% |
| Functions  |     1236 / 1396 |   88.53% |
| Lines      |     8102 / 8744 |   92.65% |

| File                                                                                        |   Lines | Branches | Functions | Verdict   |
| ------------------------------------------------------------------------------------------- | ------: | -------: | --------: | --------- |
| `server/src/services/admin/adminHelpers.ts`                                                 |  71.87% |   68.67% |    68.00% | PARTIAL   |
| `server/src/services/admin/dataQualityAdminService.ts`                                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/importExportAdminService.ts`                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/importService.ts`                                                |  35.71% |    0.00% |     0.00% | UNCOVERED |
| `server/src/services/admin/networkTagCore.ts`                                               | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/services/admin/networkTagOui.ts`                                                | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/services/admin/networkTagsAdminService.ts`                                      | 100.00% |   93.33% |   100.00% | COVERED   |
| `server/src/services/admin/settingsAdminService.ts`                                         | 100.00% |   83.33% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/adminQueryAdapter.ts`                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/orchestrators/SiblingDetectionOrchestrator.ts`  |  79.41% |   70.14% |   100.00% | PARTIAL   |
| `server/src/services/admin/siblingDetection/rules/extraRules.ts`                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/cancelSiblingRefresh.ts`              |  26.31% |    0.00% |     0.00% | UNCOVERED |
| `server/src/services/admin/siblingDetection/use-cases/getSiblingRefreshStatusReconciled.ts` |  50.00% |   46.15% |    50.00% | PARTIAL   |
| `server/src/services/admin/siblingDetection/use-cases/getSiblingStats.ts`                   | 100.00% |   50.00% |   100.00% | PARTIAL   |
| `server/src/services/admin/siblingDetection/use-cases/getSiblingStatsByRule.ts`             |  66.66% |  100.00% |     0.00% | UNCOVERED |
| `server/src/services/admin/siblingDetection/use-cases/purgeSiblingPairs.ts`                 | 100.00% |   88.88% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState.ts`             |  43.75% |   46.15% |    50.00% | PARTIAL   |
| `server/src/services/admin/siblingDetection/use-cases/runSiblingRefreshJob.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/startSiblingRefresh.ts`               |  87.17% |   75.00% |    66.66% | PARTIAL   |
| `server/src/services/admin/siblingDetectionAdminService.ts`                                 | 100.00% |  100.00% |     0.00% | UNCOVERED |
| `server/src/services/admin/siblingDetectionConstants.ts`                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetectionQueries.ts`                                      | 100.00% |   72.72% |   100.00% | PARTIAL   |
| `server/src/services/admin/siblingDetectionState.ts`                                        | 100.00% |   88.23% |   100.00% | COVERED   |
| `server/src/services/adminDbService.ts`                                                     |  57.14% |   55.55% |    44.44% | PARTIAL   |
| `server/src/services/adminDbStatsService.ts`                                                |  96.29% |  100.00% |    50.00% | PARTIAL   |
| `server/src/services/adminImportHistoryService.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminMaintenanceService.ts`                                            | 100.00% |   92.30% |   100.00% | COVERED   |
| `server/src/services/adminNetworkMediaService.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminNetworkTagsService.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminOrphanNetworksService.ts`                                         |  98.64% |   90.24% |   100.00% | COVERED   |
| `server/src/services/adminSettingsService.ts`                                               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminSiblingService.ts`                                                |  70.58% |   66.66% |    66.66% | PARTIAL   |
| `server/src/services/adminUsersService.ts`                                                  | 100.00% |   92.85% |   100.00% | COVERED   |
| `server/src/services/agencyService.ts`                                                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/aiInsightsService.ts`                                                  | 100.00% |   80.00% |   100.00% | COVERED   |
| `server/src/services/analytics/coreAnalytics.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/analytics/helpers.ts`                                                  |  96.55% |   96.29% |   100.00% | COVERED   |
| `server/src/services/analytics/index.ts`                                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/analytics/networkAnalytics.ts`                                         | 100.00% |   94.73% |   100.00% | COVERED   |
| `server/src/services/analytics/threatAnalytics.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/analyticsService.ts`                                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/authQueries.ts`                                                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/authService.ts`                                                        |  98.76% |   95.23% |   100.00% | COVERED   |
| `server/src/services/authWrites.ts`                                                         | 100.00% |   94.73% |   100.00% | COVERED   |
| `server/src/services/awsService.ts`                                                         |  80.48% |   55.00% |   100.00% | PARTIAL   |
| `server/src/services/backgroundJobs/config.ts`                                              | 100.00% |   83.33% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/mlBehavioralScoring.ts`                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/mvRefresh.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/runners.ts`                                             |  97.46% |   85.57% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/settings.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/surveillanceScoring.ts`                                 | 100.00% |   90.21% |   100.00% | COVERED   |
| `server/src/services/backgroundJobsService.ts`                                              |  82.11% |   62.29% |    47.22% | PARTIAL   |
| `server/src/services/backup/awsCli.ts`                                                      | 100.00% |   86.95% |   100.00% | COVERED   |
| `server/src/services/backup/backupUtils.ts`                                                 | 100.00% |   96.77% |   100.00% | COVERED   |
| `server/src/services/backup/config.ts`                                                      | 100.00% |   88.88% |   100.00% | COVERED   |
| `server/src/services/backup/fileManager.ts`                                                 | 100.00% |   85.71% |   100.00% | COVERED   |
| `server/src/services/backup/pgEnv.ts`                                                       | 100.00% |   92.50% |   100.00% | COVERED   |
| `server/src/services/backup/pgTools.ts`                                                     |  95.41% |   91.89% |    91.66% | COVERED   |
| `server/src/services/backup/postgresToolchain.ts`                                           |  90.90% |   75.38% |    88.23% | PARTIAL   |
| `server/src/services/backup/s3Operations.ts`                                                |  81.57% |   53.84% |    83.33% | PARTIAL   |
| `server/src/services/backup/sourceDetector.ts`                                              |  95.83% |   76.19% |   100.00% | PARTIAL   |
| `server/src/services/backupService.ts`                                                      | 100.00% |   85.00% |   100.00% | COVERED   |
| `server/src/services/bedrockService.ts`                                                     | 100.00% |   83.33% |   100.00% | COVERED   |
| `server/src/services/cacheService.ts`                                                       |  94.87% |  100.00% |    87.50% | COVERED   |
| `server/src/services/courthouseService.ts`                                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/dashboardService.ts`                                                   | 100.00% |   66.66% |   100.00% | PARTIAL   |
| `server/src/services/dataQualityFilters.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/deflockService.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/explorerQueries.ts`                                                    | 100.00% |   64.28% |   100.00% | PARTIAL   |
| `server/src/services/explorerService.ts`                                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/explorerSorting.ts`                                                    | 100.00% |   91.66% |   100.00% | COVERED   |
| `server/src/services/exportService.ts`                                                      |  97.91% |   93.33% |   100.00% | COVERED   |
| `server/src/services/externalServiceHandler.ts`                                             | 100.00% |   88.88% |   100.00% | COVERED   |
| `server/src/services/featureFlagService.ts`                                                 |  96.77% |   89.28% |   100.00% | COVERED   |
| `server/src/services/filteredAnalyticsService.ts`                                           |  97.22% |   90.62% |    91.66% | COVERED   |
| `server/src/services/filterQueryBuilder/builders/GeospatialQueryBuilder.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/builders/NetworkListQueryBuilder.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/builders/NetworkOnlyQueryBuilder.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/constants.ts`                                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/engagementPredicates.ts`                            | 100.00% |   90.47% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/FilterBuildContext.ts`                              |  97.05% |   89.79% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/FilterPredicateBuilder.ts`                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/index.ts`                                           |  94.73% |   66.66% |    88.88% | PARTIAL   |
| `server/src/services/filterQueryBuilder/modules/AnalyticsModule.ts`                         | 100.00% |    0.00% |   100.00% | UNCOVERED |
| `server/src/services/filterQueryBuilder/modules/analyticsQueryBuilders.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/analyticsQueryContext.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/GeospatialModule.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/geospatialQueryBuilders.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/geospatialQueryContext.ts`                  | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathBuilder.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathCountBuilder.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathIdentityPredicates.ts`       | 100.00% |   91.93% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathListBuilder.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathPredicates.ts`               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathPredicateTypes.ts`           |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/services/filterQueryBuilder/modules/networkFastPathSecurityPredicates.ts`       |  95.38% |   86.04% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathSupplementalPredicates.ts`   | 100.00% |   95.23% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkMetricsBuilder.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/NetworkModule.ts`                           |  93.33% |   84.21% |    86.66% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkNoFilterBuilder.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkPredicateAdapters.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkSlowPathBuilder.ts`                  | 100.00% |   90.90% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/observationFilterBuilder.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/observationIdentityPredicates.ts`           | 100.00% |   90.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/ObservationModule.ts`                       |  93.33% |   92.85% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/observationSecurityTemporalPredicates.ts`   | 100.00% |   91.78% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/observationSpatialQualityPredicates.ts`     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/NetworkWhereBuildContext.ts`                        |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/services/filterQueryBuilder/networkWhereBuilder.ts`                             |  95.08% |   85.61% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/normalizers.ts`                                     |  98.52% |   95.87% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/QueryState.ts`                                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/radioPredicates.ts`                                 |  96.92% |   94.73% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/SchemaCompat.ts`                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/spatialHelpers.ts`                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/sqlExpressions.ts`                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/SqlFragmentLibrary.ts`                              | 100.00% |   75.00% |   100.00% | PARTIAL   |
| `server/src/services/filterQueryBuilder/threatCategoryLevels.ts`                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/types.ts`                                           |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/services/filterQueryBuilder/universalFilterQueryBuilder.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/validators.ts`                                      |  85.71% |   92.15% |   100.00% | COVERED   |
| `server/src/services/geocoding/cacheDatabase.ts`                                            |  90.90% |   78.57% |    80.00% | PARTIAL   |
| `server/src/services/geocoding/cacheStats.ts`                                               |  87.50% |  100.00% |    33.33% | UNCOVERED |
| `server/src/services/geocoding/cacheStore.ts`                                               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/geocoding/cacheUtils.ts`                                               | 100.00% |   92.59% |   100.00% | COVERED   |
| `server/src/services/geocoding/daemonRuntime.ts`                                            |  67.46% |   53.57% |    76.92% | PARTIAL   |
| `server/src/services/geocoding/daemonState.ts`                                              | 100.00% |   95.45% |   100.00% | COVERED   |
| `server/src/services/geocoding/jobState.ts`                                                 | 100.00% |   76.92% |   100.00% | PARTIAL   |
| `server/src/services/geocoding/mapbox.ts`                                                   |  97.82% |   75.40% |   100.00% | PARTIAL   |
| `server/src/services/geocoding/providerRuntime.ts`                                          | 100.00% |   92.00% |   100.00% | COVERED   |
| `server/src/services/geocoding/providers.ts`                                                | 100.00% |   94.01% |   100.00% | COVERED   |
| `server/src/services/geocoding/types.ts`                                                    |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/services/geocodingCacheService.ts`                                              |  84.17% |   59.13% |    77.77% | PARTIAL   |
| `server/src/services/homeLocationService.ts`                                                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/kepler/keplerTransforms.ts`                                            |  43.39% |   15.72% |    68.75% | UNCOVERED |
| `server/src/services/keplerService.ts`                                                      | 100.00% |   70.00% |    40.00% | PARTIAL   |
| `server/src/services/miscService.ts`                                                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/ml/modelScoring.ts`                                                    |  96.77% |   95.00% |   100.00% | COVERED   |
| `server/src/services/ml/repository.ts`                                                      |  82.85% |   70.83% |    81.81% | PARTIAL   |
| `server/src/services/ml/scoringService.ts`                                                  | 100.00% |   94.44% |   100.00% | COVERED   |
| `server/src/services/ml/trainer.ts`                                                         |  97.67% |   91.89% |   100.00% | COVERED   |
| `server/src/services/mlTrainingLock.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/mobileIngestService.ts`                                                |  83.59% |   68.26% |    78.26% | PARTIAL   |
| `server/src/services/networking/filterBuilders.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networking/filterBuilders/locationFilters.ts`                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networking/filterBuilders/securityRadioFilters.ts`                     | 100.00% |   91.66% |   100.00% | COVERED   |
| `server/src/services/networking/filterBuilders/textRangeFilters.ts`                         | 100.00% |   94.28% |   100.00% | COVERED   |
| `server/src/services/networking/homeLocation.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networking/queryParts.ts`                                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networking/querySchema.ts`                                             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networking/queryState.ts`                                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networking/repository.ts`                                              | 100.00% |   93.75% |   100.00% | COVERED   |
| `server/src/services/networking/sorting.ts`                                                 |  97.67% |   80.00% |    90.00% | COVERED   |
| `server/src/services/networking/sql.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networking/types.ts`                                                   |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/services/networkListService.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networkService.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networkTagService.ts`                                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/observationService.ts`                                                 | 100.00% |   91.66% |    66.66% | PARTIAL   |
| `server/src/services/ouiGroupingService.ts`                                                 | 100.00% |   90.38% |   100.00% | COVERED   |
| `server/src/services/pgadmin/control.ts`                                                    | 100.00% |   96.00% |   100.00% | COVERED   |
| `server/src/services/pgadmin/runtime.ts`                                                    |  96.80% |   88.57% |    93.33% | COVERED   |
| `server/src/services/pgadminService.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/reports/threatReportRenderers.ts`                                      | 100.00% |   96.15% |   100.00% | COVERED   |
| `server/src/services/reports/threatReportUtils.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/secretsManager.ts`                                                     |  88.88% |   78.65% |   100.00% | PARTIAL   |
| `server/src/services/shotspotterSensorsService.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/threatReportService.ts`                                                |  97.82% |   90.19% |    90.90% | COVERED   |
| `server/src/services/threatScoring.types.ts`                                                |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/services/threatScoringService.ts`                                               |  92.68% |   66.15% |    93.75% | PARTIAL   |
| `server/src/services/v2Queries.ts`                                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/v2Service.ts`                                                          | 100.00% |  100.00% |    70.00% | PARTIAL   |
| `server/src/services/visint/visintExif.ts`                                                  |  84.78% |   65.00% |   100.00% | PARTIAL   |
| `server/src/services/visint/visintPipeline.ts`                                              |  83.19% |   70.83% |    83.33% | PARTIAL   |
| `server/src/services/visint/visintScorer.ts`                                                | 100.00% |    0.00% |   100.00% | UNCOVERED |
| `server/src/services/wigle/api.ts`                                                          | 100.00% |   98.03% |   100.00% | COVERED   |
| `server/src/services/wigle/database.ts`                                                     |  97.89% |   87.93% |   100.00% | COVERED   |
| `server/src/services/wigle/detail.ts`                                                       |  63.88% |   66.04% |    50.00% | PARTIAL   |
| `server/src/services/wigle/persistence.ts`                                                  |  63.15% |    0.00% |    14.28% | UNCOVERED |
| `server/src/services/wigle/shared.ts`                                                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigle/wigleGateway.ts`                                                 |  88.09% |   67.30% |   100.00% | PARTIAL   |
| `server/src/services/wigle/wigleKmlSyncService.ts`                                          |  93.33% |   77.91% |    78.57% | PARTIAL   |
| `server/src/services/wigleAuditLogger.ts`                                                   |  82.35% |   74.35% |    70.00% | PARTIAL   |
| `server/src/services/wigleClient.ts`                                                        |  90.80% |   70.00% |    77.77% | PARTIAL   |
| `server/src/services/wigleDetailService.ts`                                                 | 100.00% |   97.77% |   100.00% | COVERED   |
| `server/src/services/wigleDetailTransforms.ts`                                              |  78.94% |   82.05% |   100.00% | PARTIAL   |
| `server/src/services/wigleEnrichment/mappers/enrichmentMapper.ts`                           |  91.37% |   82.45% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/orchestrators/WigleEnrichmentOrchestrator.ts`          |  90.81% |   88.00% |    83.33% | COVERED   |
| `server/src/services/wigleEnrichment/repositories/enrichmentReadRepository.ts`              |  92.18% |   86.95% |    84.61% | COVERED   |
| `server/src/services/wigleEnrichment/repositories/wigleApiCreditGateway.ts`                 |  82.60% |   68.08% |    60.00% | PARTIAL   |
| `server/src/services/wigleEnrichment/use-cases/forceClearEnrichmentRun.ts`                  | 100.00% |   88.88% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/use-cases/resumeEnrichment.ts`                         | 100.00% |   90.90% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/use-cases/runEnrichmentLoop.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/use-cases/startBatchEnrichment.ts`                     |  96.87% |   87.87% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/use-cases/validateWigleApiCredit.ts`                   |  95.45% |   88.23% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichmentFetcher.ts`                                             |  88.23% |   60.00% |   100.00% | PARTIAL   |
| `server/src/services/wigleEnrichmentService.ts`                                             | 100.00% |  100.00% |    71.42% | PARTIAL   |
| `server/src/services/wigleImport/authProvider.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/btApiClient.ts`                                            |  32.14% |   46.15% |    50.00% | UNCOVERED |
| `server/src/services/wigleImport/btPageProcessor.ts`                                        |  25.92% |    0.00% |     0.00% | UNCOVERED |
| `server/src/services/wigleImport/btParams.ts`                                               |  86.59% |   78.26% |    90.00% | PARTIAL   |
| `server/src/services/wigleImport/mappers/buildCreateImportRunInput.ts`                      |  60.86% |   76.47% |    66.66% | PARTIAL   |
| `server/src/services/wigleImport/orchestrators/WigleImportRunOrchestrator.ts`               |  96.20% |   84.15% |   100.00% | COVERED   |
| `server/src/services/wigleImport/pageProcessor.ts`                                          |  88.88% |   71.42% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/params.ts`                                                 |  97.43% |   91.93% |   100.00% | COVERED   |
| `server/src/services/wigleImport/rateLimitingStrategy.ts`                                   |  53.84% |  100.00% |     0.00% | UNCOVERED |
| `server/src/services/wigleImport/repositories/runReadRepository.ts`                         |  93.10% |   80.00% |    85.71% | COVERED   |
| `server/src/services/wigleImport/runRepository.ts`                                          |  99.20% |   94.82% |    95.45% | COVERED   |
| `server/src/services/wigleImport/runStateManager.ts`                                        |  98.18% |   91.30% |   100.00% | COVERED   |
| `server/src/services/wigleImport/serialization.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/use-cases/bulkDeleteGlobalCancelledCluster.ts`             |  88.88% |   50.00% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/use-cases/getImportCompletenessReport.ts`                  | 100.00% |   65.90% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/use-cases/manageImportRuns.ts`                             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/wigleApiClient.ts`                                         | 100.00% |   92.30% |   100.00% | COVERED   |
| `server/src/services/wigleImport/wigleApiSpec.ts`                                           |  78.57% |   86.66% |    90.00% | PARTIAL   |
| `server/src/services/wigleImport/wigleBluetoothImportService.ts`                            |  98.03% |   83.33% |    83.33% | COVERED   |
| `server/src/services/wigleImportRunService.ts`                                              | 100.00% |  100.00% |    66.66% | PARTIAL   |
| `server/src/services/wigleImportService.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleRequestLedger.ts`                                                 |  98.59% |   86.66% |   100.00% | COVERED   |
| `server/src/services/wigleRequestUtils.ts`                                                  | 100.00% |   97.14% |   100.00% | COVERED   |
| `server/src/services/wigleSearchApiService.ts`                                              |  92.85% |   89.47% |   100.00% | COVERED   |
| `server/src/services/wigleSearchCache.ts`                                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleSearchService.ts`                                                 |  86.36% |   63.33% |   100.00% | PARTIAL   |
| `server/src/services/wigleSearchTransforms.ts`                                              |  80.43% |   62.26% |    76.92% | PARTIAL   |
| `server/src/services/wigleService.ts`                                                       |  86.66% |   66.66% |    75.00% | PARTIAL   |

### `server/src/repositories/`

Files: 23

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |       563 / 834 |   67.50% |
| Branches   |       255 / 472 |   54.02% |
| Functions  |       110 / 204 |   53.92% |
| Lines      |       534 / 787 |   67.85% |

| File                                                         |   Lines | Branches | Functions | Verdict   |
| ------------------------------------------------------------ | ------: | -------: | --------: | --------- |
| `server/src/repositories/adminNetworkMediaRepository.ts`     |  40.81% |    4.00% |     6.66% | UNCOVERED |
| `server/src/repositories/adminNetworkTagOuiRepository.ts`    |  41.66% |    0.00% |     0.00% | UNCOVERED |
| `server/src/repositories/adminNetworkTagRepository.ts`       |  39.62% |    0.00% |     0.00% | UNCOVERED |
| `server/src/repositories/agencyRepository.ts`                |  84.21% |   50.00% |    75.00% | PARTIAL   |
| `server/src/repositories/baseRepository.ts`                  |  89.83% |   51.42% |   100.00% | PARTIAL   |
| `server/src/repositories/courthouseRepository.ts`            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/repositories/deflockRepository.ts`               |  50.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/repositories/exportRepository.ts`                |  38.23% |    0.00% |     0.00% | UNCOVERED |
| `server/src/repositories/jobRunRepository.ts`                |  27.02% |    4.16% |    33.33% | UNCOVERED |
| `server/src/repositories/keplerRepository.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/repositories/kmlImportRepository.ts`             |  24.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/repositories/mobileIngestRepository.ts`          |  85.36% |   50.00% |    92.30% | PARTIAL   |
| `server/src/repositories/networkRepository.ts`               |  59.09% |   71.21% |    62.50% | PARTIAL   |
| `server/src/repositories/shotspotterRepository.ts`           |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/repositories/shotspotterSensorsRepository.ts`    |  50.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/repositories/siblingPruningRepository.ts`        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/repositories/siblingRunRepository.ts`            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/repositories/surveillanceDetectionRepository.ts` |  94.44% |   50.00% |   100.00% | PARTIAL   |
| `server/src/repositories/threatRepository.ts`                |  86.66% |   57.44% |   100.00% | PARTIAL   |
| `server/src/repositories/v2Repository.ts`                    |  58.94% |   70.51% |    50.00% | PARTIAL   |
| `server/src/repositories/wigleEnrichmentRepository.ts`       |  95.45% |  100.00% |    50.00% | PARTIAL   |
| `server/src/repositories/wiglePersistenceRepository.ts`      |  85.29% |   90.74% |    50.00% | PARTIAL   |
| `server/src/repositories/wigleQueriesRepository.ts`          |  94.94% |   65.85% |    86.36% | PARTIAL   |

### `server/src/ (other)`

Files: 56

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     1761 / 1855 |   94.93% |
| Branches   |     1093 / 1212 |   90.18% |
| Functions  |       244 / 275 |   88.72% |
| Lines      |     1743 / 1829 |   95.29% |

| File                                                   |   Lines | Branches | Functions | Verdict   |
| ------------------------------------------------------ | ------: | -------: | --------: | --------- |
| `server/src/config/container.ts`                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/config/database.ts`                        |  80.55% |   56.41% |    42.85% | PARTIAL   |
| `server/src/config/loadEnv.ts`                         | 100.00% |   90.90% |   100.00% | COVERED   |
| `server/src/config/routeConfig.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/appInit.ts`            | 100.00% |   85.71% |   100.00% | COVERED   |
| `server/src/core/initialization/backgroundJobsInit.ts` | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/credentialsInit.ts`    |  88.88% |  100.00% |    50.00% | PARTIAL   |
| `server/src/core/initialization/dashboardInit.ts`      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/databaseInit.ts`       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/errorHandlingInit.ts`  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/middlewareInit.ts`     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/routesInit.ts`         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/errors/AppError.ts`                        | 100.00% |   94.11% |    92.85% | COVERED   |
| `server/src/errors/errorHandler.ts`                    | 100.00% |   80.00% |   100.00% | COVERED   |
| `server/src/logging/logger.ts`                         |  71.42% |   71.73% |    36.36% | UNCOVERED |
| `server/src/middleware/authMiddleware.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/cacheMiddleware.ts`             |  87.50% |   90.90% |    60.00% | PARTIAL   |
| `server/src/middleware/commonMiddleware.ts`            |  65.00% |    6.66% |    33.33% | UNCOVERED |
| `server/src/middleware/httpsRedirect.ts`               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/requestId.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/securityHeaders.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/spaFallback.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/staticAssets.ts`                |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/types/express.d.ts`                        |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/types/ml-logistic-regression.d.ts`         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/types/surveillanceScan.ts`                 |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/types/v2Types.ts`                          |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/utils/asyncHandler.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/databaseSetup.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/envFlag.ts`                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/envSanitizer.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/escapeSQL.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/frequencyUtils.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/networkSqlExpressions.ts`            |  98.14% |   93.93% |   100.00% | COVERED   |
| `server/src/utils/queryPerformanceTracker.ts`          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/routeMounts.ts`                      |  98.11% |   90.00% |   100.00% | COVERED   |
| `server/src/utils/safeJsonParse.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/securityLabelValidator.ts`           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/serverConfig.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/serverDependencies.ts`               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/serverLifecycle.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/serverStartup.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/shutdownHandlers.ts`                 |  90.00% |  100.00% |    83.33% | COVERED   |
| `server/src/utils/staticSetup.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/validateSecrets.ts`                  | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/utils/validators.ts`                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/validation/middleware.ts`                  | 100.00% |   92.47% |   100.00% | COVERED   |
| `server/src/validation/parameterParsers.ts`            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/validation/schemas.ts`                     |  97.59% |   91.95% |    93.75% | COVERED   |
| `server/src/validation/schemas/commonSchemas.ts`       |  94.40% |   90.55% |   100.00% | COVERED   |
| `server/src/validation/schemas/complexValidators.ts`   |  99.37% |   96.26% |   100.00% | COVERED   |
| `server/src/validation/schemas/geospatialSchemas.ts`   |  96.90% |   97.43% |   100.00% | COVERED   |
| `server/src/validation/schemas/networkSchemas.ts`      |  97.43% |   96.59% |   100.00% | COVERED   |
| `server/src/validation/schemas/temporalSchemas.ts`     |  93.20% |   92.85% |   100.00% | COVERED   |
| `server/src/views/ouiGroupingDemo.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/websocket/ssmTerminal.ts`                  |  93.22% |   83.87% |    89.47% | COVERED   |

## Highest-Value Uncovered Application Files

Limited to `server/src/`; ETL and CLI scripts are excluded. Files are ranked by uncovered executable lines. The per-file verdict is determined by the weakest of Lines, Branches, and Functions coverage.

| Rank | File                                                 | Uncovered Lines |  Lines | Branches | Functions |
| ---: | ---------------------------------------------------- | --------------: | -----: | -------: | --------: |
|    1 | `server/src/api/routes/v1/admin/tags.ts`             |              50 | 25.37% |    9.67% |    16.66% |
|    2 | `server/src/api/routes/v1/kepler.ts`                 |              48 |  0.00% |    0.00% |     0.00% |
|    3 | `server/src/api/routes/v2/filtered/handlers/list.ts` |              48 | 12.72% |    0.00% |    14.28% |
|    4 | `server/src/api/routes/v1/admin/awsInstances.ts`     |              48 | 20.00% |    0.00% |     0.00% |
|    5 | `server/src/api/routes/v1/admin/users.ts`            |              46 | 22.03% |    0.00% |    20.00% |
|    6 | `server/src/api/routes/v1/threat-report.ts`          |              43 |  0.00% |    0.00% |     0.00% |
|    7 | `server/src/api/routes/v1/wigle/detail.ts`           |              39 | 32.75% |   22.85% |    20.00% |
|    8 | `server/src/api/routes/v2/filteredHelpers.ts`        |              38 | 56.32% |   18.84% |    78.57% |
|    9 | `server/src/api/routes/v1/wigle/live.ts`             |              34 |  0.00% |    0.00% |     0.00% |
|   10 | `server/src/api/routes/v1/settingsHelpers.ts`        |              33 |  0.00% |    0.00% |     0.00% |

## Verdict Scale

| Verdict   |      Coverage |
| --------- | ------------: |
| COVERED   |        >= 80% |
| PARTIAL   | 40% to 79.99% |
| UNCOVERED |         < 40% |
