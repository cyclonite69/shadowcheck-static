# Coverage Report

- Generated: 2026-06-19T14:13:54.340Z
- Git SHA: `3c30d218`
- Source: `coverage/coverage-summary.json`
- Coverage artifact modified: 2026-06-19T14:13:53.673Z
- Global threshold: 60% per metric

## Global Totals

| Metric     | Covered / Total | Actual | Threshold | Status |
| ---------- | --------------: | -----: | --------: | ------ |
| Statements |   16482 / 24548 | 67.14% |       60% | PASS   |
| Branches   |    9471 / 15453 | 61.28% |       60% | PASS   |
| Functions  |     2352 / 3717 | 63.27% |       60% | PASS   |
| Lines      |   16028 / 23342 | 68.66% |       60% | PASS   |

> Coverage totals reflect the collection scope of the source artifact. Layer aggregates are calculated from covered and total counters, not averages of file percentages.

## Layer Breakdown

### `etl/`

Files: 56

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |      722 / 3409 |   21.17% |
| Branches   |      351 / 2225 |   15.77% |
| Functions  |       120 / 526 |   22.81% |
| Lines      |      685 / 3142 |   21.80% |

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
| `etl/load/fbi/importer.ts`                                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/fbi/loader.ts`                                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/fbi/parser.ts`                                         | 100.00% |   92.85% |   100.00% | COVERED   |
| `etl/load/fbi/scraper.ts`                                        | 100.00% |   88.88% |   100.00% | COVERED   |
| `etl/load/fbi/transformer.ts`                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/fbi/types.ts`                                          |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `etl/load/json-import.ts`                                        |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/kismet-import.ts`                                      |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/kml-import.ts`                                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/kmlImportUtils.ts`                                     |  86.00% |   72.34% |    76.92% | PARTIAL   |
| `etl/load/sqlite-import-incremental.ts`                          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/sqlite-import.ts`                                      |  98.94% |   75.00% |   100.00% | PARTIAL   |
| `etl/load/sqlite/cli.ts`                                         |  86.04% |   76.92% |    72.72% | PARTIAL   |
| `etl/load/sqlite/importObservations.ts`                          | 100.00% |   93.75% |   100.00% | COVERED   |
| `etl/load/sqlite/insertObservations.ts`                          | 100.00% |   90.00% |   100.00% | COVERED   |
| `etl/load/sqlite/networkReconciliation.ts`                       | 100.00% |   86.66% |   100.00% | COVERED   |
| `etl/load/sqlite/preflight.ts`                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/sqlite/reader.ts`                                      | 100.00% |   92.00% |   100.00% | COVERED   |
| `etl/load/sqlite/reporting.ts`                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/sqlite/schemaSetup.ts`                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/sqlite/sourceTag.ts`                                   |  82.85% |   65.90% |    75.00% | PARTIAL   |
| `etl/load/sqlite/types.ts`                                       |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `etl/load/sqlite/validateAndEnrich.ts`                           |  89.47% |   66.66% |   100.00% | PARTIAL   |
| `etl/load/wigle/importer.ts`                                     | 100.00% |   87.50% |   100.00% | COVERED   |
| `etl/load/wigle/loader.ts`                                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/wigle/reader.ts`                                       | 100.00% |   96.00% |   100.00% | COVERED   |
| `etl/load/wigle/transformer.ts`                                  | 100.00% |  100.00% |   100.00% | COVERED   |
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
| `etl/utils/deadLetter.ts`                                        |  83.33% |   62.16% |    70.00% | PARTIAL   |
| `etl/utils/schemas.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |

### `scripts/`

Files: 50

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |      119 / 4508 |    2.63% |
| Branches   |       93 / 2554 |    3.64% |
| Functions  |        18 / 784 |    2.29% |
| Lines      |      111 / 4086 |    2.71% |

| File                                                       |   Lines | Branches | Functions | Verdict   |
| ---------------------------------------------------------- | ------: | -------: | --------: | --------- |
| `scripts/audit/api-route-audit.ts`                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/backup-sm-to-bitwarden.js`                        |  44.96% |   50.84% |    43.47% | PARTIAL   |
| `scripts/check-client-imports.ts`                          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/check-modularity.js`                              |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/db-audit/generate-audit-report.js`                |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/debug-smarty-one.ts`                              |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-addresses-fast.ts`              |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-addresses-multi.ts`             |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-business-names.ts`              |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-multi-source.ts`                |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrich-overpass-optimized.ts`          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/enrichment-system.ts`                  |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/generate-overpass-queries.ts`          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/enrichment/monitor-enrichment.ts`                 |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/forensic/siblingPairAuditBatch.ts`                |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/forensic/siblingPairAuditTargeted.ts`             |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/generate-coverage-report.js`                      |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/generate-password.ts`                             |  79.31% |   63.15% |    70.00% | PARTIAL   |
| `scripts/generate-sitemap.js`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `scripts/geocoding/export-missing-geocodes.ts`             |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/geocode-addresses.ts`                   |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/geocode-batch.ts`                       |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/geocode-wigle.ts`                       |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-ap-addresses.ts`                 |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-final-geocodes.ts`               |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-geocodes.ts`                     |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-missing-geocodes.ts`             |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-network-addresses.ts`            |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/reverse-geocode-batch.ts`               |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/reverse-geocode-observations-sample.ts` |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/reverse-geocode-parallel.ts`            |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/reverse-geocode-smart.ts`               |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/import/import-wigle-parallel.ts`                  |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/loadEnv.ts`                                       |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `scripts/manual-ingest.js`                                 |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/manual/run-geocoding-sample.ts`                   |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/ml/ml-logistic-regression.d.ts`                   |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/ml/ml-trainer.ts`                                 |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/rebuild-networks-precision.ts`                    |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/run_manufacturer_backfill.js`                     |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/run_targeted_siblings.js`                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/run-migration.ts`                                 |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/runSiblingRefreshTest.ts`                         |   0.00% |  100.00% |     0.00% | UNCOVERED |
| `scripts/score-all-hybrid.ts`                              |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/set-home.ts`                                      |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/test-smarty-us-street.ts`                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/trigger-report.js`                                |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/vendor-docs-extract.ts`                           |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/wigle-daemon.ts`                                  |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/write-robots.js`                                  | 100.00% |   87.50% |   100.00% | COVERED   |

### `server/src/api/routes/`

Files: 106

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     4418 / 4753 |   92.95% |
| Branches   |     2245 / 2742 |   81.87% |
| Functions  |       480 / 521 |   92.13% |
| Lines      |     4353 / 4678 |   93.05% |

| File                                                                |   Lines | Branches | Functions | Verdict   |
| ------------------------------------------------------------------- | ------: | -------: | --------: | --------- |
| `server/src/api/routes/v1/admin.ts`                                 |  81.31% |   66.66% |    33.33% | UNCOVERED |
| `server/src/api/routes/v1/admin/adminAwsHelpers.ts`                 | 100.00% |   93.33% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/adminGeocodingHelpers.ts`           |  98.14% |   77.96% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/adminNotesHelpers.ts`               |  91.04% |   68.08% |    85.71% | PARTIAL   |
| `server/src/api/routes/v1/admin/adminSecretsHelpers.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/aws.ts`                             | 100.00% |   66.66% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/awsInstances.ts`                    |  90.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/backup.ts`                          | 100.00% |   69.56% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/dbStats.ts`                         | 100.00% |   85.71% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/detectionEvidence.ts`               | 100.00% |   75.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/geocoding.ts`                       | 100.00% |   72.22% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import.ts`                          | 100.00% |   50.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/history.js`                  |  70.00% |   50.00% |    75.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/kml.js`                      |  91.54% |   78.94% |    83.33% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/orphans.js`                  |  90.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/import/sql.js`                      |  98.18% |   75.00% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/sqlite.js`                   | 100.00% |   76.47% |    54.54% | PARTIAL   |
| `server/src/api/routes/v1/admin/maintenance.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/media.ts`                           |  97.82% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/notes.ts`                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/oui.ts`                             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/pgadmin.ts`                         | 100.00% |   66.66% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/secrets.ts`                         | 100.00% |   76.92% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/settings.ts`                        |  99.24% |   87.34% |    94.11% | COVERED   |
| `server/src/api/routes/v1/admin/siblings.ts`                        |  97.50% |   72.41% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/tags.ts`                            |  98.50% |   90.32% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/users.ts`                           |  88.13% |   94.59% |   100.00% | COVERED   |
| `server/src/api/routes/v1/agencyOffices.ts`                         |  77.77% |  100.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/analytics-public.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/analytics.ts`                             |  98.55% |   62.50% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/auth.ts`                                  | 100.00% |   89.28% |   100.00% | COVERED   |
| `server/src/api/routes/v1/backup.ts`                                |  92.85% |   60.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/claude.ts`                                |  98.03% |   79.16% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/dashboard.ts`                             |  98.52% |   88.04% |   100.00% | COVERED   |
| `server/src/api/routes/v1/dataQuality.ts`                           | 100.00% |   91.66% |   100.00% | COVERED   |
| `server/src/api/routes/v1/deflockCameras.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/explorer.ts`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/explorer/index.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/explorer/networks.ts`                     | 100.00% |   83.87% |   100.00% | COVERED   |
| `server/src/api/routes/v1/explorer/shared.ts`                       |  98.98% |   98.64% |   100.00% | COVERED   |
| `server/src/api/routes/v1/export.ts`                                | 100.00% |   68.75% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/federalCourthouses.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/geocoding.ts`                             | 100.00% |   90.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/geospatial.ts`                            |  93.33% |   79.22% |    69.23% | PARTIAL   |
| `server/src/api/routes/v1/health.ts`                                |  89.18% |   73.52% |    69.23% | PARTIAL   |
| `server/src/api/routes/v1/home-location.ts`                         |  90.62% |   86.36% |   100.00% | COVERED   |
| `server/src/api/routes/v1/kepler.ts`                                |  91.66% |   69.04% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/keplerHelpers.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/location-markers.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/ml.ts`                                    |  84.25% |   76.92% |    88.88% | PARTIAL   |
| `server/src/api/routes/v1/mobileIngest.ts`                          |  98.73% |   95.83% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-agencies.ts`                      | 100.00% |   92.85% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-tags.ts`                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-tags/index.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-tags/listTags.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-tags/manageTags.ts`               |  87.36% |   90.56% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks.ts`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/index.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/handler.ts`                 |  91.66% |   50.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/networks/list/index.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parseParams.ts`             |  84.61% |   75.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/networks/list/parsers/networkIdentity.ts` | 100.00% |   90.69% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parsers/pagination.ts`      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parsers/signalFilters.ts`   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parsers/spatialFilters.ts`  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parsers/threatFilters.ts`   |  97.05% |   89.28% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/manufacturer.ts`                 |  93.18% |   82.60% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/notes.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/observations.ts`                 |  69.87% |   66.11% |    93.75% | PARTIAL   |
| `server/src/api/routes/v1/networks/search.ts`                       |  85.71% |   78.94% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/networks/tags.ts`                         |  95.55% |   84.21% |   100.00% | COVERED   |
| `server/src/api/routes/v1/settings.ts`                              |  75.67% |   44.44% |    66.66% | PARTIAL   |
| `server/src/api/routes/v1/settingsHelpers.ts`                       |  87.87% |   68.96% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/settingsMultiSecretRoutes.ts`             |  80.80% |   61.70% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/settingsSecretRoutes.ts`                  |  89.65% |   70.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/shotspotterSensors.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/shotspotterZones.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/threat-report.ts`                         |  95.34% |   82.75% |   100.00% | COVERED   |
| `server/src/api/routes/v1/threats.ts`                               |  78.78% |   83.33% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/wigle.ts`                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/database.ts`                        |  74.10% |   64.92% |    62.50% | PARTIAL   |
| `server/src/api/routes/v1/wigle/detail.ts`                          |  96.55% |   82.85% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/enrichment.ts`                      |  97.14% |   88.23% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/index.ts`                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/ledger.ts`                          |  98.05% |   86.74% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/live.ts`                            |  94.11% |   91.30% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/observations.ts`                    | 100.00% |   90.90% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/search.ts`                          |  81.62% |   85.86% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/stats.ts`                           |  92.00% |   72.22% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/wigle/status.ts`                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/validation.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered.ts`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/handlers/analytics.ts`           |  88.23% |   33.33% |   100.00% | UNCOVERED |
| `server/src/api/routes/v2/filtered/handlers/geospatial.ts`          | 100.00% |   77.77% |   100.00% | PARTIAL   |
| `server/src/api/routes/v2/filtered/handlers/list.ts`                |  98.18% |   80.64% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/handlers/observations.ts`        | 100.00% |   92.85% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/handlers/unmatchedMedia.ts`      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/index.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/observationsBuilder.ts`          | 100.00% |   88.46% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/types.ts`                        |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `server/src/api/routes/v2/filtered/utils.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filteredHandlers.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filteredHelpers.ts`                       |  97.72% |   88.05% |   100.00% | COVERED   |
| `server/src/api/routes/v2/networks.ts`                              | 100.00% |   84.61% |   100.00% | COVERED   |
| `server/src/api/routes/v2/threats.ts`                               | 100.00% |  100.00% |   100.00% | COVERED   |

### `server/src/services/`

Files: 226

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     8636 / 9176 |   94.11% |
| Branches   |     5300 / 6246 |   84.85% |
| Functions  |     1285 / 1405 |   91.45% |
| Lines      |     8349 / 8807 |   94.79% |

| File                                                                                        |   Lines | Branches | Functions | Verdict   |
| ------------------------------------------------------------------------------------------- | ------: | -------: | --------: | --------- |
| `server/src/services/admin/adminHelpers.ts`                                                 |  71.87% |   68.67% |    68.00% | PARTIAL   |
| `server/src/services/admin/dataQualityAdminService.ts`                                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/importExportAdminService.ts`                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/importService.ts`                                                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/networkTagCore.ts`                                               | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/services/admin/networkTagOui.ts`                                                | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/services/admin/networkTagsAdminService.ts`                                      | 100.00% |   93.33% |   100.00% | COVERED   |
| `server/src/services/admin/settingsAdminService.ts`                                         | 100.00% |   83.33% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/adminQueryAdapter.ts`                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/orchestrators/SiblingDetectionOrchestrator.ts`  |  79.41% |   70.14% |   100.00% | PARTIAL   |
| `server/src/services/admin/siblingDetection/rules/extraRules.ts`                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/cancelSiblingRefresh.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/getSiblingRefreshStatusReconciled.ts` | 100.00% |   92.30% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/getSiblingStats.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/getSiblingStatsByRule.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/purgeSiblingPairs.ts`                 | 100.00% |   88.88% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState.ts`             | 100.00% |   92.30% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/runSiblingRefreshJob.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/startSiblingRefresh.ts`               | 100.00% |   85.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetectionAdminService.ts`                                 | 100.00% |  100.00% |     0.00% | UNCOVERED |
| `server/src/services/admin/siblingDetectionConstants.ts`                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetectionQueries.ts`                                      | 100.00% |   72.72% |   100.00% | PARTIAL   |
| `server/src/services/admin/siblingDetectionState.ts`                                        | 100.00% |   88.23% |   100.00% | COVERED   |
| `server/src/services/adminDbService.ts`                                                     |  93.50% |   76.38% |   100.00% | PARTIAL   |
| `server/src/services/adminDbStatsService.ts`                                                |  96.29% |  100.00% |    50.00% | PARTIAL   |
| `server/src/services/adminImportHistoryService.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminMaintenanceService.ts`                                            | 100.00% |   92.30% |   100.00% | COVERED   |
| `server/src/services/adminNetworkMediaService.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminNetworkTagsService.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminOrphanNetworksService.ts`                                         |  98.64% |   90.24% |   100.00% | COVERED   |
| `server/src/services/adminSettingsService.ts`                                               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminSiblingService.ts`                                                | 100.00% |  100.00% |   100.00% | COVERED   |
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
| `server/src/services/filterQueryBuilder/index.ts`                                           |  94.73% |   66.66% |    94.44% | PARTIAL   |
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
| `server/src/services/kepler/keplerTransforms.ts`                                            | 100.00% |   75.47% |   100.00% | PARTIAL   |
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
| `server/src/services/visint/visintScorer.ts`                                                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigle/api.ts`                                                          | 100.00% |   98.03% |   100.00% | COVERED   |
| `server/src/services/wigle/database.ts`                                                     |  97.89% |   87.93% |   100.00% | COVERED   |
| `server/src/services/wigle/detail.ts`                                                       |  69.44% |   77.16% |    50.00% | PARTIAL   |
| `server/src/services/wigle/persistence.ts`                                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigle/shared.ts`                                                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigle/wigleGateway.ts`                                                 | 100.00% |   88.33% |   100.00% | COVERED   |
| `server/src/services/wigle/wigleKmlSyncService.ts`                                          |  93.33% |   77.91% |    78.57% | PARTIAL   |
| `server/src/services/wigleAuditLogger.ts`                                                   |  82.35% |   74.35% |    70.00% | PARTIAL   |
| `server/src/services/wigleClient.ts`                                                        |  96.55% |   76.66% |    88.88% | PARTIAL   |
| `server/src/services/wigleDetailService.ts`                                                 | 100.00% |   97.87% |   100.00% | COVERED   |
| `server/src/services/wigleDetailTransforms.ts`                                              | 100.00% |  100.00% |   100.00% | COVERED   |
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
| `server/src/services/wigleImport/btApiClient.ts`                                            | 100.00% |   92.30% |   100.00% | COVERED   |
| `server/src/services/wigleImport/btPageProcessor.ts`                                        | 100.00% |   60.00% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/btParams.ts`                                               |  86.59% |   78.26% |    90.00% | PARTIAL   |
| `server/src/services/wigleImport/mappers/buildCreateImportRunInput.ts`                      | 100.00% |   94.11% |   100.00% | COVERED   |
| `server/src/services/wigleImport/orchestrators/WigleImportRunOrchestrator.ts`               |  96.20% |   84.15% |   100.00% | COVERED   |
| `server/src/services/wigleImport/pageProcessor.ts`                                          |  88.88% |   71.42% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/params.ts`                                                 |  97.59% |   92.18% |   100.00% | COVERED   |
| `server/src/services/wigleImport/rateLimitingStrategy.ts`                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/repositories/runReadRepository.ts`                         |  93.10% |   80.00% |    85.71% | COVERED   |
| `server/src/services/wigleImport/runRepository.ts`                                          |  99.20% |   94.82% |    95.45% | COVERED   |
| `server/src/services/wigleImport/runStateManager.ts`                                        |  98.18% |   91.30% |   100.00% | COVERED   |
| `server/src/services/wigleImport/serialization.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/use-cases/bulkDeleteGlobalCancelledCluster.ts`             |  88.88% |   50.00% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/use-cases/getImportCompletenessReport.ts`                  | 100.00% |   65.90% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/use-cases/manageImportRuns.ts`                             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/wigleApiClient.ts`                                         | 100.00% |   92.30% |   100.00% | COVERED   |
| `server/src/services/wigleImport/wigleApiSpec.ts`                                           |  96.42% |   93.33% |   100.00% | COVERED   |
| `server/src/services/wigleImport/wigleBluetoothImportService.ts`                            |  98.03% |   83.33% |    83.33% | COVERED   |
| `server/src/services/wigleImportRunService.ts`                                              | 100.00% |  100.00% |    66.66% | PARTIAL   |
| `server/src/services/wigleImportService.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleLimits.ts`                                                        |  54.83% |   52.17% |    60.00% | PARTIAL   |
| `server/src/services/wigleRequestLedger.ts`                                                 |  93.50% |   83.60% |    94.44% | COVERED   |
| `server/src/services/wigleRequestUtils.ts`                                                  | 100.00% |   97.14% |   100.00% | COVERED   |
| `server/src/services/wigleScheduler.ts`                                                     | 100.00% |   92.30% |   100.00% | COVERED   |
| `server/src/services/wigleSearchApiService.ts`                                              |  93.33% |   91.30% |   100.00% | COVERED   |
| `server/src/services/wigleSearchCache.ts`                                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleSearchService.ts`                                                 |  86.36% |   63.33% |   100.00% | PARTIAL   |
| `server/src/services/wigleSearchTransforms.ts`                                              |  80.43% |   62.26% |    76.92% | PARTIAL   |
| `server/src/services/wigleService.ts`                                                       |  86.66% |   66.66% |    75.00% | PARTIAL   |

### `server/src/repositories/`

Files: 23

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |       802 / 847 |   94.68% |
| Branches   |       378 / 474 |   79.74% |
| Functions  |       191 / 206 |   92.71% |
| Lines      |       763 / 800 |   95.37% |

| File                                                         |   Lines | Branches | Functions | Verdict |
| ------------------------------------------------------------ | ------: | -------: | --------: | ------- |
| `server/src/repositories/adminNetworkMediaRepository.ts`     |  96.77% |   85.18% |    94.11% | COVERED |
| `server/src/repositories/adminNetworkTagOuiRepository.ts`    | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/adminNetworkTagRepository.ts`       | 100.00% |   83.33% |   100.00% | COVERED |
| `server/src/repositories/agencyRepository.ts`                |  84.21% |   50.00% |    75.00% | PARTIAL |
| `server/src/repositories/baseRepository.ts`                  |  89.83% |   51.42% |   100.00% | PARTIAL |
| `server/src/repositories/courthouseRepository.ts`            | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/deflockRepository.ts`               | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/exportRepository.ts`                | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/jobRunRepository.ts`                | 100.00% |   83.33% |   100.00% | COVERED |
| `server/src/repositories/keplerRepository.ts`                | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/kmlImportRepository.ts`             | 100.00% |   78.37% |   100.00% | PARTIAL |
| `server/src/repositories/mobileIngestRepository.ts`          |  85.36% |   50.00% |    92.30% | PARTIAL |
| `server/src/repositories/networkRepository.ts`               | 100.00% |   89.39% |   100.00% | COVERED |
| `server/src/repositories/shotspotterRepository.ts`           | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/shotspotterSensorsRepository.ts`    | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/siblingPruningRepository.ts`        | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/siblingRunRepository.ts`            | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/surveillanceDetectionRepository.ts` |  94.44% |   50.00% |   100.00% | PARTIAL |
| `server/src/repositories/threatRepository.ts`                |  86.66% |   57.44% |   100.00% | PARTIAL |
| `server/src/repositories/v2Repository.ts`                    | 100.00% |   93.58% |   100.00% | COVERED |
| `server/src/repositories/wigleEnrichmentRepository.ts`       |  95.45% |  100.00% |    50.00% | PARTIAL |
| `server/src/repositories/wiglePersistenceRepository.ts`      |  85.29% |   90.74% |    50.00% | PARTIAL |
| `server/src/repositories/wigleQueriesRepository.ts`          |  94.94% |   65.85% |    86.36% | PARTIAL |

### `server/src/ (other)`

Files: 56

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     1785 / 1855 |   96.22% |
| Branches   |     1104 / 1212 |   91.08% |
| Functions  |       258 / 275 |   93.81% |
| Lines      |     1767 / 1829 |   96.61% |

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
| `server/src/logging/logger.ts`                         |  90.47% |   78.26% |    86.36% | PARTIAL   |
| `server/src/middleware/authMiddleware.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/cacheMiddleware.ts`             |  87.50% |   90.90% |    60.00% | PARTIAL   |
| `server/src/middleware/commonMiddleware.ts`            |  65.00% |    6.66% |    33.33% | UNCOVERED |
| `server/src/middleware/httpsRedirect.ts`               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/requestId.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/securityHeaders.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/spaFallback.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/staticAssets.ts`                | 100.00% |   88.88% |   100.00% | COVERED   |
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

| Rank | File                                                                              | Uncovered Lines |  Lines | Branches | Functions |
| ---: | --------------------------------------------------------------------------------- | --------------: | -----: | -------: | --------: |
|    1 | `server/src/api/routes/v1/admin.ts`                                               |              17 | 81.31% |   66.66% |    33.33% |
|    2 | `server/src/middleware/commonMiddleware.ts`                                       |               7 | 65.00% |    6.66% |    33.33% |
|    3 | `server/src/services/geocoding/cacheStats.ts`                                     |               2 | 87.50% |  100.00% |    33.33% |
|    4 | `server/src/api/routes/v2/filtered/handlers/analytics.ts`                         |               2 | 88.23% |   33.33% |   100.00% |
|    5 | `server/src/api/routes/v2/filtered/types.ts`                                      |               1 |  0.00% |  100.00% |   100.00% |
|    6 | `server/src/services/filterQueryBuilder/modules/networkFastPathPredicateTypes.ts` |               1 |  0.00% |  100.00% |   100.00% |
|    7 | `server/src/services/filterQueryBuilder/NetworkWhereBuildContext.ts`              |               1 |  0.00% |  100.00% |   100.00% |
|    8 | `server/src/services/filterQueryBuilder/types.ts`                                 |               1 |  0.00% |  100.00% |   100.00% |
|    9 | `server/src/services/geocoding/types.ts`                                          |               1 |  0.00% |  100.00% |   100.00% |
|   10 | `server/src/services/networking/types.ts`                                         |               1 |  0.00% |  100.00% |   100.00% |

## Verdict Scale

| Verdict   |      Coverage |
| --------- | ------------: |
| COVERED   |        >= 80% |
| PARTIAL   | 40% to 79.99% |
| UNCOVERED |         < 40% |
