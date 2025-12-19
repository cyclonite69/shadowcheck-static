CREATE TABLE IF NOT EXISTS observation_routes (
  observation_id bigint PRIMARY KEY REFERENCES observations(id),
  route_id bigint NOT NULL REFERENCES routes(id),
  delta_ms bigint NOT NULL,
  matched_at_ms bigint NOT NULL,
  confidence_window_ms bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
