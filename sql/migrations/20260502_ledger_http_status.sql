-- Add http_status column to wigle_ledger_events for querying by actual WiGLE response code
ALTER TABLE app.wigle_ledger_events
  ADD COLUMN IF NOT EXISTS http_status integer;
