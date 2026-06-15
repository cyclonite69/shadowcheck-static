# ShadowCheck Cruft Register

**Purpose:** Track artifacts (schema, code, routes, docs) that exist but whose status is ambiguous, incomplete, or pending cleanup. Prevents level-2/3 probes from being mistaken for level-5 committed architecture.

**Rule:** Schema cruft is the most dangerous. Agents will see a column/view/table and assume it is intentional truth. Label it here before that assumption causes a bad migration.

---

## Status taxonomy

| Status       | Meaning                                                              |
| ------------ | -------------------------------------------------------------------- |
| `KEEP`       | Useful and intentional. No action needed.                            |
| `WATCH`      | Probably useful, but immature or incomplete. Do not build on it yet. |
| `QUARANTINE` | Do not build on this without review. May be misleading.              |
| `DEPRECATE`  | Still present, should be replaced. Do not add new references.        |
| `EXECUTE`    | Remove in a scoped cleanup. Approved for deletion.                   |

---

## Entries

### `_054` sibling_group_scope migration (no-op)

| Field               | Value                                                                                                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**           | `sql/migrations/20260614_054_sibling_group_scope.sql`                                                                                                                                                                                                                                                                                                               |
| **Status**          | `KEEP` (intentional no-op)                                                                                                                                                                                                                                                                                                                                          |
| **Why it exists**   | Original DDL added `sibling_group_id FK → network_sibling_pairs(id)` on `network_media` and `network_notes`. Rejected before application to `shadowcheck_db` because `network_sibling_pairs.id` is an edge-row handle, not a component identifier. The file is kept as a `SELECT 1` no-op so the migration ledger can be stamped and the runner proceeds to `_055`. |
| **Risk if removed** | Migration runner gap; `_055` would be applied without `_054` ledger entry, breaking sequential ordering expectations.                                                                                                                                                                                                                                               |
| **Risk if left**    | None. The comment in the file documents the rejection clearly.                                                                                                                                                                                                                                                                                                      |
| **Decision**        | Leave as no-op. The comment is the artifact.                                                                                                                                                                                                                                                                                                                        |

---

### `app.network_media.sibling_group_id` (does NOT exist in `shadowcheck_db`)

| Field              | Value                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**          | Would have been created by `_054`                                                                                                            |
| **Status**         | `KEEP` (rejected, never created)                                                                                                             |
| **Why it matters** | This column exists in `shadowcheck_test` due to out-of-band schema drift before `_054` was rewritten. It does NOT exist in `shadowcheck_db`. |
| **Risk**           | If `shadowcheck_test` is ever used as a migration baseline, this orphaned column could cause confusion.                                      |
| **Decision**       | Document the drift. If `shadowcheck_test` is ever reconciled, remove this column at that time. Do not add it to `shadowcheck_db`.            |

---

### `app.network_notes.sibling_group_id` (does NOT exist in `shadowcheck_db`)

Same situation as `network_media.sibling_group_id` above. Exists in `shadowcheck_test` only due to drift.

---

### Media layer (`useMediaLocationLayers`) — only plots `VISINT_UNMATCHED`

| Field             | Value                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Files**         | `client/src/components/geospatial/hooks/useMediaLocationLayers.ts`, `server/src/repositories/adminNetworkMediaRepository.ts` (`selectUnmatchedMediaPoints`)                                                                    |
| **Status**        | `WATCH`                                                                                                                                                                                                                        |
| **Why it exists** | Built for the VISINT unmatched sentinel workflow. Only queries `WHERE bssid = 'VISINT_UNMATCHED'`. Hook renamed to `useMediaLocationLayers`; Mapbox layer IDs renamed to `media-location-*`. Rename complete as of 2026-06-15. |
| **Gap**           | Matched media (real BSSIDs with `exif_lat`/`exif_lon` or MV `lat`/`lon`) is not plotted at all. The media layer icon on the geospatial page is therefore misleading — it only shows the fallback case.                         |
| **Risk if left**  | Operators cannot see matched media on the map. Feature appears broken.                                                                                                                                                         |
| **Next action**   | Expand `selectUnmatchedMediaPoints` to return all media with plottable coordinates, differentiated by match status. See `docs/workflow/media-evidence-workflow.md` Known Gaps.                                                 |

---

### Explorer network popup — no media panel

| Field             | Value                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Files**         | `client/src/components/geospatial/overlays/`                                                                                  |
| **Status**        | `WATCH`                                                                                                                       |
| **Why it exists** | Network popup exists and shows notes, but has no section calling `GET /api/admin/network-media/:bssid`.                       |
| **Gap**           | Operators cannot see BSSID-attached media from the map popup or Explorer table row without using the inline API URL directly. |
| **Next action**   | Add a media panel to the network detail overlay. See `docs/workflow/media-evidence-workflow.md` Known Gaps.                   |

---

### `match_method` / `match_confidence` fields missing on `network_media`

| Field              | Value                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**          | `app.network_media` table, `sql/migrations/`                                                                                                                                             |
| **Status**         | `WATCH`                                                                                                                                                                                  |
| **Why it matters** | Without these fields, the UI cannot display how a media record was correlated (EXIF GPS, VISINT pipeline, manual upload) or how confident that correlation is. This is a provenance gap. |
| **Risk if left**   | Evidentiary media cannot be distinguished from casual reference media in the UI. Operators cannot assess correlation quality.                                                            |
| **Next action**    | Define `match_method` enum and `match_confidence` numeric range before adding any UI that surfaces evidentiary media. This is a maturity gate blocker for the evidence workflow.         |

---

### `shadowcheck_test` migration ledger drift

| Field             | Value                                                                                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**         | `shadowcheck_test` database                                                                                                                                                                                                                                      |
| **Status**        | `QUARANTINE`                                                                                                                                                                                                                                                     |
| **Why it exists** | `shadowcheck_test` is ~33 migrations behind `shadowcheck_db` on the 20260507–20260607 sibling rule block. Several objects exist in the schema without corresponding ledger entries (schema drift from out-of-band application).                                  |
| **Risk if left**  | Running the migration runner against `shadowcheck_test` will re-apply already-applied migrations if their ledger entries are missing, potentially causing errors or double-application.                                                                          |
| **Next action**   | Reconcile the test DB ledger before using it as a migration target. Insert synthetic ledger rows for already-applied migrations, then run the runner for the outstanding block. Do not use `shadowcheck_test` as a migration validation target until reconciled. |

---

## How to add an entry

Copy this template:

```markdown
### <short name>

| Field               | Value                                            |
| ------------------- | ------------------------------------------------ |
| **Files**           |                                                  |
| **Status**          | `WATCH` / `QUARANTINE` / `DEPRECATE` / `EXECUTE` |
| **Why it exists**   |                                                  |
| **Risk if left**    |                                                  |
| **Risk if removed** |                                                  |
| **Next action**     |                                                  |
```
