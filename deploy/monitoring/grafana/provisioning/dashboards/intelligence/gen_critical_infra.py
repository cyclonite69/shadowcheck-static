"""Dashboard 1 — Critical infrastructure fleet detection."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_shared import dashboard_wrapper, ds, stat_panel, text_panel, table_panel, timeseries_panel, barchart_panel


STATE_FILTER = """
  AND (
    '${state:csv}' = '$__all'
    OR v2.region = ANY(string_to_array('${state:csv}', ','))
  )
"""

FLEET_CTES = f"""WITH infra AS (
  /* Intel value: these are the government/institutional anchor points used
     to score likely contractor or facility-support fleets. */
  SELECT name, state, location, 'agency_office'::text AS facility_type
  FROM app.agency_offices
  WHERE location IS NOT NULL

  UNION ALL

  SELECT name, state, location, 'federal_courthouse'::text AS facility_type
  FROM app.federal_courthouses
  WHERE active = TRUE
    AND location IS NOT NULL
),
fleet_base AS (
  /* Intel value: Airlink and Sierra Wireless are common cellular gateway /
     remote-access vendors in government, utility, and mobile-infrastructure fleets. */
  SELECT
    v2.bssid,
    NULLIF(BTRIM(v2.ssid), '') AS ssid,
    v2.region AS state,
    v2.city,
    UPPER(COALESCE(v2.encryption, 'UNKNOWN')) AS encryption,
    v2.firsttime,
    v2.lasttime,
    v2.trilat,
    v2.trilong,
    rm.manufacturer,
    CASE
      WHEN rm.manufacturer ILIKE '%Airlink%' THEN 'Airlink'
      WHEN rm.manufacturer ILIKE '%Sierra Wireless%' THEN 'Sierra Wireless'
    END AS fleet_signal
  FROM app.wigle_v2_networks_search v2
  JOIN app.radio_manufacturers rm
    ON rm.prefix = LEFT(UPPER(REPLACE(v2.bssid, ':', '')), 6)
   AND rm.bit_length = 24
  WHERE v2.country = 'US'
    AND v2.trilat IS NOT NULL
    AND v2.trilong IS NOT NULL
    AND (
      rm.manufacturer ILIKE '%Airlink%'
      OR rm.manufacturer ILIKE '%Sierra Wireless%'
    )
    {STATE_FILTER}
),
network_rollup AS (
  /* Entity-level aggregation, not raw rows: one row per observed network fleet device. */
  SELECT
    bssid,
    COALESCE(MIN(ssid), '[hidden]') AS ssid,
    state,
    MIN(city) AS city,
    MIN(encryption) AS encryption,
    MIN(firsttime) AS first_seen,
    MAX(lasttime) AS last_seen,
    MIN(manufacturer) AS manufacturer,
    MIN(fleet_signal) AS fleet_signal,
    AVG(trilat::numeric)::float8 AS trilat,
    AVG(trilong::numeric)::float8 AS trilong,
    ROUND(EXTRACT(EPOCH FROM (MAX(lasttime) - MIN(firsttime))) / 86400.0, 1) AS span_days,
    COUNT(*) AS observation_rows
  FROM fleet_base
  GROUP BY bssid, state
),
network_proximity AS (
  /* Intel value: nearest government/institutional facility distance turns a
     fleet observation into a more actionable infrastructure-support signal. */
  SELECT
    n.*,
    i.name AS nearest_facility,
    i.state AS facility_state,
    i.facility_type,
    ROUND(
      ST_Distance(
        ST_SetSRID(ST_MakePoint(n.trilong, n.trilat), 4326)::geography,
        i.location
      )::numeric
    ) AS dist_m
  FROM network_rollup n
  LEFT JOIN LATERAL (
    SELECT name, state, facility_type, location
    FROM infra
    ORDER BY ST_SetSRID(ST_MakePoint(n.trilong, n.trilat), 4326)::geography <-> location
    LIMIT 1
  ) i ON TRUE
)"""

SQL_TOTAL_FLEETS = f"""{FLEET_CTES}
SELECT COUNT(*)::bigint AS value
FROM network_proximity;"""

SQL_STATE_COUNT = f"""{FLEET_CTES}
SELECT COUNT(DISTINCT state)::bigint AS value
FROM network_proximity;"""

SQL_WITHIN_5KM = f"""{FLEET_CTES}
SELECT COUNT(*) FILTER (WHERE dist_m <= 5000)::bigint AS value
FROM network_proximity;"""

SQL_NEW_NEAR_FACILITY = f"""{FLEET_CTES}
SELECT COUNT(*) FILTER (
  WHERE first_seen >= NOW() - INTERVAL '30 days'
    AND dist_m <= 5000
)::bigint AS value
FROM network_proximity;"""

SQL_STATE_DENSITY = f"""{FLEET_CTES}
SELECT
  state AS "State",
  COUNT(*) FILTER (WHERE fleet_signal = 'Airlink') AS "Airlink",
  COUNT(*) FILTER (WHERE fleet_signal = 'Sierra Wireless') AS "Sierra Wireless",
  COUNT(*) AS "Total fleets",
  ROUND(AVG(dist_m)) AS "Avg nearest facility (m)",
  COUNT(*) FILTER (WHERE dist_m <= 1000) AS "Within 1 km",
  COUNT(*) FILTER (WHERE dist_m <= 5000) AS "Within 5 km"
FROM network_proximity
GROUP BY state
ORDER BY "Total fleets" DESC, "Within 1 km" DESC, state;"""

SQL_DENSITY_MAP = f"""{FLEET_CTES}
SELECT
  ROUND((trilat)::numeric, 2)::float8 AS trilat,
  ROUND((trilong)::numeric, 2)::float8 AS trilong,
  fleet_signal,
  CASE WHEN fleet_signal = 'Airlink' THEN 1 ELSE 2 END AS hw_class_num,
  COUNT(*) AS network_count,
  COUNT(*) FILTER (WHERE dist_m <= 5000) AS critical_zone_hits,
  MIN(dist_m) AS min_dist_m,
  STRING_AGG(DISTINCT state, ', ' ORDER BY state) AS states
FROM network_proximity
GROUP BY 1, 2, 3, 4
ORDER BY critical_zone_hits DESC, network_count DESC;"""

SQL_TIMELINE = f"""{FLEET_CTES}
SELECT
  DATE_TRUNC('year', first_seen) AS "time",
  COUNT(*) FILTER (WHERE fleet_signal = 'Airlink') AS "Airlink",
  COUNT(*) FILTER (WHERE fleet_signal = 'Sierra Wireless') AS "Sierra Wireless"
FROM network_proximity
GROUP BY 1
ORDER BY 1;"""

SQL_NETWORK_TABLE = f"""{FLEET_CTES}
SELECT
  manufacturer AS "Manufacturer",
  fleet_signal AS "Fleet Signal",
  state AS "State",
  city AS "City",
  ssid AS "SSID",
  encryption AS "Encryption",
  observation_rows AS "Obs",
  span_days AS "Span (d)",
  dist_m AS "Nearest facility (m)",
  nearest_facility AS "Nearest facility",
  first_seen AS "First seen",
  last_seen AS "Last seen"
FROM network_proximity
ORDER BY dist_m NULLS LAST, span_days DESC, last_seen DESC
LIMIT 100;"""

SQL_ALERT_TABLE = f"""{FLEET_CTES}
SELECT
  fleet_signal AS "Fleet Signal",
  manufacturer AS "Manufacturer",
  state AS "State",
  city AS "City",
  ssid AS "SSID",
  dist_m AS "Nearest facility (m)",
  nearest_facility AS "Nearest facility",
  first_seen AS "First seen",
  last_seen AS "Last seen"
FROM network_proximity
WHERE last_seen >= NOW() - INTERVAL '365 days'
  AND dist_m <= 5000
ORDER BY last_seen DESC, dist_m ASC
LIMIT 50;"""

TEXT_FINDINGS = """## Critical infrastructure fleet logic

**Intel value:** Airlink and Sierra Wireless hardware often appears as cellular gateways, remote-access modems, and industrial/mobile infrastructure. A dense cluster near government facilities, courthouses, airports, or similar institutional anchors is more meaningful than the same OUI family scattered across consumer neighborhoods.

**How this dashboard scores value**
- State density isolates fleet concentration rather than individual sightings.
- Proximity to a government/institutional anchor highlights likely facility-support or contractor activity.
- First/last seen and span days distinguish one-off drive-bys from persistent infrastructure.
- New-near-facility detections are the closest thing to an operational alert panel in dashboard form.

**Current dataset note:** this database currently shows Sierra Wireless coverage across multiple states. No Airlink-labeled OUI rows are present in `app.radio_manufacturers` yet, so Airlink panels are expected to remain zero until the OUI reference data expands or observations appear."""


def geomap_panel(pid, title, sql, x, y, w, h):
    return {
        "id": pid,
        "type": "geomap",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": ds(),
        "targets": [{"datasource": ds(), "rawSql": sql, "format": "table", "refId": "A"}],
        "options": {
            "view": {"id": "coords", "lat": 39.5, "lon": -98.35, "zoom": 4},
            "layers": [{
                "type": "markers",
                "name": "Fleet density",
                "tooltip": True,
                "location": {"mode": "coords", "latitude": "trilat", "longitude": "trilong"},
                "config": {
                    "size": {"field": "network_count", "min": 5, "max": 18},
                    "color": {"field": "hw_class_num"},
                },
            }],
            "controls": {"showZoom": True, "mouseWheelZoom": True, "showAttribution": True},
            "tooltip": {"mode": "details"},
        },
        "fieldConfig": {"defaults": {}, "overrides": []},
    }


panels = [
    stat_panel(1, "Tracked fleet networks", SQL_TOTAL_FLEETS, "none", x=0, y=0, w=6, h=4, fixed_color="#E85D24"),
    stat_panel(2, "States covered", SQL_STATE_COUNT, "none", x=6, y=0, w=6, h=4, fixed_color="#378ADD"),
    stat_panel(3, "Within 5 km of facility", SQL_WITHIN_5KM, "none", x=12, y=0, w=6, h=4, fixed_color="#1D9E75"),
    stat_panel(4, "New near-facility (30d)", SQL_NEW_NEAR_FACILITY, "none", x=18, y=0, w=6, h=4, fixed_color="#D4537E"),
    text_panel(5, "Why this matters", TEXT_FINDINGS, x=0, y=4, w=24, h=8),
    barchart_panel(6, "State density by fleet signal", SQL_STATE_DENSITY, x=0, y=12, w=12, h=10, stacking="normal"),
    geomap_panel(7, "Geographic fleet density heatmap", SQL_DENSITY_MAP, x=12, y=12, w=12, h=10),
    timeseries_panel(8, "Fleet appearance timeline", SQL_TIMELINE, x=0, y=22, w=12, h=9),
    table_panel(9, "New fleets near institutional anchors (alert watchlist)", SQL_ALERT_TABLE, x=12, y=22, w=12, h=9),
    table_panel(10, "Critical infrastructure fleet table", SQL_NETWORK_TABLE, x=0, y=31, w=24, h=12),
]

dashboard = dashboard_wrapper(
    "shadowcheck-critical-infra",
    "ShadowCheck — Critical Infrastructure Fleet Detection",
    panels,
    "Airlink and Sierra Wireless fleet detection near government/institutional facilities. Focused on state density, proximity, persistence, and new-near-facility sightings.",
)

out = os.path.join(os.path.dirname(__file__), "shadowcheck_critical_infra.json")
with open(out, "w") as f:
    json.dump(dashboard, f, indent=2)
print(f"Written: {out}")
