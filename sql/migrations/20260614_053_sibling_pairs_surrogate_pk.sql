-- Migration: Add surrogate PK to app.network_sibling_pairs
-- 20260614_053_sibling_pairs_surrogate_pk.sql
--
-- Adds an id BIGSERIAL column as a surrogate primary key.
-- The existing composite unique constraint (bssid1, bssid2) is preserved —
-- all existing queries using bssid1/bssid2 continue to work unchanged.
-- INSERTs with explicit column lists self-populate the new column.

ALTER TABLE app.network_sibling_pairs
  ADD COLUMN IF NOT EXISTS id BIGSERIAL;

-- Preserve the composite uniqueness as a named unique constraint
-- (the original pkey was on (bssid1, bssid2) — we keep that as unique,
-- and promote id as the new primary key)
DO $$
BEGIN
  -- Only drop/recreate if id is not already the primary key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'app.network_sibling_pairs'::regclass
    AND conname = 'network_sibling_pairs_id_pkey'
  ) THEN
    -- Add unique constraint on existing composite key before dropping pkey
    ALTER TABLE app.network_sibling_pairs
      ADD CONSTRAINT network_sibling_pairs_bssid_unique UNIQUE (bssid1, bssid2);

    -- Drop original composite primary key
    ALTER TABLE app.network_sibling_pairs
      DROP CONSTRAINT IF EXISTS network_sibling_pairs_pkey;

    -- Promote surrogate as primary key
    ALTER TABLE app.network_sibling_pairs
      ADD CONSTRAINT network_sibling_pairs_id_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_network_sibling_pairs_id
  ON app.network_sibling_pairs (id);
