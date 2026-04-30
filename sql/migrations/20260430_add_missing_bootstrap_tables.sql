-- 20260430_add_missing_bootstrap_tables.sql
-- These tables were created in-situ during initial deployment and existed in
-- prod/test without a tracked migration file. This migration makes bootstrap
-- reproducible for clean installs while remaining a safe no-op on existing
-- deployments.

BEGIN;

-- ============================================================================
-- app.kismet_alerts
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.kismet_alerts (
  id integer PRIMARY KEY,
  ts_sec bigint,
  ts_usec bigint,
  "timestamp" timestamp without time zone,
  phyname text,
  devmac text,
  lat real,
  lon real,
  header text,
  json_data jsonb,
  location public.geometry(Point,4326),
  session_id text
);

ALTER TABLE app.kismet_alerts OWNER TO shadowcheck_admin;

CREATE SEQUENCE IF NOT EXISTS app.kismet_alerts_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
ALTER SEQUENCE app.kismet_alerts_id_seq OWNER TO shadowcheck_admin;
ALTER SEQUENCE app.kismet_alerts_id_seq OWNED BY app.kismet_alerts.id;
ALTER TABLE ONLY app.kismet_alerts
  ALTER COLUMN id SET DEFAULT nextval('app.kismet_alerts_id_seq'::regclass);

CREATE INDEX IF NOT EXISTS idx_alerts_location ON app.kismet_alerts USING gist (location);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON app.kismet_alerts USING btree ("timestamp");
CREATE UNIQUE INDEX IF NOT EXISTS idx_kismet_alerts_forensic_id
  ON app.kismet_alerts USING btree (ts_sec, ts_usec, devmac, header);

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE app.kismet_alerts TO shadowcheck_user;
GRANT SELECT ON TABLE app.kismet_alerts TO grafana_reader;
GRANT SELECT, USAGE ON SEQUENCE app.kismet_alerts_id_seq TO shadowcheck_user;
GRANT USAGE ON SEQUENCE app.kismet_alerts_id_seq TO grafana_reader;

-- ============================================================================
-- app.kismet_data
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.kismet_data (
  id integer PRIMARY KEY,
  ts_sec bigint,
  ts_usec bigint,
  "timestamp" timestamp without time zone,
  phyname text,
  devmac text,
  data_type text,
  json_data jsonb,
  session_id text
);

ALTER TABLE app.kismet_data OWNER TO shadowcheck_admin;

CREATE SEQUENCE IF NOT EXISTS app.kismet_data_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
ALTER SEQUENCE app.kismet_data_id_seq OWNER TO shadowcheck_admin;
ALTER SEQUENCE app.kismet_data_id_seq OWNED BY app.kismet_data.id;
ALTER TABLE ONLY app.kismet_data
  ALTER COLUMN id SET DEFAULT nextval('app.kismet_data_id_seq'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kismet_data_forensic_id
  ON app.kismet_data USING btree (ts_sec, ts_usec, devmac, data_type);

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE app.kismet_data TO shadowcheck_user;
GRANT SELECT ON TABLE app.kismet_data TO grafana_reader;
GRANT SELECT, USAGE ON SEQUENCE app.kismet_data_id_seq TO shadowcheck_user;
GRANT USAGE ON SEQUENCE app.kismet_data_id_seq TO grafana_reader;

-- ============================================================================
-- app.kismet_datasources
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.kismet_datasources (
  id integer PRIMARY KEY,
  ts_sec bigint,
  ts_usec bigint,
  "timestamp" timestamp without time zone,
  datasource text,
  json_data jsonb,
  session_id text
);

ALTER TABLE app.kismet_datasources OWNER TO shadowcheck_admin;

CREATE SEQUENCE IF NOT EXISTS app.kismet_datasources_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
ALTER SEQUENCE app.kismet_datasources_id_seq OWNER TO shadowcheck_admin;
ALTER SEQUENCE app.kismet_datasources_id_seq OWNED BY app.kismet_datasources.id;
ALTER TABLE ONLY app.kismet_datasources
  ALTER COLUMN id SET DEFAULT nextval('app.kismet_datasources_id_seq'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kismet_datasources_forensic_id
  ON app.kismet_datasources USING btree (datasource);

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE app.kismet_datasources TO shadowcheck_user;
GRANT SELECT ON TABLE app.kismet_datasources TO grafana_reader;
GRANT SELECT, USAGE ON SEQUENCE app.kismet_datasources_id_seq TO shadowcheck_user;
GRANT USAGE ON SEQUENCE app.kismet_datasources_id_seq TO grafana_reader;

-- ============================================================================
-- app.kismet_devices
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.kismet_devices (
  id integer PRIMARY KEY,
  devkey text UNIQUE,
  phyname text,
  devmac text,
  strongest_signal integer,
  min_lat real,
  min_lon real,
  max_lat real,
  max_lon real,
  avg_lat real,
  avg_lon real,
  bytes_data bigint,
  first_time timestamp without time zone,
  last_time timestamp without time zone,
  device_data jsonb,
  location public.geometry(Point,4326),
  session_id text
);

ALTER TABLE app.kismet_devices OWNER TO shadowcheck_admin;

CREATE SEQUENCE IF NOT EXISTS app.kismet_devices_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
ALTER SEQUENCE app.kismet_devices_id_seq OWNER TO shadowcheck_admin;
ALTER SEQUENCE app.kismet_devices_id_seq OWNED BY app.kismet_devices.id;
ALTER TABLE ONLY app.kismet_devices
  ALTER COLUMN id SET DEFAULT nextval('app.kismet_devices_id_seq'::regclass);

CREATE INDEX IF NOT EXISTS idx_devices_devmac ON app.kismet_devices USING btree (devmac);
CREATE INDEX IF NOT EXISTS idx_devices_location ON app.kismet_devices USING gist (location);
CREATE INDEX IF NOT EXISTS idx_devices_phyname ON app.kismet_devices USING btree (phyname);

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE app.kismet_devices TO shadowcheck_user;
GRANT SELECT ON TABLE app.kismet_devices TO grafana_reader;
GRANT SELECT, USAGE ON SEQUENCE app.kismet_devices_id_seq TO shadowcheck_user;
GRANT USAGE ON SEQUENCE app.kismet_devices_id_seq TO grafana_reader;

-- ============================================================================
-- app.kismet_messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.kismet_messages (
  id integer PRIMARY KEY,
  ts_sec bigint,
  ts_usec bigint,
  "timestamp" timestamp without time zone,
  msgtype text,
  message text,
  session_id text
);

ALTER TABLE app.kismet_messages OWNER TO shadowcheck_admin;

CREATE SEQUENCE IF NOT EXISTS app.kismet_messages_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
ALTER SEQUENCE app.kismet_messages_id_seq OWNER TO shadowcheck_admin;
ALTER SEQUENCE app.kismet_messages_id_seq OWNED BY app.kismet_messages.id;
ALTER TABLE ONLY app.kismet_messages
  ALTER COLUMN id SET DEFAULT nextval('app.kismet_messages_id_seq'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kismet_messages_forensic_id
  ON app.kismet_messages USING btree (ts_sec, ts_usec, md5(message));

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE app.kismet_messages TO shadowcheck_user;
GRANT SELECT ON TABLE app.kismet_messages TO grafana_reader;
GRANT SELECT, USAGE ON SEQUENCE app.kismet_messages_id_seq TO shadowcheck_user;
GRANT USAGE ON SEQUENCE app.kismet_messages_id_seq TO grafana_reader;

-- ============================================================================
-- app.kismet_packets
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.kismet_packets (
  id integer PRIMARY KEY,
  ts_sec bigint,
  ts_usec bigint,
  "timestamp" timestamp without time zone,
  phyname text,
  sourcemac text,
  destmac text,
  transmac text,
  frequency real,
  devkey text,
  location public.geometry(Point,4326),
  alt real,
  speed real,
  heading real,
  packet_len integer,
  signal integer,
  datasource text,
  dlt integer,
  packet_data bytea,
  error_flag integer,
  tags text,
  datarate real,
  hash bigint,
  packetid bigint,
  packet_full_len integer,
  session_id text
);

ALTER TABLE app.kismet_packets OWNER TO shadowcheck_admin;

CREATE SEQUENCE IF NOT EXISTS app.kismet_packets_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
ALTER SEQUENCE app.kismet_packets_id_seq OWNER TO shadowcheck_admin;
ALTER SEQUENCE app.kismet_packets_id_seq OWNED BY app.kismet_packets.id;
ALTER TABLE ONLY app.kismet_packets
  ALTER COLUMN id SET DEFAULT nextval('app.kismet_packets_id_seq'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kismet_packets_forensic_id
  ON app.kismet_packets USING btree (hash, ts_sec, ts_usec);
CREATE INDEX IF NOT EXISTS idx_packets_location ON app.kismet_packets USING gist (location);
CREATE INDEX IF NOT EXISTS idx_packets_phyname ON app.kismet_packets USING btree (phyname);
CREATE INDEX IF NOT EXISTS idx_packets_sourcemac ON app.kismet_packets USING btree (sourcemac);
CREATE INDEX IF NOT EXISTS idx_packets_timestamp ON app.kismet_packets USING btree ("timestamp");

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE app.kismet_packets TO shadowcheck_user;
GRANT SELECT ON TABLE app.kismet_packets TO grafana_reader;
GRANT SELECT, USAGE ON SEQUENCE app.kismet_packets_id_seq TO shadowcheck_user;
GRANT USAGE ON SEQUENCE app.kismet_packets_id_seq TO grafana_reader;

-- ============================================================================
-- app.kismet_snapshots
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.kismet_snapshots (
  id integer PRIMARY KEY,
  ts_sec bigint,
  ts_usec bigint,
  "timestamp" timestamp without time zone,
  snaptype text,
  json_data jsonb,
  session_id text
);

ALTER TABLE app.kismet_snapshots OWNER TO shadowcheck_admin;

CREATE SEQUENCE IF NOT EXISTS app.kismet_snapshots_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
ALTER SEQUENCE app.kismet_snapshots_id_seq OWNER TO shadowcheck_admin;
ALTER SEQUENCE app.kismet_snapshots_id_seq OWNED BY app.kismet_snapshots.id;
ALTER TABLE ONLY app.kismet_snapshots
  ALTER COLUMN id SET DEFAULT nextval('app.kismet_snapshots_id_seq'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kismet_snapshots_forensic_id
  ON app.kismet_snapshots USING btree (ts_sec, ts_usec, snaptype);

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE app.kismet_snapshots TO shadowcheck_user;
GRANT SELECT ON TABLE app.kismet_snapshots TO grafana_reader;
GRANT SELECT, USAGE ON SEQUENCE app.kismet_snapshots_id_seq TO shadowcheck_user;
GRANT USAGE ON SEQUENCE app.kismet_snapshots_id_seq TO grafana_reader;

-- ============================================================================
-- app.network_sibling_baseline
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.network_sibling_baseline (
  bssid1 character varying(17) NOT NULL,
  bssid2 character varying(17) NOT NULL,
  label text NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT network_sibling_baseline_check CHECK ((bssid1)::text < (bssid2)::text),
  CONSTRAINT network_sibling_baseline_label_check CHECK (
    label = ANY (ARRAY['sibling'::text, 'not_sibling'::text])
  ),
  CONSTRAINT network_sibling_baseline_pkey PRIMARY KEY (bssid1, bssid2)
);

ALTER TABLE app.network_sibling_baseline OWNER TO shadowcheck_admin;

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE app.network_sibling_baseline TO shadowcheck_user;
GRANT SELECT ON TABLE app.network_sibling_baseline TO grafana_reader;

-- ============================================================================
-- app.federal_courthouses
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.federal_courthouses (
  id integer PRIMARY KEY,
  name text NOT NULL,
  short_name text,
  courthouse_type text NOT NULL,
  district text NOT NULL,
  circuit text NOT NULL,
  address_line1 text,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text,
  latitude double precision,
  longitude double precision,
  location public.geography(Point,4326),
  active boolean DEFAULT true NOT NULL,
  notes text,
  source_url text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT federal_courthouses_type_check CHECK (
    courthouse_type = ANY (
      ARRAY[
        'district_court'::text,
        'circuit_court_of_appeals'::text,
        'bankruptcy_court'::text,
        'magistrate_court'::text,
        'specialty_court'::text
      ]
    )
  )
);

ALTER TABLE app.federal_courthouses OWNER TO shadowcheck_admin;

CREATE SEQUENCE IF NOT EXISTS app.federal_courthouses_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
ALTER SEQUENCE app.federal_courthouses_id_seq OWNER TO shadowcheck_admin;
ALTER SEQUENCE app.federal_courthouses_id_seq OWNED BY app.federal_courthouses.id;
ALTER TABLE ONLY app.federal_courthouses
  ALTER COLUMN id SET DEFAULT nextval('app.federal_courthouses_id_seq'::regclass);

CREATE INDEX IF NOT EXISTS idx_federal_courthouses_circuit
  ON app.federal_courthouses USING btree (circuit);
CREATE INDEX IF NOT EXISTS idx_federal_courthouses_district
  ON app.federal_courthouses USING btree (district);
CREATE INDEX IF NOT EXISTS idx_federal_courthouses_location
  ON app.federal_courthouses USING gist (location);
CREATE INDEX IF NOT EXISTS idx_federal_courthouses_state
  ON app.federal_courthouses USING btree (state);
CREATE INDEX IF NOT EXISTS idx_federal_courthouses_type
  ON app.federal_courthouses USING btree (courthouse_type);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app' AND p.proname = 'update_courthouse_location'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'courthouse_location_trigger'
      AND tgrelid = 'app.federal_courthouses'::regclass
  ) THEN
    CREATE TRIGGER courthouse_location_trigger
      BEFORE INSERT OR UPDATE ON app.federal_courthouses
      FOR EACH ROW EXECUTE FUNCTION app.update_courthouse_location();
  END IF;
END
$$;

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE app.federal_courthouses TO shadowcheck_user;
GRANT SELECT ON TABLE app.federal_courthouses TO grafana_reader;
GRANT SELECT, USAGE ON SEQUENCE app.federal_courthouses_id_seq TO shadowcheck_user;
GRANT USAGE ON SEQUENCE app.federal_courthouses_id_seq TO grafana_reader;

COMMIT;
