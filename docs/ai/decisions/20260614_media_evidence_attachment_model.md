# Decision: Media Evidence Attachment Model

**Date:** 2026-06-14
**Context:** Media subsystem design — surfacing VISINT/field images through geospatial explorer and sibling component views

---

## Problem

The media subsystem was being treated as a file-upload feature. Two design errors emerged during migration work (\_054/\_055):

1. `_054` proposed `sibling_group_id → network_sibling_pairs(id)` on `network_media` and `network_notes`. This confused a pair-edge row handle with a physical-box component identifier, and would have made media appear equally "owned" by every BSSID in the group.
2. The `v_sibling_group_media` view (\_055) was implemented using a pair-based CTE instead of the connected-component MV, so transitive siblings (A–B, B–C → component {A,B,C}) would not have been correctly surfaced from A.

Both were caught before reaching `shadowcheck_db`. \_054 was rewritten as a no-op. \_055 was rewritten to route through `app.mv_sibling_groups`.

The deeper issue: no settled evidence model existed. Code was being written against an undefined data contract.

---

## Decision

Media in ShadowCheck is evidentiary, not just files. The model has two modes:

**Casual / reference attachment**

- Operator attaches an image loosely to a network (bssid-scoped only).
- No specific observation anchor required.
- Use case: device photo from vendor docs, reference image, deployment context.

**Evidentiary / provenance attachment**

- Operator attaches media captured in the field, correlated to a specific observation.
- Must anchor to the most specific layer available: `observation_id` first, `bssid` fallback.
- Use case: field photo with EXIF GPS, VISINT-correlated image.

### Storage rule

```
media → observation_id   (most specific anchor, nullable)
media → bssid            (fallback anchor, always required)
```

`observation_id` was added by migration `_052`. It is nullable — existing bssid-scoped records are unaffected.

### Discovery rule

Media is **discoverable** from the physical sibling component without being **owned** by it.

```
Given BSSID A:
  find A's connected component via app.mv_sibling_groups
  find all member BSSIDs in that component
  return media attached to any member BSSID or their observations
```

This is implemented in `app.v_sibling_group_media` (migration `_055`).

### Provenance fields that must always be visible

| Field                   | Meaning                                           |
| ----------------------- | ------------------------------------------------- |
| `source_bssid`          | The BSSID the media actually belongs to           |
| `observation_id`        | The specific observation anchor, if set           |
| `created_at`            | Upload timestamp                                  |
| `exif_captured_at`      | EXIF capture timestamp (field evidence timestamp) |
| `exif_lat` / `exif_lon` | GPS from EXIF (field capture location)            |

These must not be masked, overwritten, or implied to belong equally to all component members.

### Delete semantics (two distinct operations)

| Operation          | Meaning                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| Remove association | Detach media from this BSSID/observation view without deleting the asset |
| Delete asset       | Permanently remove the media record and binary data                      |

These must be separate UI actions with separate confirmation flows. Deleting an evidentiary asset from a component view must not silently delete the underlying record.

---

## Rules (immutable)

```
Attach specifically.
Surface broadly.
Label honestly.
Delete carefully.
```

1. Media belongs to the specific observation/BSSID it matched — not to the component.
2. The component view is a discovery layer only. It is read-only with respect to ownership.
3. UI language must reflect discovery, not ownership: "Media from component members" not "Box media."
4. `sibling_group_id → network_sibling_pairs(id)` must never be added to media or notes tables. Pair-edge IDs are not component identifiers.
5. Component membership is derived from `app.mv_sibling_groups`, not from raw `network_sibling_pairs` pair rows.
6. Any new media query that joins through siblings must use `mv_sibling_groups` (connected components), not a direct pair CTE.

---

## What was applied

| Migration                           | Status             | Notes                                                                  |
| ----------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `_052` network_media observation_fk | ✅ applied         | Adds nullable `observation_id` FK to `app.observations`                |
| `_053` sibling_pairs surrogate pk   | ✅ applied         | Adds `id BIGSERIAL` to `network_sibling_pairs` as edge handle only     |
| `_054` sibling_group_scope          | ✅ applied (no-op) | Original DDL rejected; `SELECT 1` placeholder so ledger is stamped     |
| `_055` v_sibling_group_media        | ✅ applied         | View routes through `mv_sibling_groups`; no `sibling_group_id` columns |

---

## Future work gates

Before any further media UI or API work, the following must be defined first:

- Match method field: how was this media correlated? (EXIF GPS, manual, VISINT pipeline, bssid-direct upload)
- Confidence field: what is the strength of the correlation?
- The geospatial photo layer should plot matched media at network `lat`/`lon` and unmatched media at EXIF GPS, with visual distinction.
- The Explorer network popup needs a media panel calling `GET /api/admin/network-media/:bssid`.

See `docs/workflow/media-evidence-workflow.md` for the step-by-step procedure.
