# Coverage Report

- Generated: 2026-07-06T17:01:48.341Z
- Git SHA: `029c8cc2`
- Source: `coverage/coverage-summary.json`
- Coverage artifact modified: 2026-07-06T16:47:11.930Z
- Global threshold: 60% per metric

## Global Totals

| Metric     | Covered / Total | Actual | Threshold | Status |
| ---------- | --------------: | -----: | --------: | ------ |
| Statements |   17111 / 22663 | 75.50% |       60% | PASS   |
| Branches   |    9671 / 13489 | 71.69% |       60% | PASS   |
| Functions  |     2429 / 3319 | 73.18% |       60% | PASS   |
| Lines      |   16366 / 21464 | 76.24% |       60% | PASS   |

> Coverage totals reflect the collection scope of the source artifact. Layer aggregates are calculated from covered and total counters, not averages of file percentages.

## Coverage Trend

_Previous (`029c8cc2` — 2026-07-06T17:01:14.158Z)_

| Metric     | Prev Covered / Total | Prev % | Curr Covered / Total | Curr % | Δ Covered / Total |   Δ % |
| ---------- | -------------------: | -----: | -------------------: | -----: | ----------------: | ----: |
| Statements |        17111 / 22663 | 75.50% |        17111 / 22663 | 75.50% |           +0 / +0 | 0.00% |
| Branches   |         9671 / 13489 | 71.69% |         9671 / 13489 | 71.69% |           +0 / +0 | 0.00% |
| Functions  |          2429 / 3319 | 73.18% |          2429 / 3319 | 73.18% |           +0 / +0 | 0.00% |
| Lines      |        16366 / 21464 | 76.24% |        16366 / 21464 | 76.24% |           +0 / +0 | 0.00% |

## Layer Breakdown

### `etl/`

Files: 53

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     1339 / 2787 |   48.04% |
| Branches   |      626 / 1576 |   39.72% |
| Functions  |       187 / 372 |   50.26% |
| Lines      |     1248 / 2551 |   48.92% |

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
| `etl/load/fbi/scraper.ts`                                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/fbi/transformer.ts`                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/json-import.ts`                                        |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/kismet-import.ts`                                      |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/kml-import.ts`                                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/kmlImportUtils.ts`                                     |  96.00% |   80.00% |   100.00% | COVERED   |
| `etl/load/sqlite-import-incremental.ts`                          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/load/sqlite-import.ts`                                      |  98.92% |   70.00% |   100.00% | PARTIAL   |
| `etl/load/sqlite/cli.ts`                                         | 100.00% |   86.66% |   100.00% | COVERED   |
| `etl/load/sqlite/importObservations.ts`                          | 100.00% |   93.75% |   100.00% | COVERED   |
| `etl/load/sqlite/insertObservations.ts`                          | 100.00% |   90.00% |   100.00% | COVERED   |
| `etl/load/sqlite/networkReconciliation.ts`                       | 100.00% |   86.84% |   100.00% | COVERED   |
| `etl/load/sqlite/preflight.ts`                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/sqlite/reader.ts`                                      | 100.00% |   94.44% |   100.00% | COVERED   |
| `etl/load/sqlite/reporting.ts`                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/sqlite/schemaSetup.ts`                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/sqlite/sourceTag.ts`                                   | 100.00% |   85.71% |   100.00% | COVERED   |
| `etl/load/sqlite/validateAndEnrich.ts`                           |  88.23% |   66.66% |   100.00% | PARTIAL   |
| `etl/load/wigle/importer.ts`                                     | 100.00% |   87.50% |   100.00% | COVERED   |
| `etl/load/wigle/loader.ts`                                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/wigle/reader.ts`                                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/load/wigle/transformer.ts`                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/loadEnv.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/promote/process-promotion.ts`                               |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/promote/refresh-mviews.ts`                                  |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/promote/run-scoring.ts`                                     |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/promote/validate-data.ts`                                   |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/repair/repair-missing-networks.ts`                          |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/run-pipeline.ts`                                            |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `etl/transform/deduplicate.ts`                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/transform/enrich-agency-offices-coords-mapbox-forward.ts`   |  96.00% |   73.26% |    93.75% | PARTIAL   |
| `etl/transform/enrich-agency-offices-coords-nominatim.ts`        |  84.37% |   61.36% |    94.44% | PARTIAL   |
| `etl/transform/enrich-agency-offices-coords-opencage-forward.ts` |  91.59% |   69.66% |    93.33% | PARTIAL   |
| `etl/transform/enrich-agency-offices-zip4-smarty.ts`             |  96.00% |   90.00% |    87.50% | COVERED   |
| `etl/transform/enrich-geocoding.ts`                              |  91.93% |   96.87% |    88.88% | COVERED   |
| `etl/transform/normalize-agency-offices-phone.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/transform/normalize-observations.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/transform/process-agencies.ts`                              |  94.08% |   70.88% |    92.00% | PARTIAL   |
| `etl/transform/process-observations.ts`                          |  95.83% |  100.00% |    80.00% | COVERED   |
| `etl/utils/db.ts`                                                |  26.92% |   46.15% |    33.33% | UNCOVERED |
| `etl/utils/deadLetter.ts`                                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `etl/utils/schemas.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |

### `scripts/`

Files: 60

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |      928 / 4283 |   21.66% |
| Branches   |      498 / 2029 |   24.54% |
| Functions  |       136 / 684 |   19.88% |
| Lines      |      858 / 3989 |   21.50% |

| File                                                       |   Lines | Branches | Functions | Verdict   |
| ---------------------------------------------------------- | ------: | -------: | --------: | --------- |
| `scripts/audit/api-route-audit.ts`                         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/audit/architecture/cli.ts`                        |  77.77% |   65.51% |   100.00% | PARTIAL   |
| `scripts/audit/architecture/cruftAnalysis.ts`              |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/audit/architecture/inventory.ts`                  |  56.89% |   62.72% |    50.00% | PARTIAL   |
| `scripts/audit/architecture/modularityAnalysis.ts`         |  20.00% |   17.11% |     8.69% | UNCOVERED |
| `scripts/audit/architecture/reporting.ts`                  |  32.25% |   11.76% |    20.00% | UNCOVERED |
| `scripts/audit/architecture/roadmap.ts`                    |  84.61% |   61.53% |    90.90% | PARTIAL   |
| `scripts/audit/cruft-audit.ts`                             |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `scripts/audit/full-architecture-audit.ts`                 |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `scripts/audit/modularity-audit.ts`                        |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `scripts/audit/refactor-roadmap.ts`                        |   0.00% |  100.00% |   100.00% | UNCOVERED |
| `scripts/backup-sm-to-bitwarden.js`                        |  44.96% |   48.30% |    43.47% | PARTIAL   |
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
| `scripts/generate-password.ts`                             | 100.00% |  100.00% |   100.00% | COVERED   |
| `scripts/generate-sitemap.js`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `scripts/geocoding/export-missing-geocodes.ts`             | 100.00% |   75.00% |   100.00% | PARTIAL   |
| `scripts/geocoding/geocode-addresses.ts`                   |  98.27% |   86.36% |   100.00% | COVERED   |
| `scripts/geocoding/geocode-batch.ts`                       |  98.21% |   94.44% |   100.00% | COVERED   |
| `scripts/geocoding/geocode-wigle.ts`                       |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/geocoding/import-ap-addresses.ts`                 |  95.23% |   87.50% |   100.00% | COVERED   |
| `scripts/geocoding/import-final-geocodes.ts`               |  95.00% |   83.33% |   100.00% | COVERED   |
| `scripts/geocoding/import-geocodes.ts`                     |  96.96% |   85.71% |   100.00% | COVERED   |
| `scripts/geocoding/import-missing-geocodes.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `scripts/geocoding/import-network-addresses.ts`            | 100.00% |  100.00% |   100.00% | COVERED   |
| `scripts/geocoding/reverse-geocode-batch.ts`               |  97.10% |   83.33% |   100.00% | COVERED   |
| `scripts/geocoding/reverse-geocode-observations-sample.ts` |  91.93% |   80.29% |    94.73% | COVERED   |
| `scripts/geocoding/reverse-geocode-parallel.ts`            |  94.11% |   77.77% |   100.00% | PARTIAL   |
| `scripts/geocoding/reverse-geocode-smart.ts`               |  93.84% |   80.00% |    90.90% | COVERED   |
| `scripts/import/import-wigle-parallel.ts`                  |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `scripts/loadEnv.ts`                                       | 100.00% |  100.00% |   100.00% | COVERED   |
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
| `scripts/wigle-daemon.ts`                                  |  32.00% |   18.75% |    57.14% | UNCOVERED |
| `scripts/write-robots.js`                                  | 100.00% |   87.50% |   100.00% | COVERED   |

### `server/src/api/routes/`

Files: 106

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     4321 / 4585 |   94.24% |
| Branches   |     2164 / 2600 |   83.23% |
| Functions  |       461 / 496 |   92.94% |
| Lines      |     4221 / 4464 |   94.55% |

| File                                                                |   Lines | Branches | Functions | Verdict   |
| ------------------------------------------------------------------- | ------: | -------: | --------: | --------- |
| `server/src/api/routes/v1/admin.ts`                                 |  81.11% |   66.66% |    33.33% | UNCOVERED |
| `server/src/api/routes/v1/admin/adminAwsHelpers.ts`                 | 100.00% |   93.33% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/adminGeocodingHelpers.ts`           |  98.14% |   77.96% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/adminNotesHelpers.ts`               |  91.17% |   68.08% |    85.71% | PARTIAL   |
| `server/src/api/routes/v1/admin/adminSecretsHelpers.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/aws.ts`                             | 100.00% |   66.66% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/awsInstances.ts`                    |  89.83% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/backup.ts`                          | 100.00% |   69.56% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/dbStats.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/detectionEvidence.ts`               | 100.00% |   75.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/geocoding.ts`                       | 100.00% |   72.22% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import.ts`                          | 100.00% |   50.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/history.js`                  |  70.00% |   50.00% |    75.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/kml.js`                      |  91.54% |   78.94% |    83.33% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/orphans.js`                  |  90.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/import/sql.js`                      |  98.18% |   75.00% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/import/sqlite.js`                   | 100.00% |   76.47% |    54.54% | PARTIAL   |
| `server/src/api/routes/v1/admin/maintenance.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/media.ts`                           |  97.77% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/notes.ts`                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/oui.ts`                             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/pgadmin.ts`                         | 100.00% |   66.66% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/secrets.ts`                         | 100.00% |   66.66% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/settings.ts`                        |  99.24% |   86.07% |    94.11% | COVERED   |
| `server/src/api/routes/v1/admin/siblings.ts`                        |  97.46% |   72.41% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/admin/tags.ts`                            |  98.48% |   90.32% |   100.00% | COVERED   |
| `server/src/api/routes/v1/admin/users.ts`                           |  87.93% |   94.59% |   100.00% | COVERED   |
| `server/src/api/routes/v1/agencyOffices.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/analytics-public.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/analytics.ts`                             |  98.52% |   62.50% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/auth.ts`                                  | 100.00% |   90.62% |   100.00% | COVERED   |
| `server/src/api/routes/v1/backup.ts`                                |  92.59% |   60.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/claude.ts`                                |  98.00% |   79.16% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/dashboard.ts`                             |  98.50% |   88.04% |   100.00% | COVERED   |
| `server/src/api/routes/v1/dataQuality.ts`                           | 100.00% |   91.66% |   100.00% | COVERED   |
| `server/src/api/routes/v1/deflockCameras.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/explorer.ts`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/explorer/index.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/explorer/networks.ts`                     | 100.00% |   83.87% |   100.00% | COVERED   |
| `server/src/api/routes/v1/explorer/shared.ts`                       |  98.97% |   98.64% |   100.00% | COVERED   |
| `server/src/api/routes/v1/export.ts`                                | 100.00% |   68.75% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/federalCourthouses.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/geocoding.ts`                             | 100.00% |   90.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/geospatial.ts`                            |  93.27% |   79.22% |    69.23% | PARTIAL   |
| `server/src/api/routes/v1/health.ts`                                | 100.00% |   95.83% |   100.00% | COVERED   |
| `server/src/api/routes/v1/home-location.ts`                         |  90.32% |   86.36% |   100.00% | COVERED   |
| `server/src/api/routes/v1/kepler.ts`                                |  91.48% |   69.04% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/keplerHelpers.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/location-markers.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/ml.ts`                                    |  83.80% |   74.13% |    87.50% | PARTIAL   |
| `server/src/api/routes/v1/mobileIngest.ts`                          | 100.00% |   95.12% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-agencies.ts`                      | 100.00% |   92.85% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-tags.ts`                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-tags/index.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-tags/listTags.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/network-tags/manageTags.ts`               |  87.23% |   90.56% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks.ts`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/index.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/handler.ts`                 |  90.00% |   50.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/networks/list/index.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parseParams.ts`             | 100.00% |   75.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/networks/list/parsers/networkIdentity.ts` | 100.00% |   90.69% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parsers/pagination.ts`      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parsers/signalFilters.ts`   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parsers/spatialFilters.ts`  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/list/parsers/threatFilters.ts`   |  96.77% |   89.28% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/manufacturer.ts`                 |  92.68% |   81.25% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/notes.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/observations.ts`                 |  96.95% |   94.01% |   100.00% | COVERED   |
| `server/src/api/routes/v1/networks/search.ts`                       |  84.00% |   75.00% |    33.33% | UNCOVERED |
| `server/src/api/routes/v1/networks/tags.ts`                         |  96.51% |   82.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/settings.ts`                              | 100.00% |   77.77% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/settingsHelpers.ts`                       |  87.09% |   68.96% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/settingsMultiSecretRoutes.ts`             |  80.61% |   61.70% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/settingsSecretRoutes.ts`                  |  89.28% |   70.00% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/shotspotterSensors.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/shotspotterZones.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/threat-report.ts`                         |  95.00% |   81.81% |   100.00% | COVERED   |
| `server/src/api/routes/v1/threats.ts`                               |  78.12% |   83.33% |    50.00% | PARTIAL   |
| `server/src/api/routes/v1/wigle.ts`                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/database.ts`                        |  75.19% |   63.77% |    60.00% | PARTIAL   |
| `server/src/api/routes/v1/wigle/detail.ts`                          |  98.11% |   82.14% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/enrichment.ts`                      |  96.87% |   90.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/index.ts`                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/ledger.ts`                          |  97.93% |   86.84% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/live.ts`                            |  93.54% |   87.50% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/observations.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/search.ts`                          |  81.60% |   85.88% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/stats.ts`                           |  90.90% |   63.63% |   100.00% | PARTIAL   |
| `server/src/api/routes/v1/wigle/status.ts`                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v1/wigle/validation.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered.ts`                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/handlers/analytics.ts`           |  86.66% |   33.33% |   100.00% | UNCOVERED |
| `server/src/api/routes/v2/filtered/handlers/geospatial.ts`          | 100.00% |   77.77% |   100.00% | PARTIAL   |
| `server/src/api/routes/v2/filtered/handlers/list.ts`                |  98.11% |   80.64% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/handlers/matchedMedia.ts`        | 100.00% |   86.36% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/handlers/observations.ts`        | 100.00% |   92.85% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/handlers/unmatchedMedia.ts`      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/index.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/observationsBuilder.ts`          | 100.00% |   88.46% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filtered/utils.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filteredHandlers.ts`                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/api/routes/v2/filteredHelpers.ts`                       | 100.00% |   88.05% |   100.00% | COVERED   |
| `server/src/api/routes/v2/networks.ts`                              | 100.00% |   84.37% |   100.00% | COVERED   |
| `server/src/api/routes/v2/threats.ts`                               | 100.00% |  100.00% |   100.00% | COVERED   |

### `server/src/services/`

Files: 220

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     8046 / 8446 |   95.26% |
| Branches   |     4943 / 5676 |   87.08% |
| Functions  |     1202 / 1299 |   92.53% |
| Lines      |     7631 / 7975 |   95.68% |

| File                                                                                        |   Lines | Branches | Functions | Verdict   |
| ------------------------------------------------------------------------------------------- | ------: | -------: | --------: | --------- |
| `server/src/services/admin/adminHelpers.ts`                                                 |  80.59% |   71.79% |    73.33% | PARTIAL   |
| `server/src/services/admin/dataQualityAdminService.ts`                                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/importExportAdminService.ts`                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/importService.ts`                                                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/networkTagCore.ts`                                               | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/services/admin/networkTagOui.ts`                                                | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/services/admin/networkTagsAdminService.ts`                                      | 100.00% |   93.33% |   100.00% | COVERED   |
| `server/src/services/admin/settingsAdminService.ts`                                         | 100.00% |   83.33% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/adminQueryAdapter.ts`                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/orchestrators/SiblingDetectionOrchestrator.ts`  |  91.83% |   80.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/rules/extraRules.ts`                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/cancelSiblingRefresh.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/getSiblingRefreshStatusReconciled.ts` | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/getSiblingStats.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/getSiblingStatsByRule.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/purgeSiblingPairs.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/runSiblingRefreshJob.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetection/use-cases/startSiblingRefresh.ts`               | 100.00% |   84.61% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetectionAdminService.ts`                                 | 100.00% |  100.00% |     0.00% | UNCOVERED |
| `server/src/services/admin/siblingDetectionConstants.ts`                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetectionQueries.ts`                                      | 100.00% |   81.81% |   100.00% | COVERED   |
| `server/src/services/admin/siblingDetectionState.ts`                                        | 100.00% |   88.23% |   100.00% | COVERED   |
| `server/src/services/adminDbService.ts`                                                     |  93.24% |   72.30% |   100.00% | PARTIAL   |
| `server/src/services/adminDbStatsService.ts`                                                |  96.15% |  100.00% |    50.00% | PARTIAL   |
| `server/src/services/adminImportHistoryService.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminMaintenanceService.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminNetworkMediaService.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminNetworkTagsService.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminOrphanNetworksService.ts`                                         |  98.61% |   90.24% |   100.00% | COVERED   |
| `server/src/services/adminSettingsService.ts`                                               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminSiblingService.ts`                                                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/adminUsersService.ts`                                                  | 100.00% |   95.23% |   100.00% | COVERED   |
| `server/src/services/agencyService.ts`                                                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/aiInsightsService.ts`                                                  | 100.00% |   80.00% |   100.00% | COVERED   |
| `server/src/services/analytics/coreAnalytics.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/analytics/helpers.ts`                                                  |  96.42% |   96.29% |   100.00% | COVERED   |
| `server/src/services/analytics/index.ts`                                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/analytics/networkAnalytics.ts`                                         | 100.00% |   94.73% |   100.00% | COVERED   |
| `server/src/services/analytics/threatAnalytics.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/analyticsService.ts`                                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/authQueries.ts`                                                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/authService.ts`                                                        |  98.71% |   97.14% |   100.00% | COVERED   |
| `server/src/services/authWrites.ts`                                                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/awsService.ts`                                                         |  81.57% |   55.00% |   100.00% | PARTIAL   |
| `server/src/services/backgroundJobs/config.ts`                                              | 100.00% |   83.33% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/mlBehavioralScoring.ts`                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/mvRefresh.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/runners.ts`                                             |  98.67% |   85.57% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/settings.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/backgroundJobs/surveillanceScoring.ts`                                 | 100.00% |   90.21% |   100.00% | COVERED   |
| `server/src/services/backgroundJobsService.ts`                                              |  79.36% |   62.29% |    47.22% | PARTIAL   |
| `server/src/services/backup/awsCli.ts`                                                      | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/services/backup/backupUtils.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/backup/config.ts`                                                      | 100.00% |   90.00% |   100.00% | COVERED   |
| `server/src/services/backup/fileManager.ts`                                                 | 100.00% |   85.71% |   100.00% | COVERED   |
| `server/src/services/backup/pgEnv.ts`                                                       | 100.00% |   93.93% |   100.00% | COVERED   |
| `server/src/services/backup/pgTools.ts`                                                     |  94.79% |   93.33% |    91.30% | COVERED   |
| `server/src/services/backup/postgresToolchain.ts`                                           |  90.35% |   72.41% |    87.50% | PARTIAL   |
| `server/src/services/backup/s3Operations.ts`                                                |  76.66% |   16.66% |    80.00% | UNCOVERED |
| `server/src/services/backup/sourceDetector.ts`                                              |  94.73% |   71.42% |   100.00% | PARTIAL   |
| `server/src/services/backupService.ts`                                                      | 100.00% |   84.61% |   100.00% | COVERED   |
| `server/src/services/bedrockService.ts`                                                     | 100.00% |   83.33% |   100.00% | COVERED   |
| `server/src/services/cacheService.ts`                                                       |  94.28% |   92.59% |    87.50% | COVERED   |
| `server/src/services/courthouseService.ts`                                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/dashboardService.ts`                                                   | 100.00% |   66.66% |   100.00% | PARTIAL   |
| `server/src/services/dataQualityFilters.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/deflockService.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/explorerQueries.ts`                                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/explorerService.ts`                                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/explorerSorting.ts`                                                    | 100.00% |   91.66% |   100.00% | COVERED   |
| `server/src/services/exportService.ts`                                                      | 100.00% |   93.33% |   100.00% | COVERED   |
| `server/src/services/externalServiceHandler.ts`                                             | 100.00% |   88.88% |   100.00% | COVERED   |
| `server/src/services/featureFlagService.ts`                                                 |  96.00% |   90.47% |   100.00% | COVERED   |
| `server/src/services/filteredAnalyticsService.ts`                                           |  97.14% |   90.62% |    91.66% | COVERED   |
| `server/src/services/filterQueryBuilder/builders/GeospatialQueryBuilder.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/builders/NetworkListQueryBuilder.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/builders/NetworkOnlyQueryBuilder.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/constants.ts`                                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/engagementPredicates.ts`                            | 100.00% |   90.47% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/FilterBuildContext.ts`                              |  96.96% |   89.79% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/FilterPredicateBuilder.ts`                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/index.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/AnalyticsModule.ts`                         | 100.00% |    0.00% |   100.00% | UNCOVERED |
| `server/src/services/filterQueryBuilder/modules/analyticsQueryBuilders.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/analyticsQueryContext.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/GeospatialModule.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/geospatialQueryBuilders.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/geospatialQueryContext.ts`                  | 100.00% |   87.50% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathBuilder.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathCountBuilder.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathIdentityPredicates.ts`       | 100.00% |   93.54% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathListBuilder.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathPredicates.ts`               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathSecurityPredicates.ts`       |  95.31% |   86.04% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkFastPathSupplementalPredicates.ts`   | 100.00% |   95.23% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkMetricsBuilder.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/NetworkModule.ts`                           |  91.11% |   84.21% |    86.66% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkNoFilterBuilder.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkPredicateAdapters.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/networkSlowPathBuilder.ts`                  | 100.00% |   90.90% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/observationFilterBuilder.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/observationIdentityPredicates.ts`           | 100.00% |   90.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/ObservationModule.ts`                       |  92.30% |   92.85% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/observationSecurityTemporalPredicates.ts`   | 100.00% |   91.78% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/modules/observationSpatialQualityPredicates.ts`     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/networkWhereBuilder.ts`                             |  95.08% |   85.61% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/normalizers.ts`                                     |  98.51% |   95.87% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/QueryState.ts`                                      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/radioPredicates.ts`                                 |  96.77% |   94.73% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/SchemaCompat.ts`                                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/spatialHelpers.ts`                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/sqlExpressions.ts`                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/SqlFragmentLibrary.ts`                              | 100.00% |   75.00% |   100.00% | PARTIAL   |
| `server/src/services/filterQueryBuilder/threatCategoryLevels.ts`                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/universalFilterQueryBuilder.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/filterQueryBuilder/validators.ts`                                      |  84.61% |   92.15% |   100.00% | COVERED   |
| `server/src/services/geocoding/cacheDatabase.ts`                                            |  92.30% |   78.57% |    80.00% | PARTIAL   |
| `server/src/services/geocoding/cacheStats.ts`                                               |  84.61% |  100.00% |    33.33% | UNCOVERED |
| `server/src/services/geocoding/cacheStore.ts`                                               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/geocoding/cacheUtils.ts`                                               | 100.00% |   92.59% |   100.00% | COVERED   |
| `server/src/services/geocoding/daemonRuntime.ts`                                            |  67.47% |   53.57% |    76.92% | PARTIAL   |
| `server/src/services/geocoding/daemonState.ts`                                              | 100.00% |   95.45% |   100.00% | COVERED   |
| `server/src/services/geocoding/jobState.ts`                                                 | 100.00% |   76.92% |   100.00% | PARTIAL   |
| `server/src/services/geocoding/mapbox.ts`                                                   |  97.61% |   75.40% |   100.00% | PARTIAL   |
| `server/src/services/geocoding/providerRuntime.ts`                                          | 100.00% |   92.00% |   100.00% | COVERED   |
| `server/src/services/geocoding/providers.ts`                                                | 100.00% |   94.01% |   100.00% | COVERED   |
| `server/src/services/geocodingCacheService.ts`                                              |  82.58% |   58.94% |    78.94% | PARTIAL   |
| `server/src/services/homeLocationService.ts`                                                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/kepler/keplerTransforms.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/keplerService.ts`                                                      | 100.00% |   70.00% |    40.00% | PARTIAL   |
| `server/src/services/miscService.ts`                                                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/ml/modelScoring.ts`                                                    |  98.11% |   95.00% |   100.00% | COVERED   |
| `server/src/services/ml/repository.ts`                                                      |  84.84% |   70.83% |    81.81% | PARTIAL   |
| `server/src/services/ml/scoringService.ts`                                                  | 100.00% |   94.44% |   100.00% | COVERED   |
| `server/src/services/ml/trainer.ts`                                                         |  97.50% |   93.33% |   100.00% | COVERED   |
| `server/src/services/mlTrainingLock.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/mobileIngestService.ts`                                                |  87.36% |   65.00% |    84.61% | PARTIAL   |
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
| `server/src/services/networkListService.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networkService.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/networkTagService.ts`                                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/observationService.ts`                                                 | 100.00% |   91.66% |    66.66% | PARTIAL   |
| `server/src/services/ouiGroupingService.ts`                                                 | 100.00% |   90.38% |   100.00% | COVERED   |
| `server/src/services/pgadmin/control.ts`                                                    | 100.00% |   96.00% |   100.00% | COVERED   |
| `server/src/services/pgadmin/runtime.ts`                                                    |  96.77% |   88.57% |    93.33% | COVERED   |
| `server/src/services/pgadminService.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/reports/threatReportRenderers.ts`                                      | 100.00% |   96.15% |   100.00% | COVERED   |
| `server/src/services/reports/threatReportUtils.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/secretsManager.ts`                                                     |  92.68% |   76.40% |   100.00% | PARTIAL   |
| `server/src/services/shotspotterSensorsService.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/threatReportService.ts`                                                |  97.67% |   90.19% |    90.90% | COVERED   |
| `server/src/services/threatScoringService.ts`                                               |  92.77% |   66.15% |    93.75% | PARTIAL   |
| `server/src/services/v2Queries.ts`                                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/v2Service.ts`                                                          | 100.00% |  100.00% |    70.00% | PARTIAL   |
| `server/src/services/visint/visintExif.ts`                                                  |  89.74% |   65.00% |   100.00% | PARTIAL   |
| `server/src/services/visint/visintPipeline.ts`                                              |  84.95% |   70.00% |    80.00% | PARTIAL   |
| `server/src/services/visint/visintScorer.ts`                                                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigle/api.ts`                                                          | 100.00% |   97.72% |   100.00% | COVERED   |
| `server/src/services/wigle/database.ts`                                                     |  97.84% |   87.93% |   100.00% | COVERED   |
| `server/src/services/wigle/detail.ts`                                                       | 100.00% |   96.29% |   100.00% | COVERED   |
| `server/src/services/wigle/persistence.ts`                                                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigle/shared.ts`                                                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigle/wigleGateway.ts`                                                 | 100.00% |   88.67% |   100.00% | COVERED   |
| `server/src/services/wigle/wigleKmlSyncService.ts`                                          |  97.02% |   79.83% |    83.33% | PARTIAL   |
| `server/src/services/wigleAuditLogger.ts`                                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleClient.ts`                                                        |  96.20% |   75.47% |    88.23% | PARTIAL   |
| `server/src/services/wigleDetailService.ts`                                                 | 100.00% |   97.50% |   100.00% | COVERED   |
| `server/src/services/wigleDetailTransforms.ts`                                              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/mappers/enrichmentMapper.ts`                           |  91.48% |   82.45% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/orchestrators/WigleEnrichmentOrchestrator.ts`          |  90.42% |   88.37% |    81.81% | COVERED   |
| `server/src/services/wigleEnrichment/repositories/enrichmentReadRepository.ts`              |  91.93% |   86.95% |    84.61% | COVERED   |
| `server/src/services/wigleEnrichment/repositories/wigleApiCreditGateway.ts`                 |  90.47% |   80.00% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/use-cases/forceClearEnrichmentRun.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/use-cases/resumeEnrichment.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/use-cases/runEnrichmentLoop.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/use-cases/startBatchEnrichment.ts`                     |  96.42% |   88.46% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichment/use-cases/validateWigleApiCredit.ts`                   |  94.73% |   90.00% |   100.00% | COVERED   |
| `server/src/services/wigleEnrichmentFetcher.ts`                                             |  87.50% |   60.00% |   100.00% | PARTIAL   |
| `server/src/services/wigleEnrichmentService.ts`                                             | 100.00% |  100.00% |    71.42% | PARTIAL   |
| `server/src/services/wigleImport/authProvider.ts`                                           | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/btApiClient.ts`                                            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/btPageProcessor.ts`                                        | 100.00% |   60.00% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/btParams.ts`                                               |  97.14% |   78.26% |    90.00% | PARTIAL   |
| `server/src/services/wigleImport/mappers/buildCreateImportRunInput.ts`                      | 100.00% |   94.11% |   100.00% | COVERED   |
| `server/src/services/wigleImport/orchestrators/WigleImportRunOrchestrator.ts`               |  96.00% |   84.04% |   100.00% | COVERED   |
| `server/src/services/wigleImport/pageProcessor.ts`                                          |  88.00% |   71.42% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/params.ts`                                                 |  96.92% |   92.18% |   100.00% | COVERED   |
| `server/src/services/wigleImport/rateLimitingStrategy.ts`                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/repositories/runReadRepository.ts`                         |  92.59% |   80.00% |    85.71% | COVERED   |
| `server/src/services/wigleImport/runRepository.ts`                                          |  99.19% |   94.82% |    95.45% | COVERED   |
| `server/src/services/wigleImport/runStateManager.ts`                                        |  97.82% |   93.75% |   100.00% | COVERED   |
| `server/src/services/wigleImport/serialization.ts`                                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/use-cases/bulkDeleteGlobalCancelledCluster.ts`             |  83.33% |   50.00% |   100.00% | PARTIAL   |
| `server/src/services/wigleImport/use-cases/getImportCompletenessReport.ts`                  | 100.00% |   88.23% |   100.00% | COVERED   |
| `server/src/services/wigleImport/use-cases/manageImportRuns.ts`                             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/wigleApiClient.ts`                                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleImport/wigleApiSpec.ts`                                           |  96.15% |   93.33% |   100.00% | COVERED   |
| `server/src/services/wigleImport/wigleBluetoothImportService.ts`                            |  97.91% |   83.11% |    80.00% | COVERED   |
| `server/src/services/wigleImportRunService.ts`                                              | 100.00% |  100.00% |    66.66% | PARTIAL   |
| `server/src/services/wigleImportService.ts`                                                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleLimits.ts`                                                        |  50.00% |   31.25% |    50.00% | UNCOVERED |
| `server/src/services/wigleRequestLedger.ts`                                                 |  84.93% |   81.48% |    88.23% | COVERED   |
| `server/src/services/wigleRequestUtils.ts`                                                  | 100.00% |   96.42% |   100.00% | COVERED   |
| `server/src/services/wigleScheduler.ts`                                                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleSearchApiService.ts`                                              |  92.85% |   93.75% |   100.00% | COVERED   |
| `server/src/services/wigleSearchCache.ts`                                                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/services/wigleSearchService.ts`                                                 |  85.71% |   58.49% |   100.00% | PARTIAL   |
| `server/src/services/wigleSearchTransforms.ts`                                              |  83.33% |   44.44% |   100.00% | PARTIAL   |
| `server/src/services/wigleService.ts`                                                       | 100.00% |  100.00% |   100.00% | COVERED   |

### `server/src/repositories/`

Files: 24

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |       780 / 817 |   95.47% |
| Branches   |       385 / 479 |   80.37% |
| Functions  |       194 / 208 |   93.26% |
| Lines      |       743 / 774 |   95.99% |

| File                                                            |   Lines | Branches | Functions | Verdict |
| --------------------------------------------------------------- | ------: | -------: | --------: | ------- |
| `server/src/repositories/adminNetworkMediaRepository.ts`        | 100.00% |   87.50% |   100.00% | COVERED |
| `server/src/repositories/adminNetworkTagOuiRepository.ts`       | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/adminNetworkTagRepository.ts`          | 100.00% |   83.33% |   100.00% | COVERED |
| `server/src/repositories/agencyRepository.ts`                   |  83.33% |   50.00% |    75.00% | PARTIAL |
| `server/src/repositories/baseRepository.ts`                     |  91.22% |   51.42% |   100.00% | PARTIAL |
| `server/src/repositories/courthouseRepository.ts`               | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/deflockRepository.ts`                  | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/exportRepository.ts`                   | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/jobRunRepository.ts`                   | 100.00% |   83.33% |   100.00% | COVERED |
| `server/src/repositories/keplerRepository.ts`                   | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/kmlImportRepository.ts`                | 100.00% |   78.37% |   100.00% | PARTIAL |
| `server/src/repositories/mobileIngestRepository.ts`             |  89.47% |   50.00% |    92.30% | PARTIAL |
| `server/src/repositories/networkRepository.ts`                  | 100.00% |   89.39% |   100.00% | COVERED |
| `server/src/repositories/shotspotterRepository.ts`              | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/shotspotterSensorsRepository.ts`       | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/siblingPruningRepository.ts`           | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/siblingRunRepository.ts`               | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/surveillanceDetectionRepository.ts`    | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/surveillanceDetectionRepositorySql.ts` | 100.00% |  100.00% |   100.00% | COVERED |
| `server/src/repositories/threatRepository.ts`                   |  86.66% |   57.44% |   100.00% | PARTIAL |
| `server/src/repositories/v2Repository.ts`                       | 100.00% |   93.58% |   100.00% | COVERED |
| `server/src/repositories/wigleEnrichmentRepository.ts`          |  95.00% |  100.00% |    50.00% | PARTIAL |
| `server/src/repositories/wiglePersistenceRepository.ts`         |  84.37% |   90.74% |    50.00% | PARTIAL |
| `server/src/repositories/wigleQueriesRepository.ts`             |  95.00% |   65.85% |    86.36% | PARTIAL |

### `server/src/ (other)`

Files: 55

| Metric     | Covered / Total | Coverage |
| ---------- | --------------: | -------: |
| Statements |     1697 / 1745 |   97.24% |
| Branches   |     1055 / 1129 |   93.44% |
| Functions  |       249 / 260 |   95.76% |
| Lines      |     1665 / 1711 |   97.31% |

| File                                                   |   Lines | Branches | Functions | Verdict   |
| ------------------------------------------------------ | ------: | -------: | --------: | --------- |
| `server/src/config/container.ts`                       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/config/database.ts`                        |  73.07% |   46.87% |    33.33% | UNCOVERED |
| `server/src/config/loadEnv.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/config/routeConfig.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/constants/jurisdictions.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/appInit.ts`            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/backgroundJobsInit.ts` | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/credentialsInit.ts`    |  87.50% |  100.00% |    50.00% | PARTIAL   |
| `server/src/core/initialization/dashboardInit.ts`      | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/databaseInit.ts`       | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/errorHandlingInit.ts`  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/middlewareInit.ts`     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/core/initialization/routesInit.ts`         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/errors/AppError.ts`                        |  98.11% |   94.11% |    92.85% | COVERED   |
| `server/src/errors/errorHandler.ts`                    | 100.00% |   80.00% |   100.00% | COVERED   |
| `server/src/logging/logger.ts`                         | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/authMiddleware.ts`              | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/cacheMiddleware.ts`             |  85.71% |   90.90% |    60.00% | PARTIAL   |
| `server/src/middleware/commonMiddleware.ts`            | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/httpsRedirect.ts`               | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/requestId.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/securityHeaders.ts`             | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/spaFallback.ts`                 | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/middleware/staticAssets.ts`                | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/types/express.d.ts`                        |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/types/ml-logistic-regression.d.ts`         |   0.00% |    0.00% |     0.00% | UNCOVERED |
| `server/src/utils/asyncHandler.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/databaseSetup.ts`                    | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/envFlag.ts`                          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/envSanitizer.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/escapeSQL.ts`                        | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/frequencyUtils.ts`                   | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/networkSqlExpressions.ts`            |  98.11% |   93.93% |   100.00% | COVERED   |
| `server/src/utils/queryPerformanceTracker.ts`          | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/utils/routeMounts.ts`                      |  98.00% |   90.00% |   100.00% | COVERED   |
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
| `server/src/validation/schemas.ts`                     | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/validation/schemas/commonSchemas.ts`       |  94.36% |   90.55% |   100.00% | COVERED   |
| `server/src/validation/schemas/complexValidators.ts`   |  99.36% |   96.26% |   100.00% | COVERED   |
| `server/src/validation/schemas/geospatialSchemas.ts`   |  96.87% |   97.43% |   100.00% | COVERED   |
| `server/src/validation/schemas/networkSchemas.ts`      |  97.41% |   96.59% |   100.00% | COVERED   |
| `server/src/validation/schemas/temporalSchemas.ts`     |  93.13% |   92.85% |   100.00% | COVERED   |
| `server/src/views/ouiGroupingDemo.ts`                  | 100.00% |  100.00% |   100.00% | COVERED   |
| `server/src/websocket/ssmTerminal.ts`                  |  93.10% |   84.37% |    89.47% | COVERED   |

## Next Opportunities

Files ranked by engineering value: uncovered decision paths (branches) and entry points (functions) weighted above raw statement count.
Route handlers, services, validators, and parsers are prioritised over utility and configuration files.
Declaration files (`.d.ts`), barrel re-exports (`index.ts/js`), and the report generator itself are excluded.

| Rank | File                                               | Score | Uncov. Branches | Uncov. Functions | Uncov. Statements | Branches | Functions |
| ---: | -------------------------------------------------- | ----: | --------------: | ---------------: | ----------------: | -------: | --------: |
|    1 | `scripts/audit/api-route-audit.ts`                 |  3182 |             327 |               85 |               440 |    0.00% |     0.00% |
|    2 | `etl/load/fbi-locations.ts`                        |  2272 |             244 |               38 |               328 |    0.00% |     0.00% |
|    3 | `scripts/db-audit/generate-audit-report.js`        |  1794 |              82 |               46 |               559 |    0.00% |     0.00% |
|    4 | `scripts/enrichment/enrichment-system.ts`          |  1074 |              85 |               45 |               192 |    0.00% |     0.00% |
|    5 | `scripts/audit/architecture/modularityAnalysis.ts` |   880 |              92 |               21 |               122 |   17.11% |     8.69% |
|    6 | `etl/load/kml-import.ts`                           |   818 |              74 |               22 |               143 |    0.00% |     0.00% |
|    7 | `server/src/api/routes/v1/wigle/database.ts`       |   744 |              46 |                6 |                36 |   63.77% |    60.00% |
|    8 | `scripts/enrichment/enrich-multi-source.ts`        |   732 |              49 |               42 |               135 |    0.00% |     0.00% |
|    9 | `scripts/import/import-wigle-parallel.ts`          |   710 |              55 |               17 |               156 |    0.00% |     0.00% |
|   10 | `etl/load/kismet-import.ts`                        |   698 |              62 |               26 |               111 |    0.00% |     0.00% |
|   11 | `scripts/score-all-hybrid.ts`                      |   630 |              74 |                5 |                83 |    0.00% |     0.00% |
|   12 | `scripts/audit/architecture/inventory.ts`          |   624 |              63 |               16 |                91 |   62.72% |    50.00% |
|   13 | `scripts/check-modularity.js`                      |   614 |              62 |               11 |                99 |    0.00% |     0.00% |
|   14 | `server/src/services/geocodingCacheService.ts`     |   612 |              39 |                4 |                28 |   58.94% |    78.94% |
|   15 | `scripts/backup-sm-to-bitwarden.js`                |   582 |              61 |               13 |                82 |   48.30% |    43.47% |

## Verdict Scale

| Verdict   |      Coverage |
| --------- | ------------: |
| COVERED   |        >= 80% |
| PARTIAL   | 40% to 79.99% |
| UNCOVERED |         < 40% |
