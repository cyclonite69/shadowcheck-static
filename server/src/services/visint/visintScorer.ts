/**
 * Query database using custom spatial-temporal parameters and firmware-based signature scoring
 */
export async function queryCorrelatedObservations(
  queryFn: (sql: string, params: any[]) => Promise<any>,
  lon: number,
  lat: number,
  timestamp: string,
  radiusMeters: number = 50,
  windowHours: number = 2,
  limit: number = 5
): Promise<any[]> {
  const baseDate = new Date(timestamp);
  const startTime = new Date(baseDate.getTime() - windowHours * 60 * 60 * 1000).toISOString();
  const endTime = new Date(baseDate.getTime() + windowHours * 60 * 60 * 1000).toISOString();

  const dbQuery = `
    SELECT
      id,
      bssid,
      ssid,
      radio_type,
      radio_service,
      level AS signal,
      observed_at,
      lat,
      lon,
      ROUND(ST_Distance(
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      )::numeric, 2) AS dist_meters,
      ROUND(ABS(EXTRACT(EPOCH FROM (observed_at - $3::timestamptz))) / 60, 1)
        AS delta_minutes,
      CASE
        WHEN radio_service ILIKE '%3e1d50cd-7e3e-427d-8e1c-b78aa87fe624%' THEN 3
        WHEN ssid ~ '^[0-9]{10}$'                                           THEN 2
        WHEN ssid ~ '^Penguin-[0-9]{10}$'                                   THEN 2
        WHEN ssid = '4' AND radio_type = 'E'                                THEN 1
        ELSE 0
      END AS detection_score
    FROM app.observations
    WHERE
      ST_DWithin(
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $4
      )
      AND observed_at BETWEEN $5::timestamptz AND $6::timestamptz
    ORDER BY delta_minutes ASC, detection_score DESC, dist_meters ASC
    LIMIT $7
  `;

  const { rows } = await queryFn(dbQuery, [
    lon,
    lat,
    timestamp,
    radiusMeters,
    startTime,
    endTime,
    limit,
  ]);
  return rows;
}
