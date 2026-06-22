# UI Specification: Matched Media Map Layer & Carousel Popup

**Date:** 2026-06-22<br />
**Status:** Approved Specification (Lane D - Docs Only)<br />
**Related Documents:**

- [Matched Media Visual Spec](20260620_matched_media_map_layer_visual_spec.md)
- [Media Evidence Workflow](../../workflow/media-evidence-workflow.md)
- [VISINT Evidence Pipeline](../../features/visint-evidence-pipeline.md)

---

## 1. Purpose

The Matched Media Map Layer and Carousel Popup visualizes verified wireless network evidence on the Geospatial Explorer map.

### Key Design Principles:

1. **Evidence-First Representation:** Matched media pins represent physical field evidence (photographs, screenshots, capture events), **not network-location estimates**. They are spatial markers of real-world objects linked to wireless infrastructure.
2. **Honest Provenance & Transparency:** Location data carries varying levels of precision. Analysts must immediately understand _how_ and _why_ a piece of evidence is rendered at a specific coordinate. Conflating capture points with hardware centroids creates "false precision," which is a severe hazard in forensics. Displaying the location source is a core requirement.

---

## 2. Data Sources & Coordinate Priority

When rendering matched-media pins, the system pulls coordinates and metadata from the backend `/api/v2/networks/filtered/matched-media` endpoint.

To prevent coordinate drift and maintain strict spatial coherence, coordinates must be resolved as a **source-paired set** (rather than coalescing latitude and longitude independently). The resolver priority is:

1. **Observation Coordinates (`observation_lat`, `observation_lon`):**
   - _Source:_ The exact coordinates of the physical wireless observation (`app.observations.geom`) linked to the media row.
   - _Meaning:_ Mapped to the specific point where the hardware signal was logged.
   - _Wording on Map:_ `Linked network location`.
2. **EXIF Capture Coordinates (`capture_lat`, `capture_lon`):**
   - _Source:_ Coordinates parsed directly from the camera image header.
   - _Meaning:_ The location where the operator stood when capturing the media.
   - _Wording on Map:_ `Captured here`.

3. **Network Fallback Coordinates (`network_lat`, `network_lon`):**
   - _Source:_ The estimated center of the network's known locations (materialized view centroid).
   - _Meaning:_ A rough estimate of the hardware location (typically showing a 1 km default shift or fallback offset).
   - _Wording on Map:_ `Estimated network fallback location`.

### `marker_location_source` Semantic Meanings:

- **`observation`:** The pin is plotted at the precise location of the associated radio scan. High confidence.
- **`exif`:** The pin is plotted at the location where the photo was taken (EXIF GPS). Medium confidence.
- **`network`:** Mapped to the estimated network hardware location. Low spatial confidence (requires fallback warnings).

---

## 3. Map Layer Behavior

The map layer is managed alongside the unmatched media layer in the Geospatial Explorer view.

### Marker Visualization:

- **Matched Media Pin Color:** Teal/Green (`#0D9488` or `#14B8A6`), distinctly contrasting with the pink unmatched media pins (`#EC4899`).
- **Cluster Aggregation:** Render **one marker per sibling component** (connected network group). Sibling components represent a single physical network box hosting multiple BSSIDs.
- **Singleton Handling:** A BSSID without confirmed siblings is treated as a component of size one.
- **Marker Badging:**
  - **Count Badge:** If a component/marker contains multiple media items (derived from `media_ids`), display a small teal count badge (e.g., `+3`) in the top-right quadrant of the marker.
  - **Warning Badge:** If the coordinates fallback to the network center (`marker_location_source = 'network'`), overlay a small amber warning symbol (⚠️) on the marker.

```
       [+] Count Badge (+3)
      /
   ( ● ) <-- Teal Matched Media Marker
    \
     [⚠️] Fallback Warning (if source is 'network')
```

---

## 4. Popup/Carousel Behavior

Clicking a matched media marker triggers a custom Mapbox popup showing the **Media Carousel**.

### Popup Components:

1. **Selected Image Preview:**
   - Large rendering of the active media item.
   - Click action: Opens the full-resolution uncompressed file in a new tab (`/api/v2/networks/media/:id/inline`).
2. **Carousel Slider (Thumbnail Strip):**
   - Rendered at the bottom of the popup for markers containing multiple media items.
   - Shows horizontal scrollable list of square thumbnails.
   - Active thumbnail has a prominent white/teal border highlight.
3. **Previous / Next Controls:**
   - Overlay arrow buttons on the left and right sides of the main preview.
   - Visually hidden when the carousel contains only a single item.
4. **Metadata & Provenance Panel:**
   - **Filename:** Full file name (truncated with CSS text-overflow if too long).
   - **Media ID:** The database identifier for tracking and reference.
   - **Source BSSID:** The specific BSSID that holds the media file.
   - **Observation Link:** Clickable text `obs #<id>` if `observation_id` is populated, navigating to the detailed observation log.
   - **Captured Timestamp:** Rendered as EXIF Captured date or file upload date.
5. **Location Provenance Badge:**
   - Shows the active `marker_location_source` with tailored styles:
     - `observation`: Solid Green badge: `"Observation Match"`
     - `exif`: Solid Blue badge: `"EXIF GPS Match"`
     - `network`: Warning Amber badge: `"Network Centroid Fallback"`
6. **Distance & Error Wording:**
   - If both observation and EXIF coordinates are available, calculate and display the delta distance: `"Captured {dist_meters}m from observation point"`.
   - If `marker_location_source = 'network'`, show: `⚠️ Estimated position only. Exact capture or observation coordinates missing.`

---

## 5. Empty, Error, and Loading States

Robust handling of unexpected data and network lag:

- **Loading State:** While fetching the GeoJSON or lazy-loading image buffers, display a skeleton loader with a spinning circle.
- **No Thumbnail:** For non-image media types (e.g., video files or screenshots without thumbs), render a dark grey container with a film symbol (🎬) or asset icon.
- **Broken Image:** If the source URL fails to load (HTTP 404, 500, or invalid data), catch the error via `onError` and render a fallback graphic: `"Preview Unavailable"`.
- **Missing EXIF GPS:** If the image lacks EXIF headers, display: `"Metadata: Capture location not embedded in file"`.
- **Missing Observation ID:** If the item was directly uploaded to a BSSID, display: `"Metadata: Reference Image (not field correlated)"`.

---

## 6. Accessibility (A11y)

To support desktop accessibility standards:

- **Keyboard Controls:**
  - When the popup is open, pressing `ArrowLeft` and `ArrowRight` must cycle the active media item.
  - Pressing `Enter` on the main preview must trigger the full-screen view.
- **Alt Text:** Set programmatic descriptive labels for screen readers:
  - `alt="Evidence photo for BSSID {source_bssid} ({filename})"`
- **Focus Management:**
  - Upon opening, the Mapbox popup container receives keyboard focus.
  - Upon closing, focus is restored to the marker or the map container.
- **Semantic Markup:**
  - Standard HTML structure for button tags (Next/Prev/View) with explicit `aria-label` fields.
  - High contrast text colors: White/slate (`#f8fafc`) on dark grey/blue (`#0f172a`) backgrounds.

---

## 7. Implementation Target Files

During the implementation phase, modifications must be restricted to the following locations:

### 1. API Integration:

- **`client/src/api/networkApi.ts`**
  - Define typescript interfaces for the GeoJSON feature payload returned by the matched-media endpoint.
  - Add method `getMatchedMediaGeoJson(): Promise<GeoJSON.FeatureCollection>` querying `/api/v2/networks/filtered/matched-media`.

### 2. Map Layer hook:

- **`client/src/components/geospatial/hooks/useMediaLocationLayers.ts`**
  - Add logic to fetch and register the matched-media GeoJSON source.
  - Define Mapbox layers for matched media: `matched-media-markers` (teal), count badges, and fallback warning overlays.
  - Register click events to instantiate the React popup overlay.

### 3. Carousel Component (New):

- **`client/src/components/geospatial/media/MatchedMediaCarouselPopup.tsx`**
  - Create the UI layout containing the image preview, previous/next buttons, scrollable thumbnail row, and metadata details block.
  - Manage carousel index state and arrow key event listeners.

### 4. Verification Tests (New):

- **`tests/unit/useMediaLocationLayers.test.ts`**
  - Verify correct endpoint is hit, layers are registered, and event handlers are mounted.
- **`tests/unit/MatchedMediaCarouselPopup.test.tsx`**
  - Mount the carousel with mock items.
  - Assert correct rendering of provenance badges.
  - Test keyboard navigation (`ArrowLeft` / `ArrowRight`) and bounds checks.

---

## 8. Non-Goals

The scope of this UI work is strictly limited. The following tasks are **non-goals** and must not be touched:

- No database migrations or schema adjustments.
- No retrospective database geometry repair (already verified and locked).
- No updates to the backend VISINT uploader logic or ETL ingestion modules.
- No changes to general Explorer map filters unrelated to the media overlay.

---

## 9. Acceptance Criteria

1. **Concurrent Rendering:** Both unmatched (pink) and matched (teal) media pins display concurrently on the map when the media layer toggle is active.
2. **Carousel Popup:** Clicking a matched media marker opens the carousel popup displaying all connected sibling component files.
3. **Observation Accuracy:** Pins using the `observation` source must plot at the exact observation coordinate and must not experience the 1 km fallback shift.
4. **Clear Fallbacks:** Markers using the `network` source are visibly marked with warning badges and explicit fallback headers in the popup.
5. **Fluid Navigation:** Paging through multiple images using the keyboard arrows or clicks operates correctly with bound loop-around logic (pagers wrap around at boundaries).
6. **Jest Coverage:** Unit tests cover all key UI behaviors: index navigation, accessibility keys, and fallback warn states.
