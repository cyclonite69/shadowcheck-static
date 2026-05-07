# ADR: Sibling Detection V2 — mac_increment and band_pair Modalities

**Date:** 2026-05-07  
**Status:** Accepted  
**Harness:** `~/repos/letsminedata/sibling-mining/harness/`  
**Harness results:** `HARNESS_RESULTS_V3.md`

---

## Context

The existing sibling detection pipeline (`siblingDetectionAdminService.ts`) runs
against `app.networks` using rules like `ssid_exact`, `heuristic_last_octet`, and
`same_oui_proximity`. It operates on the materialized view and network-level data.

Two additional modalities were validated in the harness against live observation
data before integration. A third modality (`spatial_rssi`) was tested and rejected.

---

## Modalities Accepted

### mac_increment_v1

**Logic:** Same OUI (first 3 octets) + last-octet delta ≤ 4.  
**Confidence:** 0.85 for delta ≤ 2; 0.70 for delta 3–4.  
**Source:** `app.observations` only.  
**Harness result:** 27 detections, 15 matched existing (56%), 12 new, avg_conf 0.811.

**Critical data source quirk:** `app.observations` contains non-WiFi rows — BLE
(`radio_frequency=7936`), cellular (EARFCN values like 66586), and zero-frequency
rows. These make up ~44% of the table. Without `WHERE radio_frequency BETWEEN 2412
AND 5825`, a 1000-row `LIMIT` returns 100% non-WiFi rows and produces garbage MAC
pairs. This filter is mandatory and must not be removed.

**Spot-check verdict:** All 12 new detections share OUI or base OUI (after clearing
the locally-administered bit). The `7C:9A:54` cluster (TP-Link) shows a chain of 4
BSSIDs (8B→8D→8F→90) consistent with a 4-radio AP. Delta-4 pairs (conf 0.70) are
marginal but structurally sound for enterprise APs.

**Decision:** Accept delta ≤ 2 (conf 0.85) unconditionally. Accept delta 3–4 (conf
0.70) as candidates — they require spatial confirmation before promotion to `strong`.

---

### band_pair_v1

**Logic:** Same SSID + different band (2.4 GHz vs 5 GHz) + haversine ≤ 20m + mac_dist ≤ 2.  
**Confidence:** 0.95 fixed.  
**Sources:** `app.observations` (WiFi-filtered) UNION `app.wigle_v3_observations`.  
**Harness result:** 9 detections, 5 matched existing (55%), 4 new, avg_conf 0.950.

**Critical data source quirk:** `app.wigle_v3_observations.channel` is 0/77,646
populated (effectively NULL). The table has a `frequency` column (MHz) that is
58,729/77,646 populated. The harness was originally selecting `channel` — this
produced zero band_pair detections. Changed to `frequency`. Both sources now go
through the same `BETWEEN 2412 AND 5825` / `BETWEEN 5170 AND 5825` band gates.

**Spot-check verdict:** All 9 pairs at 7–18m with mac_dist 1–2. Textbook dual-band
AP detections. Low recall (9 per 1000 seeds) is expected — this is a precision
modality. The 55% match rate against existing pairs is strong signal.

---

## Modality Rejected

### spatial_rssi

**Harness result:** 2582 detections, 21 matched existing (0.8%), 2561 new.

Tightening the distance threshold from 50m to 15m had no effect on count. The false
positives are not from pairs at 16–50m — they are pairs at <15m that are
geographically coincident in crowdsourced WiGLE data but physically unrelated. WiGLE
GPS accuracy is ±10–15m, so two unrelated APs scanned at the same intersection by
different wardrivers appear co-located.

**Required before integration:**

1. Pair-level deduplication (count each BSSID pair once, not once per observation)
2. OUI or SSID constraint to reduce cross-AP false positives
3. Retest — target < 100 new detections per 1000 seeds with > 20% match rate

**Do not integrate at any distance threshold without these changes.**

---

## Implementation

- **Service:** `server/src/services/siblingDetectionService.ts`
- **Route:** `server/src/api/routes/v1/siblingDetection.ts`
- **Endpoints:**
  - `POST /api/sibling-detection/run` — trigger detection run (adminGate)
  - `GET /api/sibling-detection/stats` — counts by rule for detection_pipeline_v2 pairs (adminGate)
- **Migration:** `sql/migrations/20260507_sibling_detection_v2_indexes.sql`
  - Adds indexes on `rule`, `pair_strength`, `source` — no DDL changes to existing columns

All new pairs are written with `pair_strength='candidate'` and
`source='detection_pipeline_v2'`. ON CONFLICT only upgrades confidence, never
downgrades. Existing pairs are not modified or deleted.

---

---

## Modalities Added (2026-05-07 — second pass)

### xfinity_sig_v1

**Logic:** Octets 2–5 identical (`SUBSTRING(bssid, 4, 11)`) while octet 1 and/or
octet 6 differ. Xfinity/Commscope/Arris gateways assign the same middle 4 octets
to all radios; the first octet varies for LA-bit virtual interfaces and the last
octet increments per radio/SSID.  
**Confidence:** 1.0 fixed (hardware signature match is deterministic).  
**Sources:** `app.observations` (WiFi-filtered) UNION `app.wigle_v3_observations`.  
**Harness result (run_1778155295, limit=2000, source=both):** 971 detections,
avg_conf=1.000, 25 matched existing, 47 new, max 10 candidates per seed.  
**Example:** `A4:01:DE:7C:D2:CA` ↔ `16:01:DE:7C:D2:CB` — middle=`01:DE:7C:D2`,
first octet LA-bit variant, last octet delta 1.

---

## Modality Rejected (2026-05-07 — second pass)

### fleet_unit

**Harness result (run_1778155302, limit=2000, source=both):** 8 detections,
avg_conf=1.000, 0 matched existing, 0 new.

The 0 matched_existing and 0 new flags indicate the 8 pairs exist in neither the
existing 584 heuristic pairs nor as novel detections corroborated by any other
method. The example pair `26:BC:EC:09:2F:56 → 26:BC:EC:24:5A:9A` has no visible
PAS/MDT SSID pattern — the harness may be matching on a different code path.
With only 8 detections and zero structural corroboration, this does not meet the
integration bar. The dataset likely contains very few PAS/MDT fleet SSIDs.

**Required before integration:** Verify the dataset contains PAS/MDT SSIDs; if not,
this modality is correct but inapplicable to this operator's data.

---

## Production Thresholds (updated)

```
MAC_INCREMENT_MAX_DELTA   = 4      (conf 0.85 for ≤2, conf 0.70 for 3–4)
BAND_PAIR_MAX_DIST_M      = 20.0
BAND_PAIR_MAX_MAC_DIST    = 2
BAND_PAIR_CONFIDENCE      = 0.95 (fixed)
XFINITY_SIG_CONFIDENCE    = 1.0  (fixed — hardware signature is deterministic)
```
