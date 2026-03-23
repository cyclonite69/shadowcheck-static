"""Shared constants and helpers for dashboard generation."""

COLORS = {
    "fleet_vehicle":    "#E85D24",
    "mobile_command":   "#7F77DD",
    "enterprise":       "#1D9E75",
    "residential_agent":"#378ADD",
    "consumer":         "#888780",
    "other_isp_gateway":"#B4B2A9",
    "unknown_oui":      "#D4537E",
}

HW_CLASS_NUM = {
    "fleet_vehicle": 1, "mobile_command": 2, "enterprise": 3,
    "residential_agent": 4, "consumer": 5, "other_isp_gateway": 6, "unknown_oui": 7,
}

ISP_LIKE = "ARRAY['%arcadyan%','%pegatron%','%commscope%','%vantiva%','%sagemcom%','%askey%','%sercomm%','%gemtek%','%calix%']"
FLEET_LIKE = "ARRAY['%magneti marelli%','%panasonic automotive%','%visteon%','%harman/becker%','%mitsumi%','%alps alpine%','%alpsalpine%']"
MOBILE_LIKE = "ARRAY['%cradlepoint%','%sierra wireless%','%airlink%','%inseego%','%novatel%','%samsara%']"
ENTERPRISE_LIKE = "ARRAY['%cisco%','%aruba%','%ruckus%','%ubiquiti%','%meraki%','%fortinet%','%aerohive%','%juniper%']"
CONSUMER_LIKE = "ARRAY['%netgear%','%tp-link%','%asus%','%linksys%','%belkin%','%d-link%','%zyxel%','%tenda%','%eero%','%google%','%amazon%']"

OUI_EXPR = "left(upper(replace(v2.bssid,':','')),6)"

HW_CASE = f"""CASE
      WHEN lower(rm.manufacturer) LIKE ANY({FLEET_LIKE}) THEN 'fleet_vehicle'
      WHEN lower(rm.manufacturer) LIKE ANY({MOBILE_LIKE}) THEN 'mobile_command'
      WHEN lower(rm.manufacturer) LIKE ANY({ENTERPRISE_LIKE}) THEN 'enterprise'
      WHEN lower(rm.manufacturer) LIKE ANY({ISP_LIKE})
           AND p.min_dist_m <= 2000 AND b.span_days >= $span_days_min THEN 'residential_agent'
      WHEN lower(rm.manufacturer) LIKE ANY({CONSUMER_LIKE}) THEN 'consumer'
      WHEN lower(rm.manufacturer) LIKE ANY({ISP_LIKE}) THEN 'other_isp_gateway'
      ELSE 'unknown_oui'
    END"""

HW_PTS = f"""CASE
      WHEN lower(rm.manufacturer) LIKE ANY({FLEET_LIKE}) THEN 45
      WHEN lower(rm.manufacturer) LIKE ANY({MOBILE_LIKE}) THEN 45
      WHEN lower(rm.manufacturer) LIKE ANY({ENTERPRISE_LIKE}) THEN 28
      WHEN lower(rm.manufacturer) LIKE ANY({CONSUMER_LIKE}) THEN 4
      WHEN rm.manufacturer IS NULL THEN 8
      ELSE 7
    END"""

PROX_PTS = "CASE WHEN p.min_dist_m <= 1000 THEN 30 WHEN p.min_dist_m <= 5000 THEN 22 WHEN p.min_dist_m <= 25000 THEN 10 ELSE 0 END"
SPREAD_PTS = "CASE WHEN os.oui_state_count >= 30 THEN 25 WHEN os.oui_state_count >= 15 THEN 15 WHEN os.oui_state_count >= 5 THEN 7 ELSE 2 END"

STATE_FILTER = "AND ('$state' = 'All' OR v2.region = ANY(string_to_array('$state', ',')))"

BASE_CTE = f"""base AS (
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
    {STATE_FILTER}
    AND v2.trilat IS NOT NULL
)"""

OUI_STATES_CTE = """oui_states AS (
  SELECT left(upper(replace(bssid,':','')),6) AS oui_24,
    COUNT(DISTINCT region) AS oui_state_count
  FROM app.wigle_v2_networks_search
  WHERE ssid ILIKE '%' || '$ssid_pattern' || '%' AND country = 'US'
  GROUP BY 1
)"""

PROXIMITY_CTE = """proximity AS (
  SELECT b.bssid,
    MIN(ST_Distance(v2.location::geography, ao.location)) AS min_dist_m,
    (SELECT ao2.name FROM app.agency_offices ao2
     ORDER BY v2.location::geography <-> ao2.location LIMIT 1) AS nearest_office
  FROM base b
  JOIN app.wigle_v2_networks_search v2 ON v2.bssid = b.bssid
  CROSS JOIN app.agency_offices ao
  GROUP BY b.bssid, v2.location
)"""

def ds_ref():
    return {"type": "postgres", "uid": "${DS_SHADOWCHECK_DB}"}

def text_panel(pid, title, content, x, y, w, h):
    return {
        "id": pid, "type": "text", "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "options": {"mode": "markdown", "content": content},
        "datasource": None,
    }

def stat_panel(pid, title, sql, unit, x, y, w=6, h=4, color=None):
    p = {
        "id": pid, "type": "stat", "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": ds_ref(),
        "targets": [{"datasource": ds_ref(), "rawSql": sql, "format": "table", "refId": "A"}],
        "options": {"reduceOptions": {"calcs": ["last"]}, "orientation": "auto", "textMode": "auto", "colorMode": "value"},
        "fieldConfig": {"defaults": {"unit": unit, "mappings": [], "thresholds": {"mode": "absolute", "steps": [{"color": "green", "value": None}]}}, "overrides": []},
    }
    if color:
        p["fieldConfig"]["defaults"]["color"] = {"mode": "fixed", "fixedColor": color}
    return p

def table_panel(pid, title, sql, x, y, w, h, overrides=None):
    return {
        "id": pid, "type": "table", "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": ds_ref(),
        "targets": [{"datasource": ds_ref(), "rawSql": sql, "format": "table", "refId": "A"}],
        "options": {"sortBy": []},
        "fieldConfig": {"defaults": {}, "overrides": overrides or []},
    }

def timeseries_panel(pid, title, sql, x, y, w, h, overrides=None):
    return {
        "id": pid, "type": "timeseries", "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": ds_ref(),
        "targets": [{"datasource": ds_ref(), "rawSql": sql, "format": "time_series", "refId": "A"}],
        "options": {"tooltip": {"mode": "multi"}, "legend": {"displayMode": "list", "placement": "bottom"}},
        "fieldConfig": {
            "defaults": {"custom": {"lineWidth": 2, "fillOpacity": 10, "showPoints": "always"}},
            "overrides": overrides or [],
        },
    }

def piechart_panel(pid, title, sql, x, y, w, h, overrides=None):
    return {
        "id": pid, "type": "piechart", "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": ds_ref(),
        "targets": [{"datasource": ds_ref(), "rawSql": sql, "format": "table", "refId": "A"}],
        "options": {"pieType": "donut", "legend": {"displayMode": "list", "placement": "right"}},
        "fieldConfig": {"defaults": {}, "overrides": overrides or []},
    }

def barchart_panel(pid, title, sql, x, y, w, h, stacking="none", overrides=None):
    return {
        "id": pid, "type": "barchart", "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": ds_ref(),
        "targets": [{"datasource": ds_ref(), "rawSql": sql, "format": "table", "refId": "A"}],
        "options": {"stacking": stacking, "legend": {"displayMode": "list", "placement": "bottom"}},
        "fieldConfig": {"defaults": {}, "overrides": overrides or []},
    }

def geomap_panel(pid, title, sql, x, y, w, h, lat=44.3, lng=-85.5, zoom=6):
    return {
        "id": pid, "type": "geomap", "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": ds_ref(),
        "targets": [{"datasource": ds_ref(), "rawSql": sql, "format": "table", "refId": "A"}],
        "options": {
            "view": {"id": "coords", "lat": lat, "lon": lng, "zoom": zoom},
            "layers": [{
                "type": "markers", "name": "Networks",
                "config": {"size": {"fixed": 6}, "color": {"field": "hw_class_num"}},
                "location": {"mode": "coords", "latitude": "trilat", "longitude": "trilong"},
                "tooltip": True,
            }],
        },
        "fieldConfig": {"defaults": {}, "overrides": []},
    }

def hw_color_overrides():
    """Series color overrides for hw_class series."""
    return [
        {"matcher": {"id": "byName", "options": cls},
         "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": col}}]}
        for cls, col in COLORS.items()
    ]

def variables():
    return [
        {
            "name": "ssid_pattern", "type": "textbox", "label": "SSID contains",
            "current": {"value": "FBI"}, "query": "FBI", "hide": 0,
        },
        {
            "name": "state", "type": "query", "label": "State",
            "datasource": ds_ref(),
            "query": "SELECT DISTINCT region FROM app.wigle_v2_networks_search WHERE ssid ILIKE '%' || '${ssid_pattern}' || '%' AND country = 'US' AND region IS NOT NULL ORDER BY region",
            "multi": True, "includeAll": True, "allValue": ".*", "hide": 0,
            "refresh": 2,
        },
        {
            "name": "confidence_threshold", "type": "custom", "label": "Min confidence score",
            "query": "40,50,60,70,80", "current": {"value": "60", "text": "60"},
            "options": [{"value": str(v), "text": str(v)} for v in [40,50,60,70,80]],
            "hide": 0,
        },
        {
            "name": "span_days_min", "type": "custom", "label": "Min span (days)",
            "query": "90,180,365,730,1095", "current": {"value": "365", "text": "365"},
            "options": [{"value": str(v), "text": str(v)} for v in [90,180,365,730,1095]],
            "hide": 0,
        },
    ]

def dashboard_wrapper(uid, title, panels, description=""):
    return {
        "__inputs": [{"name": "DS_SHADOWCHECK_DB", "label": "shadowcheck_db", "type": "datasource", "pluginId": "postgres", "pluginName": "PostgreSQL"}],
        "__requires": [{"type": "datasource", "id": "postgres", "name": "PostgreSQL", "version": "1.0.0"}],
        "uid": uid, "title": title, "description": description,
        "schemaVersion": 39, "version": 1,
        "time": {"from": "now-30d", "to": "now"},
        "timepicker": {},
        "refresh": "5m",
        "tags": ["shadowcheck", "intelligence"],
        "templating": {"list": variables()},
        "panels": panels,
        "editable": True,
        "fiscalYearStartMonth": 0,
        "graphTooltip": 1,
        "links": [],
        "liveNow": False,
    }
