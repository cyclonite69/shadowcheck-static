CREATE TABLE IF NOT EXISTS observation_routes (
  observation_id bigint PRIMARY KEY,
  route_id       bigint NOT NULL REFERENCES routes(id),
  device_id      text   NOT NULL REFERENCES device_sources(code),
  run_id         integer NOT NULL,
  time_delta_ms  bigint NOT NULL
);
