const logger = require('../logging/logger');
const secretsManager = require('./secretsManager');
const { query } = require('../config/database');

export {};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldSkipPoi = (address?: string | null): boolean => {
  if (!address) return false;
  const normalized = address.toLowerCase();
  return (
    normalized.includes('814 martin luther king') || normalized.includes('816 martin luther king')
  );
};

type GeocodeMode = 'address-only' | 'poi-only' | 'both';
type GeocodeProvider = 'mapbox' | 'nominatim';

type GeocodeRunOptions = {
  precision: number;
  limit: number;
  perMinute: number;
  provider: GeocodeProvider;
  mode: GeocodeMode;
  permanent?: boolean;
};

type GeocodeResult = {
  ok: boolean;
  address?: string | null;
  poiName?: string | null;
  poiCategory?: string | null;
  featureType?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  country?: string | null;
  confidence?: number | null;
  raw?: unknown;
};

type GeocodeRow = {
  lat_round: number;
  lon_round: number;
  obs_count?: number;
  address?: string | null;
};

const parseMapboxContext = (
  context?: Array<{ id?: string; text?: string; short_code?: string }>
) => {
  const data: { city?: string; state?: string; postal?: string; country?: string } = {};
  if (!context) return data;

  for (const item of context) {
    const id = item.id || '';
    if (id.startsWith('place.')) {
      data.city = item.text || data.city;
    } else if (id.startsWith('region.')) {
      const short = item.short_code?.split('-')[1]?.toUpperCase();
      data.state = short || item.text || data.state;
    } else if (id.startsWith('postcode.')) {
      data.postal = item.text || data.postal;
    } else if (id.startsWith('country.')) {
      data.country = item.text || data.country;
    }
  }

  return data;
};

const mapboxReverse = async (
  lat: number,
  lon: number,
  mode: GeocodeMode,
  permanent: boolean
): Promise<GeocodeResult> => {
  const token = await secretsManager.getSecret('mapbox_token');
  if (!token) {
    throw new Error('Mapbox token not configured');
  }

  const types = mode === 'address-only' ? 'address' : 'poi,address';
  const limit = mode === 'address-only' ? 1 : 5;
  const permanentParam = permanent ? '&permanent=true' : '';
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${token}&types=${types}&limit=${limit}${permanentParam}`;

  const response = await fetch(url);
  if (response.status === 429) {
    throw new Error('rate_limit');
  }
  if (!response.ok) {
    return { ok: false };
  }
  const json = (await response.json()) as {
    features?: Array<{
      text?: string;
      place_name?: string;
      place_type?: string[];
      relevance?: number;
      properties?: { category?: string };
      context?: Array<{ id?: string; text?: string; short_code?: string }>;
    }>;
  };

  const features = json.features || [];
  if (!features.length) {
    return { ok: false, raw: json };
  }

  const poiFeature = features.find((f) => f.place_type?.includes('poi'));
  const addressFeature =
    features.find((f) => f.place_type?.includes('address')) || features[0] || poiFeature;
  const context = parseMapboxContext(addressFeature?.context || poiFeature?.context);

  return {
    ok: true,
    poiName: poiFeature?.text || null,
    poiCategory: poiFeature?.properties?.category || null,
    featureType: addressFeature?.place_type?.[0] || poiFeature?.place_type?.[0] || null,
    address: addressFeature?.place_name || poiFeature?.place_name || null,
    city: context.city || null,
    state: context.state || null,
    postal: context.postal || null,
    country: context.country || null,
    confidence: addressFeature?.relevance ?? poiFeature?.relevance ?? null,
    raw: json,
  };
};

const nominatimReverse = async (lat: number, lon: number): Promise<GeocodeResult> => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
  const response = await fetch(url, { headers: { 'User-Agent': 'ShadowCheck/1.0' } });
  if (response.status === 429) {
    throw new Error('rate_limit');
  }
  if (!response.ok) {
    return { ok: false };
  }

  const json = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };

  if (!json.display_name) {
    return { ok: false, raw: json };
  }

  const address = json.address || {};
  const city = address.city || address.town || address.village || address.hamlet || address.county;

  return {
    ok: true,
    address: json.display_name,
    city: city || null,
    state: address.state || null,
    postal: address.postcode || null,
    country: address.country || null,
    raw: json,
  };
};

const upsertGeocodeCache = async (
  row: GeocodeRow,
  precision: number,
  provider: string,
  result: GeocodeResult
) => {
  if (!result.ok) return;
  const poiSkip = shouldSkipPoi(result.address);

  await query(
    `
    INSERT INTO app.geocoding_cache (
      precision,
      lat_round,
      lon_round,
      lat,
      lon,
      address,
      poi_name,
      poi_category,
      feature_type,
      poi_skip,
      city,
      state,
      postal_code,
      country,
      provider,
      confidence,
      raw_response
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (precision, lat_round, lon_round) DO UPDATE SET
      address = COALESCE(app.geocoding_cache.address, EXCLUDED.address),
      poi_name = COALESCE(app.geocoding_cache.poi_name, EXCLUDED.poi_name),
      poi_category = COALESCE(app.geocoding_cache.poi_category, EXCLUDED.poi_category),
      feature_type = COALESCE(app.geocoding_cache.feature_type, EXCLUDED.feature_type),
      poi_skip = app.geocoding_cache.poi_skip OR EXCLUDED.poi_skip,
      city = COALESCE(app.geocoding_cache.city, EXCLUDED.city),
      state = COALESCE(app.geocoding_cache.state, EXCLUDED.state),
      postal_code = COALESCE(app.geocoding_cache.postal_code, EXCLUDED.postal_code),
      country = COALESCE(app.geocoding_cache.country, EXCLUDED.country),
      provider = COALESCE(app.geocoding_cache.provider, EXCLUDED.provider),
      confidence = COALESCE(app.geocoding_cache.confidence, EXCLUDED.confidence),
      lat = COALESCE(app.geocoding_cache.lat, EXCLUDED.lat),
      lon = COALESCE(app.geocoding_cache.lon, EXCLUDED.lon),
      geocoded_at = NOW(),
      raw_response = COALESCE(app.geocoding_cache.raw_response, EXCLUDED.raw_response);
  `,
    [
      precision,
      row.lat_round,
      row.lon_round,
      row.lat_round,
      row.lon_round,
      result.address || null,
      result.poiName || null,
      result.poiCategory || null,
      result.featureType || null,
      poiSkip,
      result.city || null,
      result.state || null,
      result.postal || null,
      result.country || null,
      provider,
      result.confidence ?? null,
      result.raw ? JSON.stringify(result.raw) : null,
    ]
  );
};

const fetchRows = async (
  precision: number,
  limit: number,
  mode: GeocodeMode
): Promise<GeocodeRow[]> => {
  if (mode === 'poi-only') {
    const result = await query(
      `
      SELECT
        c.lat_round::double precision AS lat_round,
        c.lon_round::double precision AS lon_round,
        c.address
      FROM app.geocoding_cache c
      WHERE c.precision = $2
        AND c.poi_name IS NULL
        AND c.address IS NOT NULL
        AND c.poi_skip IS FALSE
      ORDER BY c.geocoded_at DESC
      LIMIT $1;
    `,
      [limit, precision]
    );
    return result.rows as GeocodeRow[];
  }

  const result = await query(
    `
    WITH rounded AS (
      SELECT
        round(lat::numeric, $2) AS lat_round,
        round(lon::numeric, $2) AS lon_round,
        count(*) AS obs_count
      FROM app.observations
      GROUP BY 1, 2
    )
    SELECT
      r.lat_round::double precision AS lat_round,
      r.lon_round::double precision AS lon_round,
      r.obs_count
    FROM rounded r
    LEFT JOIN app.geocoding_cache c
      ON c.precision = $2
     AND c.lat_round = r.lat_round
     AND c.lon_round = r.lon_round
    WHERE c.id IS NULL
    ORDER BY obs_count DESC
    LIMIT $1;
  `,
    [limit, precision]
  );
  return result.rows as GeocodeRow[];
};

const getProviderLabel = (provider: GeocodeProvider, mode: GeocodeMode, permanent: boolean) => {
  if (provider === 'mapbox') {
    const base = mode === 'address-only' ? 'mapbox_v5' : 'mapbox_v5';
    return permanent ? `${base}_permanent` : base;
  }
  return provider;
};

const runGeocodeCacheUpdate = async (options: GeocodeRunOptions) => {
  const precision = options.precision ?? 5;
  const limit = Math.max(1, options.limit ?? 1000);
  const perMinute = Math.max(1, options.perMinute ?? 200);
  const delayMs = Math.max(1, Math.floor(60000 / perMinute));
  const rows = await fetchRows(precision, limit, options.mode);
  const providerLabel = getProviderLabel(
    options.provider,
    options.mode,
    Boolean(options.permanent)
  );

  const startedAt = Date.now();
  let processed = 0;
  let successful = 0;
  let poiHits = 0;
  let rateLimited = 0;

  for (const row of rows) {
    try {
      let result: GeocodeResult = { ok: false };
      if (options.provider === 'mapbox') {
        result = await mapboxReverse(
          row.lat_round,
          row.lon_round,
          options.mode,
          Boolean(options.permanent)
        );
      } else if (options.provider === 'nominatim') {
        result = await nominatimReverse(row.lat_round, row.lon_round);
      }

      if (result.ok) {
        successful++;
        if (result.poiName) {
          poiHits++;
        }
        await upsertGeocodeCache(row, precision, providerLabel, result);
      }
    } catch (err) {
      const error = err as Error;
      if (error.message === 'rate_limit') {
        rateLimited++;
        logger.warn('[Geocoding] Rate limited, backing off for 60s');
        await sleep(60000);
      } else {
        logger.warn('[Geocoding] Provider error', { error: error.message });
      }
    }

    processed++;
    if (processed < rows.length) {
      await sleep(delayMs);
    }
  }

  const durationMs = Date.now() - startedAt;
  return {
    precision,
    mode: options.mode,
    provider: providerLabel,
    processed,
    successful,
    poiHits,
    rateLimited,
    durationMs,
  };
};

const getGeocodingCacheStats = async (precision: number) => {
  const result = await query(
    `
    WITH rounded AS (
      SELECT
        round(lat::numeric, $1) AS lat_round,
        round(lon::numeric, $1) AS lon_round
      FROM app.observations
      GROUP BY 1, 2
    ),
    cache AS (
      SELECT * FROM app.geocoding_cache WHERE precision = $1
    )
    SELECT
      (SELECT count(*) FROM app.observations) AS observation_count,
      (SELECT count(*) FROM rounded) AS unique_blocks,
      (SELECT count(*) FROM cache) AS cached_blocks,
      (SELECT count(*) FROM cache WHERE address IS NOT NULL) AS cached_with_address,
      (SELECT count(*) FROM cache WHERE poi_name IS NOT NULL) AS cached_with_poi,
      (SELECT count(DISTINCT address) FROM cache WHERE address IS NOT NULL) AS distinct_addresses,
      (
        SELECT count(*)
        FROM rounded r
        LEFT JOIN cache c
          ON c.lat_round = r.lat_round
         AND c.lon_round = r.lon_round
        WHERE c.id IS NULL
      ) AS missing_blocks;
  `,
    [precision]
  );

  const providerRows = await query(
    `
    SELECT provider, count(*)::int AS count
    FROM app.geocoding_cache
    WHERE precision = $1
    GROUP BY provider
    ORDER BY count DESC;
  `,
    [precision]
  );

  const providers: Record<string, number> = {};
  for (const row of providerRows.rows) {
    providers[row.provider] = row.count;
  }

  return {
    precision,
    ...result.rows[0],
    providers,
  };
};

module.exports = {
  runGeocodeCacheUpdate,
  getGeocodingCacheStats,
};
