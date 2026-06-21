# Media Evidence Workflow

**Related ADR:** `docs/ai/decisions/20260614_media_evidence_attachment_model.md`

This document defines the step-by-step procedure for attaching, surfacing, and managing media evidence in ShadowCheck. It is the operational companion to the ADR.

---

## Core rule

```
Attach specifically.
Surface broadly.
Label honestly.
Delete carefully.
```

> A feature is not mature when it works once; it is mature when its meaning is stable.

---

## Feature maturity ladder

Before starting any media work, label its maturity level:

| Level | Label        | Meaning                                                 |
| ----- | ------------ | ------------------------------------------------------- |
| 0     | Spark        | "This might matter." No code.                           |
| 1     | Sketch       | Rough notes, maybe no code.                             |
| 2     | Probe        | Read-only query, scratch helper, prototype UI.          |
| 3     | Experimental | Works in limited cases; not trusted as core truth.      |
| 4     | Candidate    | Has definitions, examples, tests, and known tradeoffs.  |
| 5     | Mature       | Stable schema/API/UI, docs, tests, cleanup done.        |
| 6     | Legacy/cruft | Was useful once; needs review, replacement, or removal. |

**The danger is not having half-baked ideas. The danger is letting a level-2 artifact become indistinguishable from intentional level-5 architecture.**

Tell the agent explicitly:

- `"This is exploratory. Do not create permanent schema."` — for levels 0–3
- `"This is committed architecture. Use migrations, tests, docs, and cleanup."` — for levels 4–5

The `sibling_group_id` column rejected in `_054` is a direct example of a level-2 idea that almost became permanent schema.

---

## Maturity gate

Before writing any new media code, the following must be answered:

1. What is this feature's maturity level? (see ladder above)
2. Is this casual/reference media or evidentiary/provenance media?
3. What is the most specific anchor available? (`observation_id` > `bssid`)
4. How was the correlation made? (EXIF GPS match, VISINT pipeline, manual bssid-direct upload)
5. Is the match confidence known?
6. Is deletion safe? Will removing this from a view silently delete the asset?
7. **Does the operator have enough context to make a meaningful association?** (SSID context, location, timestamp — the operator is always in the loop for the final association decision.)

If any of these are undefined, stop and define them before implementing.

---

## Attachment procedure

### Evidentiary media (field capture, VISINT-correlated)

1. Capture image in field. Confirm EXIF GPS is present.
2. Upload via `POST /api/observations/correlate-visint` with `commit=false` first.
3. Review the preview: inspect `matched_bssid`, `match_confidence`, `exif_lat/lon`, `distance_m`.
4. If the match is acceptable, re-submit with `commit=true`.
5. The system writes the record to `app.network_media` with `bssid` = matched BSSID and `observation_id` = matched observation.
6. Source BSSID and observation ID are now the permanent evidence anchors.

**Do not skip the preview step.** `commit=false` is the default for this reason.

### Casual/reference media (bssid-direct)

1. Upload via `POST /api/admin/network-media/upload` with the target `bssid`.
2. `observation_id` will be NULL — that is acceptable for reference attachments.
3. Label the `description` field honestly: note that this is a reference image, not field-captured.

---

## Surfacing procedure

### From a single network (Explorer popup / network detail)

- Call `GET /api/admin/network-media/:bssid`
- Render inline via `GET /api/admin/network-media/:id/inline`
- Display `source_bssid`, `observation_id` (if set), `exif_captured_at`, and match provenance

### From a sibling component

- Query `app.v_sibling_group_media WHERE member_bssid = '<any component member>'`
- Returns media attached to all BSSIDs in the connected component
- Always display `source_bssid` — make clear the media belongs to that specific radio, not the whole box
- Use language like "Media from component members" not "Box media"

### On the geospatial map (media layer)

Matched-media component grouping and interaction semantics are defined in
[`docs/ai/decisions/20260620_matched_media_map_layer_visual_spec.md`](../ai/decisions/20260620_matched_media_map_layer_visual_spec.md).

Two categories, visually distinct:

| Category                                     | Plot location               | Style              |
| -------------------------------------------- | --------------------------- | ------------------ |
| Matched media (`bssid != VISINT_UNMATCHED`)  | Network `lat`/`lon` from MV | Teal/green dot     |
| Unmatched media (`bssid = VISINT_UNMATCHED`) | EXIF `exif_lat`/`exif_lon`  | Pink dot (current) |

Clicking either plots an inline popup with the image, filename, source BSSID, and capture timestamp.

---

## Deletion procedure

Two distinct operations — never conflate them:

### Remove from view (disassociate)

- Detaches the media record from a specific view context (e.g. a note, a component surfacing)
- Does not delete the underlying `app.network_media` row or binary data
- Use when: media is not relevant to this specific note/view but should be preserved as evidence

### Delete asset (permanent)

- Deletes the `app.network_media` row and the stored binary (`media_data`)
- Irreversible
- Use `DELETE /api/admin/network-media/media/:id`
- UI must show a confirmation dialog that names the file and the BSSID it's anchored to
- If `observation_id` is set, warn that this media is anchored to a specific observation

**Never implement a single "remove" button that silently deletes the asset.**

---

## Invariants (must hold at all times)

1. `network_media.bssid` is never NULL. Every record has a BSSID anchor.
2. `network_media.observation_id` is nullable. NULL means bssid-scoped only — not an error.
3. `bssid = 'VISINT_UNMATCHED'` is the sentinel for media that failed VISINT correlation. It is never a real network.
4. `app.v_sibling_group_media` is a read-only discovery view. It does not create ownership.
5. `app.mv_sibling_groups.group_id` is a derived lexicographic root, not a stable foreign key. Never store it as a FK on other tables.
6. `network_sibling_pairs.id` is an edge-row handle. Never use it as a group/component identifier.
7. Deleting a sibling pair row must not cascade-delete media. (This is why `_054`'s `ON DELETE CASCADE` from media → pair was rejected.)

---

## API reference

| Endpoint                                        | Purpose                                     |
| ----------------------------------------------- | ------------------------------------------- |
| `POST /api/admin/network-media/upload`          | Bssid-direct upload (casual)                |
| `GET /api/admin/network-media/:bssid`           | List all media for a BSSID                  |
| `GET /api/admin/network-media/:id/inline`       | Serve image inline for `<img src>`          |
| `GET /api/admin/network-media/download/:id`     | Download media file                         |
| `DELETE /api/admin/network-media/media/:id`     | Permanently delete media asset              |
| `POST /api/observations/correlate-visint`       | VISINT correlation preview (`commit=false`) |
| `POST /api/observations/attach-visint`          | VISINT explicit commit                      |
| `GET /api/v2/networks/filtered/unmatched-media` | GeoJSON of unmatched media for map layer    |

---

## Test regimen

Layered by scope, same philosophy as Android's small/medium/large/RC pyramid:

**Small (unit — logic-level, no DB)**

- Does image-match ranking prefer `observation_id` anchor over bssid-only?
- Does temporal/geospatial scoring produce correct confidence values?
- Does the sibling component query return all transitive members (A–B, B–C → A,B,C)?
- Does a singleton BSSID (no siblings) still surface its own media correctly?

**Medium (integration — DB queries, no browser)**

- Does `GET /api/admin/network-media/:bssid` return the correct records?
- Does `app.v_sibling_group_media` preserve `source_bssid` and `observation_id`?
- Does the view correctly exclude `VISINT_UNMATCHED` sentinel records?
- Does deleting a sibling pair row NOT cascade-delete attached media?

**Large (end-to-end — full API + DB flow)**

- Upload image → associate to observation/BSSID → view network → confirm image surfaces with provenance.
- Upload image to component member B → view from A → confirm image surfaces with `source_bssid = B`.
- Delete asset → confirm record and binary are gone → confirm view no longer returns it.

**Release candidate (manual)**

- Real browser check with a real sample image.
- Operator confirms the association is reasonable given SSID/location/timestamp context.
- Confirm provenance fields (`source_bssid`, `observation_id`, `exif_captured_at`) are visible in the UI.
- Confirm delete flow shows confirmation naming the file and the BSSID it's anchored to.

---

## Known gaps (as of 2026-06-14)

- No `match_method` or `match_confidence` field on `network_media`. These should be added before evidentiary workflows are exposed in the UI.
- Explorer network popup has no media panel. `GET /api/admin/network-media/:bssid` is unwired from the frontend.
- Geospatial media layer only plots `VISINT_UNMATCHED` media. Matched media with known network coordinates is not yet plotted.
- No two-step delete UI. The current delete button is a single action.
