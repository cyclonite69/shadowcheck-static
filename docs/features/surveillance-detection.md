# Surveillance Gear Detection & Reference Guides

ShadowCheck implements multi-tier surveillance device detection heuristics on top of captured signals, Wi-Fi attributes, Bluetooth indicators, and spatial leak overlaps. It also provides a dedicated SIGINT Reference Library for analyzing equipment manuals and vendor documentation.

---

## 1. Detection vs. Reference Library

- **Surveillance Detection**: A real-time and background classification/inference system. It matches observed radio footprints (SSIDs, OUIs, BLE advertiser states) to catalog known surveillance gear.
- **Surveillance Equipment Guides**: Reference material (e.g., product briefs, leaked documents, manuals) served to the operator. The presence of a guide in the library is a reference tool and does **not** indicate a local device has been detected.

---

## 2. Classification Heuristics & Bodycam (BWC) Signatures

Heuristic classification logic is implemented in the database-backed services and repositories:

- **Scoring Engine**: [surveillanceDetectionRepository.ts](../../server/src/repositories/surveillanceDetectionRepository.ts)
- **Heuristic Categories**: Evaluates 18 distinct tiers of device flags.

### Body-Worn Camera (BWC) Signatures

ShadowCheck specifically identifies mobile body-worn cameras via the following rulesets:

1.  **Axon Body Cameras (`AXON_BODY_CAMERA` & `AXON_SIGNAL_PERIPHERAL`)**:
    - _OUI Matching_: WiFi or BLE networks matching registered Axon Enterprise OUIs in `app.oui_device_groups`.
    - _BLE Manufacturer ID_: BLE advertisements utilizing manufacturer grid `0x034D` (decimal `845` in `mfgrid` column), which is the vendor ID for Axon Enterprise, Inc.
    - _BLE Name Patterns_: Broadcast names matching regular expression `^(axon|taser|signal)` on BLE/Bluetooth rows.
    - _Officer Assignment SSID Pattern_: Wi-Fi networks broadcasting SSIDs matching `^X_[A-Za-z][A-Za-z]+$` (e.g., `X_grodriguez`, `X_jsmith`), reflecting the default Axon BWC assignment scheme. Matches are boosted to a likelihood score of `92` when a matching service UUID corroborates the SSID name.
2.  **Motorola Body Cameras (`MOTOROLA_BWC`)**:
    - _OUI Matching_: BSSIDs matching registered Motorola Solutions OUIs (e.g., `00:04:7D`, `00:18:85`, `00:1F:92`, `4C:CC:34`) tagged with `surveillance_type = 'MOTOROLA_BWC'`.
3.  **DEI Body Cameras (`DEI_BWC`)**:
    - _UUID Matching_: Bluetooth devices broadcasting UUID profiles linked to Digital Ally/DEI hardware.

---

## 3. Surveillance Equipment Guides (SIGINT Library)

The Admin Page contains a **SIGINT Library** tab ([SigintLibraryTab.tsx](../../client/src/components/admin/tabs/SigintLibraryTab.tsx)) that exposes reference manuals and threat documentation:

- **Asset Serving**: Reference documents (HTML/PDF) are served from `docs/references/vendor_docs` via the `/vendor-docs` route configured in `staticAssets.ts`. It is kept outside the standard compiled SPA build bundle, and requests starting with `/vendor-docs` bypass SPA fallback routing.
- **Manifest & Manifest Registry**: The catalog is populated using [vendor_intel_manifest.json](../../client/src/components/vendor-intel/vendor_intel_manifest.json), which classifies entries by `threat_tier`, `category`, and `surveillance_type`.
- **Extraction Script**: The script `scripts/vendor-docs-extract.ts` uses `@mozilla/readability` and `jsdom` to parse raw HTML pages into ShadowCheck-themed HTML inside `extracted/`. It automatically infers source categories (e.g., `leaked`, `foia`, `manufacturer`, `public`, `research`) by filename prefix and filters out sparse pages or bot challenges.

---

## 4. Media & VISINT Integration

Visual Intelligence (VISINT) uploads allow operators to link physical evidence (e.g., photos, screenshots) to observed BSSIDs:

- **Storage**: Evidence files and extracted EXIF metadata are recorded in the `app.network_media` table.
- **Preview Mode Default**: To prevent accidental data contamination, VISINT pipelines run with `commit=false` by default, presenting a preview to the operator. Saving requires an explicit `commit=true` parameter.

---

## 5. Reference Geolocation Leaks (Flock & ShotSpotter)

ShadowCheck correlates local observations against coordinates from external surveillance networks:

- **DeFlock (ALPR Cameras)**: Observational BSSIDs within 100m of known DeFlock coordinates are correlated via the `app.surveillance_deflock_matches` view.
- **ShotSpotter (Acoustic Sensors)**: Scans within 200m of leaked ShotSpotter sensors are matched via the `app.surveillance_shotspotter_sensor_matches` view.
- **Overlay Maps**: Rendered on the WiGLE explorer map page using custom Mapbox GL JS/Deck.gl layers.

---

## 6. Query Parameters & Filters

The following universal query parameters are accepted by the backend query builders:

- `surveillance` (`boolean`) — Matches any positive surveillance classification in `app.surveillance_detections`.
- `bwc` (`boolean`) — Filters specifically for body-worn camera device types: `AXON_BODY_CAMERA`, `MOTOROLA_BWC`, `AXON_SIGNAL_PERIPHERAL`, `DEI_BWC`, or `BT_IMAGING_DEVICE`.

---

## 7. Verification Tests

- **Classification & Signatures**: `tests/integration/repositories/surveillanceDetectionRepository.test.ts`
- **Filter Predicates**: `tests/unit/surveillanceFilterPredicates.test.ts` and `networkFastPathSupplementalPredicates.ts`
- **Equipment Manifest & Resolution**: `tests/unit/deviceIntelLibrary.test.ts`
