"""Generate shadowcheck_oui_fleet.json — Dashboard 3: OUI fleet intelligence."""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from gen_shared import *

# National scope — no state filter on the OUI table itself
NATIONAL_BASE_CTE = f"""base AS (
  SELECT
    v2.bssid, v2.ssid, v2.region, v2.city,
    v2.trilat, v2.trilong, v2.firsttime, v2.lasttime, v2.encryption,
    {OUI_EXPR} AS oui_24,
    rm.manufacturer,
    GREATEST(0, EXTRACT(EPOCH FROM (v2.lasttime - v2.firsttime))/86400) AS span_days
  FROM app.wigle_v2_networks_search v2
  LEFT JOIN app.radio_manufacturers rm
    ON rm.prefix = {OUI_EXPR} AND rm.bit_length = 24
  WHERE v2.ssid ILIKE '%' || '$ssid_pattern' || '%'
    AND v2.country = 'US'
    AND v2.trilat IS NOT NULL
)"""

# ── OUI fleet fingerprint table (national, full width) ─────────────────────────
SQL_OUI_NATIONAL = f"""WITH oui_agg AS (
  SELECT
    {OUI_EXPR} AS oui_prefix,
    rm.manufacturer,
    COUNT(DISTINCT v2.region) AS state_count,
    string_agg(DISTINCT v2.region, ', ' ORDER BY v2.region) AS states,
    COUNT(*) AS record_count,
    ROUND(GREATEST(0, AVG(EXTRACT(EPOCH FROM (v2.lasttime - v2.firsttime))/86400))) AS avg_span_days
  FROM app.wigle_v2_networks_search v2
  LEFT JOIN app.radio_manufacturers rm
    ON rm.prefix = {OUI_EXPR} AND rm.bit_length = 24
  WHERE v2.ssid ILIKE '%' || '$ssid_pattern' || '%' AND v2.country = 'US'
  GROUP BY {OUI_EXPR}, rm.manufacturer
  HAVING COUNT(DISTINCT v2.region) >= 3
)
SELECT
  oui_prefix AS "OUI",
  COALESCE(manufacturer, '⚠ Unregistered') AS "Manufacturer",
  state_count AS "States",
  states AS "State List",
  CASE WHEN state_count >= 30 THEN 'National fleet'
       WHEN state_count >= 15 THEN 'Regional fleet'
       WHEN state_count >= 5  THEN 'Multi-state'
       ELSE 'Local' END AS "Fleet Scope",
  record_count AS "Records",
  avg_span_days AS "Avg Span (d)"
FROM oui_agg
ORDER BY state_count DESC"""

# ── Intra-state OUI concentration ─────────────────────────────────────────────
SQL_CONCENTRATION = f"""WITH state_oui AS (
  SELECT
    v2.region AS state,
    COUNT(*) AS total_records,
    COUNT(DISTINCT {OUI_EXPR}) AS distinct_ouis,
    ROUND(COUNT(DISTINCT {OUI_EXPR})::numeric / NULLIF(COUNT(*),0), 4) AS diversity_ratio,
    (SELECT {OUI_EXPR}
     FROM app.wigle_v2_networks_search v2b
     WHERE v2b.ssid ILIKE '%' || '$ssid_pattern' || '%'
       AND v2b.country = 'US' AND v2b.region = v2.region
     GROUP BY {OUI_EXPR}
     ORDER BY COUNT(*) DESC LIMIT 1) AS dominant_oui
  FROM app.wigle_v2_networks_search v2
  WHERE v2.ssid ILIKE '%' || '$ssid_pattern' || '%'
    AND v2.country = 'US'
    {STATE_FILTER}
  GROUP BY v2.region
  HAVING COUNT(*) >= 5
)
SELECT
  state AS "State",
  total_records AS "Total records",
  distinct_ouis AS "Distinct OUIs",
  diversity_ratio AS "Diversity ratio",
  dominant_oui AS "Dominant OUI",
  CASE WHEN diversity_ratio < 0.10 THEN 'Fleet signal'
       WHEN diversity_ratio < 0.30 THEN 'Moderate concentration'
       ELSE 'High diversity' END AS "Concentration class"
FROM state_oui
ORDER BY diversity_ratio ASC"""

# ── Missing v3 imports by priority tier ───────────────────────────────────────
SQL_MISSING_V3 = f"""WITH {NATIONAL_BASE_CTE},
{OUI_STATES_CTE},
{PROXIMITY_CTE},
classified AS (
  SELECT b.*,
    p.min_dist_m, os.oui_state_count,
    {HW_CASE} AS hw_class,
    {HW_PTS} AS hw_pts,
    {PROX_PTS} AS prox_pts,
    {SPREAD_PTS} AS spread_pts
  FROM base b
  JOIN proximity p ON p.bssid = b.bssid
  JOIN oui_states os ON os.oui_24 = b.oui_24
  WHERE NOT EXISTS (
    SELECT 1 FROM app.wigle_v3_network_details v3 WHERE v3.netid = b.bssid
  )
),
tiers AS (
  SELECT
    CASE hw_class
      WHEN 'mobile_command'    THEN '1-Mobile command'
      WHEN 'fleet_vehicle'     THEN '2-Fleet vehicle'
      WHEN 'residential_agent' THEN '3-Residential agent'
      WHEN 'enterprise'        THEN '4-Enterprise'
    END AS priority_tier,
    COUNT(*) AS count_missing,
    ROUND(AVG(min_dist_m)) AS avg_dist_m,
    ROUND(AVG(span_days)) AS avg_span_days,
    MIN(lasttime) AS oldest_last_seen,
    MAX(lasttime) AS newest_last_seen
  FROM classified
  WHERE hw_class IN ('mobile_command','fleet_vehicle','residential_agent','enterprise')
  GROUP BY hw_class
)
SELECT * FROM tiers
UNION ALL
SELECT 'TOTAL', SUM(count_missing), ROUND(AVG(avg_dist_m)), ROUND(AVG(avg_span_days)),
  MIN(oldest_last_seen), MAX(newest_last_seen)
FROM tiers
ORDER BY priority_tier"""

# ── Text panels ────────────────────────────────────────────────────────────────
TEXT_OUI_FINDINGS = """## OUI fleet fingerprint analysis

**4CD9C4 — Magneti Marelli (43 states)** is the single strongest genuine-agency OUI in the dataset. Magneti Marelli manufactures automotive infotainment systems — specifically the WiFi chipsets embedded in government fleet vehicles. A 43-state spread is not a coincidence; it is a procurement fingerprint. Every federal agency that purchased vehicles with Magneti Marelli infotainment in the same contract cycle will show this OUI.

**The automotive OUI tier** (Magneti Marelli, Mitsumi Electric, Alps Alpine, Panasonic Automotive, Visteon) represents OEM WiFi chipsets in fleet vehicle infotainment systems. These are not aftermarket devices. They appear in vehicles, not buildings. Their presence near field offices indicates fleet vehicles parked in the vicinity — either at the office or at agent residences.

**B20073 — ⚠ Unregistered (33 states)**: No IEEE manufacturer registration exists for this OUI prefix. A 33-state spread with consistent proximity to field offices and no manufacturer record is the highest-priority investigation target in the dataset. Possible explanations: (1) custom-manufactured device for government use, (2) recently registered OUI not yet in the public database, (3) MAC address spoofing with a non-registered prefix. The Tacoma pair (`B2:00:73:5F:D5:E5/E6`) is the anchor record.

**`oui_state_spread >= 30` as a procurement signal**: When an OUI appears in 30+ states, it indicates a national procurement contract — the same hardware purchased across all field offices simultaneously. This is qualitatively different from a local concentration (one city, many records) which could indicate a single large deployment or a wardrive artifact.

**v3 import gap**: Automotive OUIs have the highest national spread but the lowest v3 coverage. The bulk of existing v3 imports are enterprise-class hardware. The mobile command and fleet vehicle tiers are systematically under-imported."""

panels = [
    # Row 1: OUI fleet table (full width, tall — anchor visualization)
    table_panel(1, "National fleet OUI fingerprint", SQL_OUI_NATIONAL,
        x=0, y=0, w=24, h=12,
        overrides=[
            {"matcher": {"id": "byName", "options": "States"},
             "properties": [{"id": "custom.displayMode", "value": "color-background"},
                            {"id": "thresholds", "value": {"mode": "absolute", "steps": [
                                {"color": "white", "value": None},
                                {"color": "light-green", "value": 3},
                                {"color": "green", "value": 15},
                                {"color": "dark-green", "value": 30},
                            ]}}]},
            {"matcher": {"id": "byName", "options": "Manufacturer"},
             "properties": [{"id": "custom.width", "value": 280}]},
            {"matcher": {"id": "byName", "options": "State List"},
             "properties": [{"id": "custom.width", "value": 400}]},
        ]),

    # Row 2: OUI findings text
    text_panel(2, "OUI fleet fingerprint analysis", TEXT_OUI_FINDINGS, x=0, y=12, w=24, h=8),

    # Row 3: Intra-state concentration
    table_panel(3, "Intra-state OUI concentration — fleet procurement signal", SQL_CONCENTRATION,
        x=0, y=20, w=24, h=10,
        overrides=[
            {"matcher": {"id": "byName", "options": "Concentration class"},
             "properties": [{"id": "custom.displayMode", "value": "color-background"},
                            {"id": "mappings", "value": [{"type": "value", "options": {
                                "Fleet signal":             {"color": "#E85D24", "index": 0},
                                "Moderate concentration":   {"color": "#FFA500", "index": 1},
                                "High diversity":           {"color": "gray",    "index": 2},
                            }}]}]},
            {"matcher": {"id": "byName", "options": "Diversity ratio"},
             "properties": [{"id": "unit", "value": "percentunit"},
                            {"id": "custom.displayMode", "value": "color-background"},
                            {"id": "thresholds", "value": {"mode": "absolute", "steps": [
                                {"color": "#E85D24", "value": None},
                                {"color": "#FFA500", "value": 0.10},
                                {"color": "gray",    "value": 0.30},
                            ]}}]},
        ]),

    # Row 4: Missing v3 imports
    table_panel(4, "Missing v3 imports — by priority tier", SQL_MISSING_V3,
        x=0, y=30, w=24, h=10,
        overrides=[
            {"matcher": {"id": "byName", "options": "priority_tier"},
             "properties": [{"id": "custom.width", "value": 200}]},
            {"matcher": {"id": "byName", "options": "count_missing"},
             "properties": [{"id": "custom.displayMode", "value": "color-background"},
                            {"id": "thresholds", "value": {"mode": "absolute", "steps": [
                                {"color": "green", "value": None},
                                {"color": "#FFA500", "value": 1},
                            ]}}]},
        ]),
]

dashboard = dashboard_wrapper(
    "shadowcheck-oui-fleet",
    "ShadowCheck — OUI Fleet Intelligence",
    panels,
    "OUI procurement fingerprinting: national fleet spread, intra-state concentration, and v3 import gap analysis.",
)

out = os.path.join(os.path.dirname(__file__), "shadowcheck_oui_fleet.json")
with open(out, "w") as f:
    json.dump(dashboard, f, indent=2)
print(f"Written: {out}")
