# Surveillance Gear Detection Feature Documentation

ShadowCheck implements multi-tier surveillance device detection heuristics on top of captured signals, Wi-Fi attributes, Bluetooth indicators, and spatial leak overlaps.

---

## 1. Classification Heuristics

Heuristics logic is implemented in the database-backed services and repositories.

- **Scoring Engine**: `server/src/repositories/surveillanceDetectionRepository.ts`
- **Heuristic Tiers**: Evaluates 18 distinct tiers of device flags, including:
  - **WiFi matching**: OUIs in `app.oui_device_groups` with specific SSIDs (e.g. `'Flock-[hex]'`, `'DEI-[digits]'`).
  - **BLE matching**: BLE manufacturer IDs (e.g., `0x09C8` / `0x034D`) and service UUID profiles.
  - **Class of Device (COD)**: Fingerprints indicating cameras or recording apparatus.
- **Scoring Penalties/Bonuses**: Evaluated in `surveillanceScoring.ts`. Adjusts confidence depending on packet count thresholds, RSSI levels, and overlapping criteria (e.g., multi-signal matches).

---

## 2. Media Integration

Attached evidence files (e.g., photos from VisINT captures) are saved directly against BSSIDs.

- **Evidence Storage**: `app.network_media`
- **Safeguards**: Employs a strict database write gate. Exploratory pipeline runs default `commit=false` to prevent unwanted database writes. Commits require explicit `commit=true`.
- **Sentinel Confirmation**: Attaching evidence to the sentinel `VISINT_UNMATCHED` BSSID requires an explicit confirmation flag `confirm_fallback=true`.

---

## 3. Reference Geolocation Leaks (Flock & ShotSpotter)

Matches local detections against leaked coordinates or publicly indexed locations of surveillance nodes.

- **DeFlock Layer**: Matches local observations against `app.deflock_cameras` within 100m. Surfaces matches via `app.surveillance_deflock_matches`.
- **ShotSpotter Layer**: Matches local observations against leaked coordinates in `app.shotspotter_sensors` within 200m. Surfaces matches via `app.surveillance_shotspotter_sensor_matches`.
- **UI Maps**: Rendered on the WiGLE explorer map page ([WigglePage.tsx](../../client/src/components/WigglePage.tsx)) via layer controllers in [WiggleControlPanel.tsx](../../client/src/components/WiggleControlPanel.tsx) using the `useDeflockCameras` and `useShotspotterSensors` custom Mapbox GL JS/Deck.gl overlays.

---

## 4. Verification Tests

- **Classification Repository Heuristics**: `tests/integration/repositories/surveillanceDetectionRepository.test.ts`
- **Scoring Rules Adjustment**: `tests/unit/services/backgroundJobs/surveillanceScoring.test.ts`
- **Scan Ingestion Job**: `tests/unit/services/backgroundJobs/runSurveillanceScanJob.test.ts`
- **ShotSpotter Filter predicates**: `tests/unit/surveillanceFilterPredicates.test.ts`
- **Wired Leak Layer Ingestion tests**: `tests/unit/observationService.test.ts`
