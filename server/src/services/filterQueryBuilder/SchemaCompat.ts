export const SCHEMA_ALIASES = {
  network: 'ne',
  observation: 'o',
  networkTags: 'nt',
  manufacturer: 'rm',
} as const;

export const FIELD_EXPRESSIONS = {
  networkBssid: (alias = SCHEMA_ALIASES.network) => `UPPER(${alias}.bssid)`,
  manufacturerName: (alias = SCHEMA_ALIASES.manufacturer) =>
    `COALESCE(to_jsonb(${alias})->>'organization_name', to_jsonb(${alias})->>'manufacturer', to_jsonb(${alias})->>'manufacturer_name')`,
  manufacturerAddress: (alias = SCHEMA_ALIASES.manufacturer) =>
    `COALESCE(to_jsonb(${alias})->>'organization_address', to_jsonb(${alias})->>'address')`,
  threatTag: (alias = SCHEMA_ALIASES.networkTags) =>
    `COALESCE(to_jsonb(${alias})->>'threat_tag', to_jsonb(${alias})->>'tag_type')`,
  threatTagLowercase: (alias = SCHEMA_ALIASES.networkTags) =>
    `LOWER(COALESCE(to_jsonb(${alias})->>'threat_tag', to_jsonb(${alias})->>'tag_type'))`,
  observationLat: (alias = SCHEMA_ALIASES.observation) =>
    `COALESCE(${alias}.lat, ST_Y(${alias}.geom::geometry))`,
  observationLon: (alias = SCHEMA_ALIASES.observation) =>
    `COALESCE(${alias}.lon, ST_X(${alias}.geom::geometry))`,
} as const;

export const NULL_SAFE_COMPARISONS = {
  isIgnored: (alias = SCHEMA_ALIASES.networkTags) =>
    `COALESCE((to_jsonb(${alias})->>'is_ignored')::boolean, FALSE)`,
} as const;
