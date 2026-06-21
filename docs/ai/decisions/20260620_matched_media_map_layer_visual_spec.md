# Design: Matched Media Map Layer Visual Specification

**Date:** 2026-06-20  
**Status:** Approved direction, pre-implementation  
**Related:** [Media Evidence Workflow](../../workflow/media-evidence-workflow.md), [Media Evidence Attachment Model](20260614_media_evidence_attachment_model.md)

---

## Scope

This note defines the visual rendering contract for matched media
(`app.network_media.bssid != 'VISINT_UNMATCHED'`) on the Geospatial Explorer map.
It defines correct behavior before implementation; it is not an implementation plan.

Not covered here:

- persistence and EXIF extraction, which are handled separately;
- global versus selected-network activation, except that the first implementation is selection-triggered;
- unmatched-media styling, which remains the existing pink marker;
- exact pixel-level styling.

## Core Decision: One Marker per Sibling Component

Matched media clusters at the physical sibling-component level, not at the individual
BSSID level. A connected component in `app.mv_sibling_groups` represents one physical
network or device across multiple radios. Media remains owned by its specific source
BSSID, but is discoverable from every member of that component through
`app.v_sibling_group_media`.

Rendering one marker per BSSID would split a single component into multiple markers even
though clicking any member is expected to surface the same connected media pool. The map
therefore renders one marker for all media attached to all member BSSIDs in a component.

A BSSID without confirmed siblings is conceptually a component of size one. The current
`app.mv_sibling_groups` does not materialize singleton rows, so implementations must
synthesize the singleton component key from the BSSID when no MV membership exists. This
is a storage/query detail; the visual model remains uniform.

The existing `selectRelatedNetworkMediaForBssid` path aligns with this discovery contract:
it unions direct and component media, excludes `VISINT_UNMATCHED`, and de-duplicates by
media ID with direct rows winning. A selection-triggered UI may reuse that media list as
the selected component's media rather than treating it as belonging collectively to the
requested BSSID.

## Open Question: Component Marker Position

Component members may have different radio positions. The marker-position algorithm is
not yet decided. Candidates include:

- centroid of all member BSSID positions;
- position of the root BSSID (`group_id`, currently the lexicographic minimum);
- position of the member with the most or most-recent media;
- position of the most recently observed member.

The decision should be validated against real multi-member components containing media.
The 2026-06-20 diagnostic found no overlap between the checked matched-media BSSIDs and
`app.mv_sibling_groups`, so current rows cannot resolve this question empirically.

Regardless of marker position, every displayed media item must preserve and show its
specific `source_bssid`. Marker aggregation must never imply that the component owns an
item equally across all radios.

## Marker Styling

- Use the teal/green matched-media family defined by the media workflow; unmatched media
  remains pink.
- If any media item across the component carries an investigation/threat designation,
  render a weighted variant of the same base marker using ring, saturation, or border
  weight.
- Do not introduce per-tag marker icons for `SHOTSPOTTER_SENSOR`, `VISINT_VERIFIED`,
  `VISINT_CONFIRMED`, or similar tags. Those remain popup details.

## Click Interaction

Clicking the component marker opens a popup or panel containing all media across all
component members. Each item shows:

- thumbnail;
- filename;
- source BSSID;
- full tag list;
- `exif_captured_at`;
- observation link when `observation_id` exists.

Use the label **Media from component members**, never **Box media**.

## Existing-Path Alignment and Remaining Contract Gaps

`selectRelatedNetworkMediaForBssid` already implements the required direct-plus-component
discovery and media-ID de-duplication. It should be reused rather than reimplemented for a
selection-triggered component media list.

Its current response does not yet expose all fields required by this visual specification:

- no component/group identifier;
- no tag list or threat designation for weighted marker styling;
- no coordinate fields for marker placement.

Those payload gaps must be resolved explicitly during implementation. Reusing the existing
discovery query does not mean treating its current sidebar response as a complete map-layer
contract.

## Deferred Decisions

- marker-position algorithm for multi-member components;
- video marker and popup behavior when real video evidence exists;
- exact pixel styling;
- global, non-selection-triggered matched-media layer.

## Operating Invariant

> Attach specifically. Surface broadly. Label honestly.

The component marker is a discovery surface. It does not change media ownership or
provenance.
