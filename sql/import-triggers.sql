-- Import Triggers for ShadowCheck Database
-- Auto-populate networks table from observations
-- Maintain data integrity and full precision

-- 1. Create function to create missing partitions automatically
CREATE OR REPLACE FUNCTION app.create_observation_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Extract year from observed_at
    start_date := DATE_TRUNC('year', NEW.observed_at);
    end_date := start_date + INTERVAL '1 year';
    partition_name := 'observations_' || EXTRACT(YEAR FROM NEW.observed_at);

    -- Check if partition exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
        AND n.nspname = 'app'
    ) THEN
        -- Create partition
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS app.%I PARTITION OF app.observations
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        RAISE NOTICE 'Created partition: app.%', partition_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create partitions on insert
DROP TRIGGER IF EXISTS trg_create_partition ON app.observations;
CREATE TRIGGER trg_create_partition
    BEFORE INSERT ON app.observations
    FOR EACH ROW
    EXECUTE FUNCTION app.create_observation_partition();

-- 2. Function to upsert network from observation
CREATE OR REPLACE FUNCTION app.upsert_network_from_observation()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert network record
    INSERT INTO app.networks (
        bssid,
        ssid,
        first_seen,
        last_seen,
        latitude,
        longitude,
        location,
        max_signal,
        frequency
    ) VALUES (
        UPPER(NEW.identifier),  -- BSSID to uppercase
        NULL,  -- SSID will be updated separately
        NEW.observed_at,
        NEW.observed_at,
        NEW.latitude,
        NEW.longitude,
        NEW.location,
        NEW.signal_dbm,
        CASE
            WHEN NEW.radio_metadata->>'frequency' IS NOT NULL
            THEN (NEW.radio_metadata->>'frequency')::numeric
            ELSE NULL
        END
    )
    ON CONFLICT (bssid) DO UPDATE SET
        last_seen = GREATEST(networks.last_seen, EXCLUDED.last_seen),
        first_seen = LEAST(networks.first_seen, EXCLUDED.first_seen),
        max_signal = CASE
            WHEN networks.max_signal IS NULL THEN EXCLUDED.max_signal
            WHEN EXCLUDED.max_signal IS NULL THEN networks.max_signal
            ELSE GREATEST(networks.max_signal, EXCLUDED.max_signal)
        END,
        -- Update location to most recent observation
        latitude = CASE
            WHEN EXCLUDED.last_seen > networks.last_seen THEN EXCLUDED.latitude
            ELSE networks.latitude
        END,
        longitude = CASE
            WHEN EXCLUDED.last_seen > networks.last_seen THEN EXCLUDED.longitude
            ELSE networks.longitude
        END,
        location = CASE
            WHEN EXCLUDED.last_seen > networks.last_seen THEN EXCLUDED.location
            ELSE networks.location
        END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to upsert network after observation insert
DROP TRIGGER IF EXISTS trg_upsert_network ON app.observations;
CREATE TRIGGER trg_upsert_network
    AFTER INSERT ON app.observations
    FOR EACH ROW
    EXECUTE FUNCTION app.upsert_network_from_observation();

-- 3. Validation function for observations
CREATE OR REPLACE FUNCTION app.validate_observation()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate coordinates
    IF NEW.latitude < -90 OR NEW.latitude > 90 THEN
        RAISE EXCEPTION 'Invalid latitude: % (must be between -90 and 90)', NEW.latitude;
    END IF;

    IF NEW.longitude < -180 OR NEW.longitude > 180 THEN
        RAISE EXCEPTION 'Invalid longitude: % (must be between -180 and 180)', NEW.longitude;
    END IF;

    -- Validate timestamp (must be after 2000-01-01 and not in future)
    IF NEW.observed_at < '2000-01-01'::timestamptz THEN
        RAISE EXCEPTION 'Invalid timestamp: % (before 2000-01-01)', NEW.observed_at;
    END IF;

    IF NEW.observed_at > NOW() + INTERVAL '1 day' THEN
        RAISE EXCEPTION 'Invalid timestamp: % (in future)', NEW.observed_at;
    END IF;

    -- Validate epoch matches timestamp
    IF NEW.observed_at_epoch IS NOT NULL THEN
        IF ABS(EXTRACT(EPOCH FROM NEW.observed_at) * 1000 - NEW.observed_at_epoch) > 1000 THEN
            RAISE EXCEPTION 'Timestamp mismatch: observed_at % vs epoch %', NEW.observed_at, NEW.observed_at_epoch;
        END IF;
    END IF;

    -- Uppercase identifier (BSSID)
    NEW.identifier := UPPER(NEW.identifier);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate before insert
DROP TRIGGER IF EXISTS trg_validate_observation ON app.observations;
CREATE TRIGGER trg_validate_observation
    BEFORE INSERT ON app.observations
    FOR EACH ROW
    EXECUTE FUNCTION app.validate_observation();

-- 4. Create missing year partitions proactively (2020-2026)
DO $$
DECLARE
    year_val INTEGER;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    FOR year_val IN 2020..2026 LOOP
        partition_name := 'observations_' || year_val;
        start_date := (year_val || '-01-01')::DATE;
        end_date := ((year_val + 1) || '-01-01')::DATE;

        -- Check if partition exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = partition_name
            AND n.nspname = 'app'
        ) THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS app.%I PARTITION OF app.observations
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );
            RAISE NOTICE 'Created partition: app.%', partition_name;
        END IF;
    END LOOP;
END $$;

-- 5. Create indexes on new partitions
DO $$
DECLARE
    partition_rec RECORD;
BEGIN
    FOR partition_rec IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'app'
        AND tablename LIKE 'observations_%'
        AND tablename NOT IN ('observations_2024', 'observations_2025')
    LOOP
        -- Create indexes if they don't exist
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON app.%I (identifier)',
            partition_rec.tablename || '_identifier_idx', partition_rec.tablename);
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON app.%I USING gist(location)',
            partition_rec.tablename || '_location_idx', partition_rec.tablename);
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON app.%I USING brin(observed_at)',
            partition_rec.tablename || '_time_idx', partition_rec.tablename);

        RAISE NOTICE 'Created indexes on: %', partition_rec.tablename;
    END LOOP;
END $$;

-- Summary
SELECT
    'Triggers installed:' as status,
    COUNT(*) as trigger_count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'app'
AND c.relname = 'observations';

SELECT
    'Partitions available:' as status,
    tablename as partition_name
FROM pg_tables
WHERE schemaname = 'app'
AND tablename LIKE 'observations_%'
ORDER BY tablename;
