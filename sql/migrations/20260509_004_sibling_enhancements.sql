-- Migration: 20260509_004_sibling_enhancements.sql
-- Branch A: oui_device_groups IS actively read — extend it.
-- 1. Add corroborating_rules to network_sibling_pairs
-- 2. Extend oui_device_groups with sibling profiling columns
-- 3. Populate vendor_name from radio_manufacturers
-- 4. Add refresh_oui_sibling_profiles() function

SET search_path TO app, public;

-- Step 1: corroborating_rules on network_sibling_pairs
ALTER TABLE app.network_sibling_pairs
  ADD COLUMN IF NOT EXISTS corroborating_rules text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_network_sibling_pairs_corroborating
  ON app.network_sibling_pairs USING GIN(corroborating_rules);

-- Step 2: Extend oui_device_groups with sibling profiling columns
ALTER TABLE app.oui_device_groups
  ADD COLUMN IF NOT EXISTS typical_last_octet_delta numeric,
  ADD COLUMN IF NOT EXISTS typical_delta_range text,
  ADD COLUMN IF NOT EXISTS allocation_pattern text
    CHECK (allocation_pattern IN (
      'sequential_last','sequential_middle','sequential_both',
      'ssid_keyed','random','unknown'
    )),
  ADD COLUMN IF NOT EXISTS sibling_pair_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sibling_rules_observed text[],
  ADD COLUMN IF NOT EXISTS band_pairing_pattern text
    CHECK (band_pairing_pattern IN (
      'dual_band','same_band_multi_channel','tri_band',
      'single_band','unknown'
    )),
  ADD COLUMN IF NOT EXISTS sibling_confidence_avg numeric,
  ADD COLUMN IF NOT EXISTS profile_notes text,
  ADD COLUMN IF NOT EXISTS profile_updated_at timestamptz;

-- Step 3: Populate vendor_name from radio_manufacturers where NULL
UPDATE app.oui_device_groups og
SET vendor_name = rm.manufacturer
FROM app.radio_manufacturers rm
WHERE og.vendor_name IS NULL
  AND upper(rm.prefix) = upper(og.oui)
  AND rm.bit_length = 24;

CREATE INDEX IF NOT EXISTS idx_oui_device_groups_allocation
  ON app.oui_device_groups(allocation_pattern);

-- Step 4: refresh_oui_sibling_profiles() — upserts sibling profiling data
-- into oui_device_groups from current network_sibling_pairs data.
-- Called automatically at the end of each sibling refresh run.
CREATE OR REPLACE FUNCTION app.refresh_oui_sibling_profiles()
RETURNS void LANGUAGE sql AS $func$
  UPDATE app.oui_device_groups og
  SET
    sibling_pair_count      = p.sibling_pair_count,
    sibling_rules_observed  = p.sibling_rules_observed,
    typical_last_octet_delta = p.typical_last_octet_delta,
    typical_delta_range     = p.typical_delta_range,
    allocation_pattern      = p.allocation_pattern,
    band_pairing_pattern    = p.band_pairing_pattern,
    sibling_confidence_avg  = p.sibling_confidence_avg,
    vendor_name             = COALESCE(og.vendor_name, p.vendor_name),
    profile_updated_at      = now()
  FROM (
    SELECT
      upper(substring(bssid1, 1, 8)) AS oui,
      (SELECT manufacturer FROM app.radio_manufacturers
       WHERE upper(prefix) = upper(substring(nsp.bssid1, 1, 8))
         AND bit_length = 24 LIMIT 1) AS vendor_name,
      COUNT(*)::integer AS sibling_pair_count,
      array_agg(DISTINCT rule) AS sibling_rules_observed,
      ROUND(AVG(d_last_octet)::numeric, 2) AS typical_last_octet_delta,
      MIN(d_last_octet)::text || '-' || MAX(d_last_octet)::text AS typical_delta_range,
      CASE
        WHEN ROUND(COUNT(*) FILTER (WHERE rule = 'last_octet_sequential')::numeric / COUNT(*), 2) > 0.6
          THEN 'sequential_last'
        WHEN ROUND(COUNT(*) FILTER (WHERE rule = 'middle_octets_sequential')::numeric / COUNT(*), 2) > 0.6
          THEN 'sequential_middle'
        WHEN ROUND(COUNT(*) FILTER (WHERE rule IN ('last_octet_sequential','middle_octets_sequential'))::numeric / COUNT(*), 2) > 0.6
          THEN 'sequential_both'
        WHEN ROUND(COUNT(*) FILTER (WHERE rule = 'ssid_exact_sequential')::numeric / COUNT(*), 2) > 0.6
          THEN 'ssid_keyed'
        ELSE 'unknown'
      END AS allocation_pattern,
      CASE
        WHEN ROUND(COUNT(*) FILTER (WHERE frequency1 IS NOT NULL AND frequency2 IS NOT NULL AND frequency1 != frequency2)::numeric / NULLIF(COUNT(*) FILTER (WHERE frequency1 IS NOT NULL AND frequency2 IS NOT NULL), 0), 2) > 0.6
          THEN 'dual_band'
        WHEN ROUND(COUNT(*) FILTER (WHERE frequency1 IS NOT NULL AND frequency2 IS NOT NULL AND frequency1 = frequency2)::numeric / NULLIF(COUNT(*) FILTER (WHERE frequency1 IS NOT NULL AND frequency2 IS NOT NULL), 0), 2) > 0.6
          THEN 'same_band_multi_channel'
        ELSE 'unknown'
      END AS band_pairing_pattern,
      ROUND(AVG(confidence)::numeric, 3) AS sibling_confidence_avg
    FROM app.network_sibling_pairs nsp
    WHERE d_last_octet IS NOT NULL
    GROUP BY upper(substring(bssid1, 1, 8))
  ) p
  WHERE og.oui = p.oui;

  -- Insert new OUI rows not yet in oui_device_groups
  INSERT INTO app.oui_device_groups (
    oui, vendor_name, device_count,
    sibling_pair_count, sibling_rules_observed,
    typical_last_octet_delta, typical_delta_range,
    allocation_pattern, band_pairing_pattern,
    sibling_confidence_avg, profile_updated_at
  )
  SELECT
    upper(substring(bssid1, 1, 8)) AS oui,
    (SELECT manufacturer FROM app.radio_manufacturers
     WHERE upper(prefix) = upper(substring(nsp.bssid1, 1, 8))
       AND bit_length = 24 LIMIT 1) AS vendor_name,
    0 AS device_count,
    COUNT(*)::integer AS sibling_pair_count,
    array_agg(DISTINCT rule) AS sibling_rules_observed,
    ROUND(AVG(d_last_octet)::numeric, 2) AS typical_last_octet_delta,
    MIN(d_last_octet)::text || '-' || MAX(d_last_octet)::text AS typical_delta_range,
    CASE
      WHEN ROUND(COUNT(*) FILTER (WHERE rule = 'last_octet_sequential')::numeric / COUNT(*), 2) > 0.6
        THEN 'sequential_last'
      WHEN ROUND(COUNT(*) FILTER (WHERE rule = 'middle_octets_sequential')::numeric / COUNT(*), 2) > 0.6
        THEN 'sequential_middle'
      WHEN ROUND(COUNT(*) FILTER (WHERE rule IN ('last_octet_sequential','middle_octets_sequential'))::numeric / COUNT(*), 2) > 0.6
        THEN 'sequential_both'
      WHEN ROUND(COUNT(*) FILTER (WHERE rule = 'ssid_exact_sequential')::numeric / COUNT(*), 2) > 0.6
        THEN 'ssid_keyed'
      ELSE 'unknown'
    END AS allocation_pattern,
    CASE
      WHEN ROUND(COUNT(*) FILTER (WHERE frequency1 IS NOT NULL AND frequency2 IS NOT NULL AND frequency1 != frequency2)::numeric / NULLIF(COUNT(*) FILTER (WHERE frequency1 IS NOT NULL AND frequency2 IS NOT NULL), 0), 2) > 0.6
        THEN 'dual_band'
      WHEN ROUND(COUNT(*) FILTER (WHERE frequency1 IS NOT NULL AND frequency2 IS NOT NULL AND frequency1 = frequency2)::numeric / NULLIF(COUNT(*) FILTER (WHERE frequency1 IS NOT NULL AND frequency2 IS NOT NULL), 0), 2) > 0.6
        THEN 'same_band_multi_channel'
      ELSE 'unknown'
    END AS band_pairing_pattern,
    ROUND(AVG(confidence)::numeric, 3) AS sibling_confidence_avg,
    now() AS profile_updated_at
  FROM app.network_sibling_pairs nsp
  WHERE d_last_octet IS NOT NULL
  GROUP BY upper(substring(bssid1, 1, 8))
  ON CONFLICT (oui) DO NOTHING;
$func$;
