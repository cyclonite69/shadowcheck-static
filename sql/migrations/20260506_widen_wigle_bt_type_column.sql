-- Migration: 20260506_widen_wigle_bt_type_column.sql
-- Widens app.wigle_v2_bluetooth_search.type from VARCHAR(10) to TEXT.
-- WiGLE BT API returns type values (e.g. "BT_CLASSIC", "BT_LE", "BLE") that
-- can exceed 10 characters, causing value-too-long truncation errors on insert.

SET search_path TO app, public;

ALTER TABLE app.wigle_v2_bluetooth_search
  ALTER COLUMN type TYPE TEXT;
