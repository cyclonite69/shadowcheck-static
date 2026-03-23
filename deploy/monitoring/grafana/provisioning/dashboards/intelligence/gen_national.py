"""Generate shadowcheck_national.json — Dashboard 1: National provenance brief."""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from gen_shared import *

# ── CTEs used across multiple panels ──────────────────────────────────────────
FULL_CTES = f"""WITH {BASE_CTE},
{OUI_STATES_CTE},
{PROXIMITY_CTE},
classified AS (
  SELECT b.*,
    p.min_dist_m, p.nearest_office, os.oui_state_count,
    {HW_CASE} AS hw_class,
    {HW_PTS} AS hw_pts,
    {PROX_PTS} AS prox_pts,
    {SPREAD_PTS} AS spread_pts
  FROM base b
  JOIN proximity p ON p.bssid = b.bssid
  JOIN oui_states os ON os.oui_24 = b.oui_24
)"""

# ── Panel 1-4: Stat row ────────────────────────────────────────────────────────
SQL_TOTAL = f"""WITH {BASE_CTE}
SELECT COUNT(*) AS "Total US Records" FROM base"""

SQL_HIGH_CONF = f"""WITH {BASE_CTE},
{OUI_STATES_CTE},
{PROXIMITY_CTE},
scored AS (
  SELECT ({HW_PTS}) + ({PROX_PTS}) + ({SPREAD_PTS}) AS score
  FROM base b
  JOIN proximity p ON p.bssid = b.bssid
  JOIN oui_states os ON os.oui_24 = b.oui_24
  LEFT JOIN app.radio_manufacturers rm ON rm.prefix = b.oui_24 AND rm.bit_length = 24
)
SELECT COUNT(*) FILTER (WHERE score >= $confidence_threshold) AS "High-confidence agency"
FROM scored"""

SQL_PCT = f"""WITH {BASE_CTE},
{OUI_STATES_CTE},
{PROXIMITY_CTE},
scored AS (
  SELECT ({HW_PTS}) + ({PROX_PTS}) + ({SPREAD_PTS}) AS score
  FROM base b
  JOIN proximity p ON p.bssid = b.bssid
  JOIN oui_states os ON os.oui_24 = b.oui_24
  LEFT JOIN app.radio_manufacturers rm ON rm.prefix = b.oui_24 AND rm.bit_length = 24
)
SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE score >= $confidence_threshold) / NULLIF(COUNT(*),0), 2) AS "% Agency"
FROM scored"""

SQL_FLEET_OUIS = f"""SELECT COUNT(DISTINCT {OUI_EXPR}) AS "Fleet OUIs identified"
FROM app.wigle_v2_networks_search v2
WHERE v2.ssid ILIKE '%' || '$ssid_pattern' || '%' AND v2.country = 'US'
GROUP BY {OUI_EXPR}
HAVING COUNT(DISTINCT v2.region) >= 5"""

# ── Panel 6-7: Composition row ─────────────────────────────────────────────────
SQL_PIE = f"""{FULL_CTES}
SELECT hw_class AS "Hardware Class", COUNT(*) AS "Count"
FROM classified
GROUP BY hw_class ORDER BY COUNT(*) DESC"""

SQL_CONF_BAR = f"""{FULL_CTES}
SELECT hw_class AS "Hardware Class",
  COUNT(*) FILTER (WHERE hw_pts+prox_pts+spread_pts >= $confidence_threshold) AS "High",
  COUNT(*) FILTER (WHERE hw_pts+prox_pts+spread_pts >= ($confidence_threshold::int - 20)
                     AND hw_pts+prox_pts+spread_pts < $confidence_threshold) AS "Medium",
  COUNT(*) FILTER (WHERE hw_pts+prox_pts+spread_pts < ($confidence_threshold::int - 20)) AS "Low"
FROM classified
GROUP BY hw_class ORDER BY COUNT(*) DESC"""

# ── Panel 9: Time series ───────────────────────────────────────────────────────
SQL_TIMESERIES = f"""WITH {BASE_CTE},
{OUI_STATES_CTE},
{PROXIMITY_CTE},
classified AS (
  SELECT b.firsttime,
    {HW_CASE} AS hw_class
  FROM base b
  JOIN proximity p ON p.bssid = b.bssid
  JOIN oui_states os ON os.oui_24 = b.oui_24
  LEFT JOIN app.radio_manufacturers rm ON rm.prefix = b.oui_24 AND rm.bit_length = 24
  WHERE b.firsttime > '2001-01-02'
)
SELECT
  date_trunc('year', firsttime) AS "time",
  COUNT(*) FILTER (WHERE hw_class = 'fleet_vehicle')     AS "fleet_vehicle",
  COUNT(*) FILTER (WHERE hw_class = 'mobile_command')    AS "mobile_command",
  COUNT(*) FILTER (WHERE hw_class = 'enterprise')        AS "enterprise",
  COUNT(*) FILTER (WHERE hw_class = 'residential_agent') AS "residential_agent",
  COUNT(*) FILTER (WHERE hw_class = 'consumer')          AS "consumer",
  COUNT(*) FILTER (WHERE hw_class = 'other_isp_gateway') AS "other_isp_gateway",
  COUNT(*) FILTER (WHERE hw_class = 'unknown_oui')       AS "unknown_oui"
FROM classified
GROUP BY 1 ORDER BY 1"""

# ── Panel 10: OUI fleet fingerprint table ─────────────────────────────────────
SQL_OUI_TABLE = f"""WITH oui_agg AS (
  SELECT
    {OUI_EXPR} AS oui_prefix,
    rm.manufacturer,
    COUNT(DISTINCT v2.region) AS state_count,
    string_agg(DISTINCT v2.region, ', ' ORDER BY v2.region) AS states,
    COUNT(*) AS record_count,
    GREATEST(0, AVG(EXTRACT(EPOCH FROM (v2.lasttime - v2.firsttime))/86400)) AS avg_span_days
  FROM app.wigle_v2_networks_search v2
  LEFT JOIN app.radio_manufacturers rm
    ON rm.prefix = {OUI_EXPR} AND rm.bit_length = 24
  WHERE v2.ssid ILIKE '%' || '$ssid_pattern' || '%' AND v2.country = 'US'
    {STATE_FILTER}
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
  ROUND(avg_span_days) AS "Avg Span (d)"
FROM oui_agg
ORDER BY state_count DESC"""

# ── Text panels ────────────────────────────────────────────────────────────────
TEXT_INTRO = """## What we're measuring

This brief classifies **48,519** wardrive networks whose SSID contains "${ssid_pattern:text}" against a five-tier hardware provenance model: fleet vehicles, mobile command units, enterprise fixed infrastructure, residential agent home networks, and civilian noise.

The **1.79% genuine agency figure** is a floor, not a ceiling. It captures only records where hardware evidence and geographic proximity independently corroborate each other. The **~15% ambiguous bucket** (ISP gateways + unknown OUIs near offices) is where the most interesting analysis lives — consumer-brand hardware near field offices with long observation spans.

The confidence model deliberately requires hardware signal to be additive with proximity. Proximity alone (max 30 pts) cannot reach the ${confidence_threshold:text}-pt threshold. This corrects a scoring artifact where ISP gateway routers belonging to civilians who happen to live near field offices were inflating the agency count."""

TEXT_COMPOSITION = """## Hardware class interpretation

**Fleet vehicle OUIs** (Magneti Marelli, Mitsumi Electric, Alps Alpine, Panasonic Automotive) are the single strongest genuine-agency signal. These are OEM infotainment WiFi chipsets — they appear in government fleet vehicles, not civilian hardware. A Magneti Marelli OUI appearing in 43 states is a procurement fingerprint, not coincidence.

**Mobile command** (Cradlepoint, Sierra Wireless, Inseego) are purpose-built cellular-to-WiFi bridges used in mobile command posts and surveillance vehicles. Zero civilian use case.

**Enterprise** class shows near-zero proximity to field offices — this is technically sophisticated civilians (home labs, small businesses), not office infrastructure. Field offices use managed networks that don't broadcast SSIDs containing "FBI".

**Unknown OUI** bucket: OUI prefix `B20073` appears in 33 states with consistent proximity to offices and has no manufacturer registration in the IEEE database. This is the highest-priority investigation target — either a custom-manufactured device or a recently registered OUI not yet in the public database. Confidence score: 40 pts (spread 25 + proximity 15 + unknown hw 8) — just below the ${confidence_threshold:text}-pt threshold, which is why it doesn't appear in the high-confidence count despite being analytically significant."""

TEXT_FINDINGS = """## Fleet OUI fingerprint findings

The OUI table above reveals the procurement structure of the fleet. Key findings:

- **4CD9C4 (Magneti Marelli, 43 states)**: The anchor OUI. Magneti Marelli manufactures automotive infotainment systems for government fleet vehicles. 43-state spread is consistent with a national fleet procurement contract.
- **B20073 (⚠ Unregistered, 33 states)**: No IEEE manufacturer registration. National spread with consistent office proximity. Priority v3 import target — the absence of a manufacturer record is itself a signal.
- **C449BB (Mitsumi Electric)** and **Alps Alpine OUIs**: Secondary automotive tier. Mitsumi manufactures WiFi modules for vehicle infotainment; Alps Alpine (formerly Alps Electric) supplies automotive electronics. Both appear in Flint, MI at sub-700m distances.
- **Cradlepoint/Inseego OUIs**: Mobile command tier. These are cellular routers used in surveillance vehicles and mobile command posts. Indiana cluster (4 sequential MACs, all within 200m) is the highest-priority mobile command target.

The v3 import gap is most acute in the automotive tier: highest national spread, lowest v3 coverage."""

panels = [
    # Row 1: Stats (y=0)
    stat_panel(1, "Total US Records",
        SQL_TOTAL, "short", x=0, y=0),
    stat_panel(2, "High-confidence agency",
        SQL_HIGH_CONF, "short", x=6, y=0, color="#1D9E75"),
    stat_panel(3, "% Agency",
        SQL_PCT, "percent", x=12, y=0),
    stat_panel(4, "Fleet OUIs identified",
        SQL_FLEET_OUIS, "short", x=18, y=0),

    # Row 2: Intro text (y=4)
    text_panel(5, "What we're measuring", TEXT_INTRO, x=0, y=4, w=24, h=6),

    # Row 3: Composition charts (y=10)
    piechart_panel(6, "Hardware class breakdown", SQL_PIE,
        x=0, y=10, w=12, h=10, overrides=hw_color_overrides()),
    barchart_panel(7, "Confidence tier by hardware class", SQL_CONF_BAR,
        x=12, y=10, w=12, h=10, stacking="none",
        overrides=[
            {"matcher": {"id": "byName", "options": "High"}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "green"}}]},
            {"matcher": {"id": "byName", "options": "Medium"}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "#FFA500"}}]},
            {"matcher": {"id": "byName", "options": "Low"}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "red"}}]},
        ]),

    # Row 4: Composition findings text (y=20)
    text_panel(8, "Hardware class interpretation", TEXT_COMPOSITION, x=0, y=20, w=24, h=8),

    # Row 5: Time series (y=28)
    timeseries_panel(9, "First-seen by year — hardware class", SQL_TIMESERIES,
        x=0, y=28, w=24, h=10, overrides=hw_color_overrides()),

    # Row 6: OUI fleet table (y=38)
    table_panel(10, "National fleet OUI fingerprint", SQL_OUI_TABLE,
        x=0, y=38, w=24, h=12,
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
        ]),

    # Row 7: Fleet findings text (y=50)
    text_panel(11, "Fleet OUI fingerprint findings", TEXT_FINDINGS, x=0, y=50, w=24, h=8),
]

dashboard = dashboard_wrapper(
    "shadowcheck-national",
    "ShadowCheck — National Provenance Brief",
    panels,
    "Hardware provenance intelligence: classifying FBI-SSID wardrive records by OUI tier, proximity, and observation span.",
)

out = os.path.join(os.path.dirname(__file__), "shadowcheck_national.json")
with open(out, "w") as f:
    json.dump(dashboard, f, indent=2)
print(f"Written: {out}")
