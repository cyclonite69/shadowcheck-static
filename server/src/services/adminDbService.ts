/**
 * Admin Database Service
 * Uses shadowcheck_admin credentials for sensitive administrative operations
 */

const { Pool } = require('pg');
const secretsManager = require('./secretsManager').default;
const logger = require('../logging/logger');

export {};

// Admin connection settings
const DB_ADMIN_USER = process.env.DB_ADMIN_USER || 'shadowcheck_admin';
const DB_NAME = process.env.DB_NAME || 'shadowcheck_db';
const DB_HOST = process.env.DB_HOST || 'shadowcheck_postgres';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 5432;
const DB_APP_NAME = `${process.env.DB_APP_NAME || 'shadowcheck-static'}-admin`;
const DB_SEARCH_PATH = process.env.DB_SEARCH_PATH || 'app,public';

let adminPool = null;

/**
 * Initialize the admin connection pool
 */
function getAdminPool() {
  if (adminPool) {
    return adminPool;
  }

  const adminPassword = secretsManager.get('db_admin_password');

  if (!adminPassword) {
    logger.error('db_admin_password not available. Admin operations will fail.');
    return null;
  }

  adminPool = new Pool({
    user: DB_ADMIN_USER,
    password: adminPassword,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    max: 2, // Keep admin connections low
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    statement_timeout: 300000, // 5 minutes for heavy admin tasks
    application_name: DB_APP_NAME,
    options: `-c search_path=${DB_SEARCH_PATH}`,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  adminPool.on('error', (err) => {
    logger.error(`Unexpected error on admin pool idle client: ${err.message}`, { error: err });
  });

  return adminPool;
}

/**
 * Administrative query wrapper
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function adminQuery(text, params = []) {
  const pool = getAdminPool();
  if (!pool) {
    throw new Error('Admin database pool not initialized (check DB_ADMIN_PASSWORD)');
  }
  return pool.query(text, params);
}

/**
 * Close admin database connection pool
 * @returns {Promise<void>}
 */
async function closeAdminPool() {
  if (adminPool) {
    await adminPool.end();
    adminPool = null;
    logger.info('Admin database pool closed');
  }
}

module.exports = {
  adminQuery,
  getAdminPool,
  closeAdminPool,
};

// Additional admin service methods

const { query } = require('../config/database');

/**
 * Check for duplicate observations at same time/location
 */
async function checkDuplicateObservations(bssid: string, time: number): Promise<any> {
  const { rows } = await query(
    `
    WITH target_obs AS (
      SELECT time, lat, lon, accuracy
      FROM app.observations
      WHERE bssid = $1 AND time = $2
      LIMIT 1
    )
    SELECT 
      COUNT(*) as total_observations,
      COUNT(DISTINCT l.bssid) as unique_networks,
      ARRAY_AGG(DISTINCT l.bssid ORDER BY l.bssid) as bssids,
      t.lat,
      t.lon,
      t.accuracy,
      to_timestamp(t.time / 1000.0) as timestamp
    FROM app.observations l
    JOIN target_obs t ON 
      l.time = t.time 
      AND l.lat = t.lat 
      AND l.lon = t.lon
      AND l.accuracy = t.accuracy
    GROUP BY t.lat, t.lon, t.accuracy, t.time
  `,
    [bssid, time]
  );
  return rows[0] || null;
}

/**
 * Add a note to a network
 */
async function addNetworkNote(bssid: string, content: string): Promise<number> {
  const result = await query("SELECT app.network_add_note($1, $2, 'general', 'user') as note_id", [
    bssid,
    content,
  ]);
  return result.rows[0].note_id;
}

/**
 * Get complete network summary
 */
async function getNetworkSummary(bssid: string): Promise<any | null> {
  const result = await query(
    `
    SELECT bssid, tags, tag_array, is_threat, is_investigate, is_false_positive, is_suspect,
           notes, detailed_notes, notation_count, image_count, video_count, total_media_count,
           created_at, updated_at
    FROM app.network_tags_full 
    WHERE bssid = $1
  `,
    [bssid]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get backup data for export
 */
async function getBackupData(): Promise<{
  observations: any[];
  networks: any[];
  tags: any[];
}> {
  const [observations, networks, tags] = await Promise.all([
    query('SELECT * FROM app.observations ORDER BY observed_at DESC'),
    query('SELECT * FROM app.networks'),
    query('SELECT * FROM app.network_tags'),
  ]);

  return {
    observations: observations.rows,
    networks: networks.rows,
    tags: tags.rows,
  };
}

/**
 * Upsert network tag (admin operation)
 */
async function upsertNetworkTag(
  bssid: string,
  is_ignored: boolean | null,
  ignore_reason: string | null,
  threat_tag: string | null,
  threat_confidence: number | null,
  notes: string | null
): Promise<any> {
  const result = await adminQuery(
    `INSERT INTO app.network_tags (
      bssid, is_ignored, ignore_reason, threat_tag, threat_confidence, notes
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (bssid) DO UPDATE SET
      is_ignored = COALESCE($2, app.network_tags.is_ignored),
      ignore_reason = CASE WHEN $2 IS NOT NULL THEN $3 ELSE app.network_tags.ignore_reason END,
      threat_tag = COALESCE($4, app.network_tags.threat_tag),
      threat_confidence = CASE WHEN $4 IS NOT NULL THEN $5 ELSE app.network_tags.threat_confidence END,
      notes = COALESCE($6, app.network_tags.notes),
      updated_at = NOW()
    RETURNING *`,
    [bssid, is_ignored, ignore_reason, threat_tag, threat_confidence, notes]
  );
  return result.rows[0];
}

/**
 * Update network tag ignore status
 */
async function updateNetworkTagIgnore(
  bssid: string,
  is_ignored: boolean,
  ignore_reason: string | null
): Promise<any> {
  const result = await adminQuery(
    `UPDATE app.network_tags SET is_ignored = $1, ignore_reason = $2, updated_at = NOW()
     WHERE bssid = $3 RETURNING *`,
    [is_ignored, ignore_reason, bssid]
  );
  return result.rows[0];
}

/**
 * Insert network tag ignore status
 */
async function insertNetworkTagIgnore(
  bssid: string,
  is_ignored: boolean,
  ignore_reason: string | null
): Promise<any> {
  const result = await adminQuery(
    `INSERT INTO app.network_tags (bssid, is_ignored, ignore_reason)
     VALUES ($1, $2, $3) RETURNING *`,
    [bssid, is_ignored, ignore_reason]
  );
  return result.rows[0];
}

/**
 * Update network threat tag
 */
async function updateNetworkThreatTag(
  bssid: string,
  threat_tag: string,
  threat_confidence: number | null
): Promise<any> {
  const result = await adminQuery(
    `UPDATE app.network_tags SET threat_tag = $1, threat_confidence = $2, updated_at = NOW()
     WHERE bssid = $3 RETURNING *`,
    [threat_tag, threat_confidence, bssid]
  );
  return result.rows[0];
}

/**
 * Insert network threat tag
 */
async function insertNetworkThreatTag(
  bssid: string,
  threat_tag: string,
  threat_confidence: number | null
): Promise<any> {
  const result = await adminQuery(
    `INSERT INTO app.network_tags (bssid, threat_tag, threat_confidence)
     VALUES ($1, $2, $3) RETURNING *`,
    [bssid, threat_tag, threat_confidence]
  );
  return result.rows[0];
}

/**
 * Update network tag notes
 */
async function updateNetworkTagNotes(bssid: string, notes: string): Promise<any> {
  const result = await adminQuery(
    `UPDATE app.network_tags SET notes = $1, updated_at = NOW()
     WHERE bssid = $2 RETURNING *`,
    [notes, bssid]
  );
  return result.rows[0];
}

/**
 * Insert network tag notes
 */
async function insertNetworkTagNotes(bssid: string, notes: string): Promise<any> {
  const result = await adminQuery(
    `INSERT INTO app.network_tags (bssid, notes) VALUES ($1, $2) RETURNING *`,
    [bssid, notes]
  );
  return result.rows[0];
}

/**
 * Delete network tag
 */
async function deleteNetworkTag(bssid: string): Promise<number> {
  const result = await adminQuery(`DELETE FROM app.network_tags WHERE bssid = $1`, [bssid]);
  return result.rowCount || 0;
}

/**
 * Request WiGLE lookup for network
 */
async function requestWigleLookup(bssid: string): Promise<any> {
  const result = await adminQuery(
    `UPDATE app.network_tags SET wigle_lookup_requested = true, updated_at = NOW()
     WHERE bssid = $1 RETURNING *`,
    [bssid]
  );
  return result.rows[0];
}

/**
 * Get networks pending WiGLE lookup
 */
async function getNetworksPendingWigleLookup(limit: number): Promise<any[]> {
  const result = await query(
    `SELECT bssid FROM app.network_tags
     WHERE wigle_lookup_requested = true AND wigle_result IS NULL
     ORDER BY updated_at ASC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Export tagged networks for ML training
 */
async function exportMLTrainingData(): Promise<any[]> {
  const result = await query(
    `SELECT
      nt.bssid, nt.threat_tag, nt.threat_confidence, nt.is_ignored, nt.tag_history,
      n.ssid, n.type as network_type, n.frequency, n.capabilities, n.bestlevel as signal_dbm,
      COUNT(o.id) as observation_count,
      COUNT(DISTINCT DATE(o.observed_at)) as unique_days,
      ST_Distance(
        ST_MakePoint(MIN(o.lon), MIN(o.lat))::geography,
        ST_MakePoint(MAX(o.lon), MAX(o.lat))::geography
      ) / 1000.0 as distance_range_km
    FROM app.network_tags nt
    LEFT JOIN app.networks n ON nt.bssid = n.bssid
    LEFT JOIN app.observations o ON nt.bssid = o.bssid
    WHERE nt.threat_tag IS NOT NULL
    GROUP BY nt.bssid, nt.threat_tag, nt.threat_confidence, nt.is_ignored,
             nt.tag_history, n.ssid, n.type, n.frequency, n.capabilities, n.bestlevel, nt.updated_at
    ORDER BY nt.updated_at DESC`
  );
  return result.rows;
}

/**
 * Get import counts after SQLite import
 */
async function getImportCounts(): Promise<{ observations: number; networks: number }> {
  const result = await query(`
    SELECT 
      (SELECT COUNT(*) FROM app.observations) as observations,
      (SELECT COUNT(*) FROM app.networks) as networks
  `);
  return result.rows[0] || { observations: 0, networks: 0 };
}

/**
 * Get all settings
 */
async function getAllSettings(): Promise<any[]> {
  const result = await query(
    'SELECT key, value, description, updated_at FROM app.settings ORDER BY key'
  );
  return result.rows;
}

/**
 * Get setting by key
 */
async function getSettingByKey(key: string): Promise<any | null> {
  const result = await query(
    'SELECT value, description, updated_at FROM app.settings WHERE key = $1',
    [key]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update setting
 */
async function updateSetting(key: string, value: any): Promise<any> {
  const result = await adminQuery(
    'UPDATE app.settings SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *',
    [JSON.stringify(value), key]
  );
  return result.rows[0];
}

/**
 * Toggle ML blending setting
 */
async function toggleMLBlending(): Promise<boolean> {
  const result = await adminQuery(`
    UPDATE app.settings
    SET value = CASE WHEN value::text = 'true' THEN 'false' ELSE 'true' END,
        updated_at = NOW()
    WHERE key = 'ml_blending_enabled'
    RETURNING value
  `);
  return result.rows[0]?.value;
}

/**
 * Save ML model configuration
 */
async function saveMLModelConfig(
  modelType: string,
  coefficients: any,
  intercept: number,
  featureNames: string[]
): Promise<void> {
  await adminQuery(
    `INSERT INTO app.ml_model_config (model_type, coefficients, intercept, feature_names, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (model_type) DO UPDATE
     SET coefficients = $2, intercept = $3, feature_names = $4, updated_at = NOW()`,
    [modelType, JSON.stringify(coefficients), intercept, JSON.stringify(featureNames)]
  );
}

/**
 * Truncate all data (dangerous admin operation)
 */
async function truncateAllData(): Promise<void> {
  await adminQuery('TRUNCATE TABLE app.observations CASCADE');
  await adminQuery('TRUNCATE TABLE app.networks CASCADE');
}

// OUI Analysis Methods
async function getOUIGroups(): Promise<any[]> {
  const result = await query(`
    SELECT oui, device_count, collective_threat_score, threat_level, primary_bssid,
           secondary_bssids, has_randomization, randomization_confidence, last_updated
    FROM app.oui_device_groups
    WHERE device_count > 1
    ORDER BY collective_threat_score DESC
  `);
  return result.rows;
}

async function getOUIGroupDetails(
  oui: string
): Promise<{ group: any; randomization: any; networks: any[] }> {
  const [group, randomization, networks] = await Promise.all([
    query('SELECT * FROM app.oui_device_groups WHERE oui = $1', [oui]),
    query('SELECT * FROM app.mac_randomization_suspects WHERE oui = $1', [oui]),
    query(
      `
      SELECT ap.bssid, nts.final_threat_score, nts.final_threat_level, ap.ssid,
             COUNT(obs.id) as observation_count
      FROM app.access_points ap
      LEFT JOIN app.network_threat_scores nts ON ap.bssid = nts.bssid
      LEFT JOIN app.observations obs ON ap.bssid = obs.bssid
      WHERE SUBSTRING(ap.bssid, 1, 8) = $1
      GROUP BY ap.bssid, nts.final_threat_score, nts.final_threat_level, ap.ssid
      ORDER BY nts.final_threat_score DESC
    `,
      [oui]
    ),
  ]);
  return { group: group.rows[0], randomization: randomization.rows[0], networks: networks.rows };
}

async function getMACRandomizationSuspects(): Promise<any[]> {
  const result = await query(`
    SELECT oui, status, confidence_score, avg_distance_km, movement_speed_kmh,
           array_length(mac_sequence, 1) as mac_count, created_at
    FROM app.mac_randomization_suspects
    ORDER BY confidence_score DESC
  `);
  return result.rows;
}

// Maintenance Methods
async function getDuplicateObservationStats(): Promise<{ total: number; unique_obs: number }> {
  const result = await query(`
    SELECT COUNT(*) as total,
           COUNT(DISTINCT (bssid, observed_at, latitude, longitude, accuracy_meters)) as unique_obs
    FROM app.observations
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  `);
  return result.rows[0] || { total: 0, unique_obs: 0 };
}

async function deleteDuplicateObservations(): Promise<number> {
  const result = await adminQuery(`
    DELETE FROM app.observations
    WHERE unified_id IN (
      SELECT unified_id
      FROM (
        SELECT unified_id,
          ROW_NUMBER() OVER (
            PARTITION BY bssid, observed_at, latitude, longitude, accuracy_meters 
            ORDER BY unified_id
          ) as rn
        FROM app.observations
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ) t
      WHERE rn > 1
    )
  `);
  return result.rowCount || 0;
}

async function getObservationCount(): Promise<number> {
  const result = await query(`
    SELECT COUNT(*) as total
    FROM app.observations
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  `);
  return parseInt(result.rows[0]?.total || '0', 10);
}

async function refreshColocationView(minValidTimestamp: number): Promise<void> {
  await adminQuery('DROP MATERIALIZED VIEW IF EXISTS app.network_colocation_scores CASCADE');
  await adminQuery(`
    CREATE MATERIALIZED VIEW app.network_colocation_scores AS
    WITH network_locations AS (
      SELECT bssid, observed_at,
        ST_SnapToGrid(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geometry, 0.001) as location_grid,
        observed_at / 60000 as time_bucket
      FROM app.observations
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND (accuracy_meters IS NULL OR accuracy_meters <= 100)
        AND observed_at >= ${minValidTimestamp}
    ),
    colocation_pairs AS (
      SELECT n1.bssid, COUNT(DISTINCT n2.bssid) as companion_count,
             COUNT(DISTINCT n1.location_grid) as shared_location_count
      FROM network_locations n1
      JOIN network_locations n2 ON n1.location_grid = n2.location_grid
        AND n1.time_bucket = n2.time_bucket AND n1.bssid < n2.bssid
      GROUP BY n1.bssid
      HAVING COUNT(DISTINCT n2.bssid) >= 1 AND COUNT(DISTINCT n1.location_grid) >= 3
    )
    SELECT DISTINCT ON (bssid) bssid, companion_count, shared_location_count,
      LEAST(30, CASE WHEN companion_count >= 3 THEN 30 WHEN companion_count >= 2 THEN 20
                     WHEN companion_count >= 1 THEN 10 ELSE 0 END) as colocation_score,
      NOW() as computed_at
    FROM colocation_pairs
    UNION ALL
    SELECT n2.bssid, COUNT(DISTINCT n1.bssid) as companion_count,
           COUNT(DISTINCT n1.location_grid) as shared_location_count,
      LEAST(30, CASE WHEN COUNT(DISTINCT n1.bssid) >= 3 THEN 30 WHEN COUNT(DISTINCT n1.bssid) >= 2 THEN 20
                     WHEN COUNT(DISTINCT n1.bssid) >= 1 THEN 10 ELSE 0 END) as colocation_score,
      NOW() as computed_at
    FROM network_locations n1
    JOIN network_locations n2 ON n1.location_grid = n2.location_grid
      AND n1.time_bucket = n2.time_bucket AND n1.bssid < n2.bssid
    GROUP BY n2.bssid
    HAVING COUNT(DISTINCT n1.bssid) >= 1 AND COUNT(DISTINCT n1.location_grid) >= 3
    ORDER BY bssid, companion_count DESC
  `);
  await adminQuery(
    'CREATE INDEX IF NOT EXISTS idx_colocation_bssid ON app.network_colocation_scores(bssid)'
  );
}

// Network Media Methods
async function uploadNetworkMedia(
  bssid: string,
  mediaType: string,
  filename: string,
  fileSize: number,
  mimeType: string,
  mediaBuffer: Buffer,
  description: string
): Promise<any> {
  const result = await adminQuery(
    `INSERT INTO app.network_media
      (bssid, media_type, filename, file_size, mime_type, media_data, description, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin')
     RETURNING id, filename, file_size, created_at`,
    [bssid, mediaType, filename, fileSize, mimeType, mediaBuffer, description]
  );
  return result.rows[0];
}

async function getNetworkMediaList(bssid: string): Promise<any[]> {
  const result = await query(
    `SELECT id, media_type, filename, original_filename, file_size, mime_type, description, uploaded_by, created_at
     FROM app.network_media WHERE bssid = $1 ORDER BY created_at DESC`,
    [bssid]
  );
  return result.rows;
}

async function getNetworkMediaFile(id: string): Promise<any | null> {
  const result = await query(
    'SELECT filename, mime_type, media_data FROM app.network_media WHERE id = $1',
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Network Notes Methods
async function addNetworkNotation(bssid: string, text: string, type: string): Promise<any> {
  const result = await adminQuery('SELECT app.network_add_notation($1, $2, $3) as notation', [
    bssid,
    text,
    type,
  ]);
  return result.rows[0].notation;
}

async function getNetworkNotations(bssid: string): Promise<any[]> {
  const result = await query('SELECT detailed_notes FROM app.network_tags WHERE bssid = $1', [
    bssid,
  ]);
  return result.rows.length > 0 ? result.rows[0].detailed_notes || [] : [];
}

async function addNetworkNoteWithFunction(
  bssid: string,
  content: string,
  noteType: string,
  userId: string
): Promise<number> {
  const result = await adminQuery('SELECT app.network_add_note($1, $2, $3, $4) as note_id', [
    bssid,
    content,
    noteType,
    userId,
  ]);
  return result.rows[0].note_id;
}

async function getNetworkNotes(bssid: string): Promise<any[]> {
  const result = await query(
    `SELECT id, content, note_type, user_id, created_at, updated_at
     FROM app.network_notes WHERE bssid = $1 ORDER BY created_at DESC`,
    [bssid]
  );
  return result.rows;
}

async function deleteNetworkNote(noteId: string): Promise<string | null> {
  const result = await adminQuery('DELETE FROM app.network_notes WHERE id = $1 RETURNING bssid', [
    noteId,
  ]);
  return result.rows.length > 0 ? result.rows[0].bssid : null;
}

async function addNoteMedia(
  noteId: string,
  bssid: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  mediaType: string
): Promise<any> {
  const result = await adminQuery(
    `INSERT INTO app.note_media (note_id, bssid, file_path, file_name, file_size, media_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, file_path`,
    [noteId, bssid, filePath, fileName, fileSize, mediaType]
  );
  return result.rows[0];
}

// Admin Tags Methods (legacy)
async function getNetworkTagsByBssid(bssid: string): Promise<any | null> {
  const result = await query('SELECT tags FROM app.network_tags WHERE bssid = $1', [bssid]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function addNetworkTagArray(bssid: string, tags: string[]): Promise<void> {
  await adminQuery(
    `INSERT INTO app.network_tags (bssid, tags) VALUES ($1, $2)
     ON CONFLICT (bssid) DO UPDATE SET tags = $2, updated_at = NOW()`,
    [bssid, tags]
  );
}

async function addSingleNetworkTag(bssid: string, tag: string): Promise<void> {
  await adminQuery(
    `INSERT INTO app.network_tags (bssid, tags) VALUES ($1, ARRAY[$2]::text[])
     ON CONFLICT (bssid) DO UPDATE SET tags = array_append(app.network_tags.tags, $2), updated_at = NOW()`,
    [bssid, tag]
  );
}

async function removeSingleNetworkTag(bssid: string, tag: string): Promise<void> {
  await adminQuery(
    `UPDATE app.network_tags SET tags = array_remove(tags, $2), updated_at = NOW() WHERE bssid = $1`,
    [bssid, tag]
  );
}

async function getNetworkTagsAndNotes(bssid: string): Promise<any | null> {
  const result = await query('SELECT bssid, tags, notes FROM app.network_tags WHERE bssid = $1', [
    bssid,
  ]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function clearNetworkTags(bssid: string): Promise<void> {
  await adminQuery(
    `UPDATE app.network_tags SET tags = ARRAY[]::text[], updated_at = NOW() WHERE bssid = $1`,
    [bssid]
  );
}

async function getAllNetworkTags(): Promise<any[]> {
  const result = await query(
    `SELECT bssid, tags, notes, created_at, updated_at FROM app.network_tags
     WHERE tags IS NOT NULL AND array_length(tags, 1) > 0 ORDER BY updated_at DESC`
  );
  return result.rows;
}

async function searchNetworksByTag(tag: string): Promise<any[]> {
  const result = await query(
    `SELECT nt.bssid, nt.tags, nt.notes, n.ssid, n.type, n.bestlevel as signal
     FROM app.network_tags nt
     LEFT JOIN app.networks n ON nt.bssid = n.bssid
     WHERE $1 = ANY(nt.tags) ORDER BY nt.updated_at DESC`,
    [tag]
  );
  return result.rows;
}

// Legacy tag toggle operations (uses custom SQL functions)
async function insertNetworkTagWithNotes(
  bssid: string,
  tags: string[],
  notes: string | null
): Promise<void> {
  await adminQuery(
    `INSERT INTO app.network_tags (bssid, tags, notes, created_by)
     VALUES ($1, $2::jsonb, $3, 'admin')`,
    [bssid, JSON.stringify(tags), notes]
  );
}

async function removeTagFromNetwork(bssid: string, tag: string): Promise<void> {
  await adminQuery(
    `UPDATE app.network_tags
     SET tags = app.network_remove_tag(tags, $2), updated_at = NOW()
     WHERE bssid = $1`,
    [bssid, tag]
  );
}

async function addTagToNetwork(bssid: string, tag: string, notes: string | null): Promise<void> {
  await adminQuery(
    `UPDATE app.network_tags
     SET tags = app.network_add_tag(tags, $2), notes = COALESCE($3, notes), updated_at = NOW()
     WHERE bssid = $1`,
    [bssid, tag, notes]
  );
}

async function getNetworkTagsExpanded(bssid: string): Promise<any | null> {
  const result = await query(
    `SELECT bssid, tags, tag_array, is_threat, is_investigate, is_false_positive, is_suspect,
            notes, created_at, updated_at
     FROM app.network_tags_expanded WHERE bssid = $1`,
    [bssid]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function searchNetworksByTagArray(tagArray: string[], limit: number): Promise<any[]> {
  const result = await query(
    `SELECT bssid, tags, tag_array, is_threat, is_investigate, is_false_positive, is_suspect,
            notes, updated_at
     FROM app.network_tags_expanded
     WHERE tags ?& $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [tagArray, limit]
  );
  return result.rows;
}

module.exports.checkDuplicateObservations = checkDuplicateObservations;
module.exports.addNetworkNote = addNetworkNote;
module.exports.getNetworkSummary = getNetworkSummary;
module.exports.getBackupData = getBackupData;
module.exports.upsertNetworkTag = upsertNetworkTag;
module.exports.updateNetworkTagIgnore = updateNetworkTagIgnore;
module.exports.insertNetworkTagIgnore = insertNetworkTagIgnore;
module.exports.updateNetworkThreatTag = updateNetworkThreatTag;
module.exports.insertNetworkThreatTag = insertNetworkThreatTag;
module.exports.updateNetworkTagNotes = updateNetworkTagNotes;
module.exports.insertNetworkTagNotes = insertNetworkTagNotes;
module.exports.deleteNetworkTag = deleteNetworkTag;
module.exports.requestWigleLookup = requestWigleLookup;
module.exports.getNetworksPendingWigleLookup = getNetworksPendingWigleLookup;
module.exports.exportMLTrainingData = exportMLTrainingData;
module.exports.getImportCounts = getImportCounts;
module.exports.getAllSettings = getAllSettings;
module.exports.getSettingByKey = getSettingByKey;
module.exports.updateSetting = updateSetting;
module.exports.toggleMLBlending = toggleMLBlending;
module.exports.saveMLModelConfig = saveMLModelConfig;
module.exports.truncateAllData = truncateAllData;
module.exports.getOUIGroups = getOUIGroups;
module.exports.getOUIGroupDetails = getOUIGroupDetails;
module.exports.getMACRandomizationSuspects = getMACRandomizationSuspects;
module.exports.getDuplicateObservationStats = getDuplicateObservationStats;
module.exports.deleteDuplicateObservations = deleteDuplicateObservations;
module.exports.getObservationCount = getObservationCount;
module.exports.refreshColocationView = refreshColocationView;
module.exports.uploadNetworkMedia = uploadNetworkMedia;
module.exports.getNetworkMediaList = getNetworkMediaList;
module.exports.getNetworkMediaFile = getNetworkMediaFile;
module.exports.addNetworkNotation = addNetworkNotation;
module.exports.getNetworkNotations = getNetworkNotations;
module.exports.addNetworkNoteWithFunction = addNetworkNoteWithFunction;
module.exports.getNetworkNotes = getNetworkNotes;
module.exports.deleteNetworkNote = deleteNetworkNote;
module.exports.addNoteMedia = addNoteMedia;
module.exports.getNetworkTagsByBssid = getNetworkTagsByBssid;
module.exports.addNetworkTagArray = addNetworkTagArray;
module.exports.addSingleNetworkTag = addSingleNetworkTag;
module.exports.removeSingleNetworkTag = removeSingleNetworkTag;
module.exports.getNetworkTagsAndNotes = getNetworkTagsAndNotes;
module.exports.clearNetworkTags = clearNetworkTags;
module.exports.getAllNetworkTags = getAllNetworkTags;
module.exports.searchNetworksByTag = searchNetworksByTag;
module.exports.insertNetworkTagWithNotes = insertNetworkTagWithNotes;
module.exports.removeTagFromNetwork = removeTagFromNetwork;
module.exports.addTagToNetwork = addTagToNetwork;
module.exports.getNetworkTagsExpanded = getNetworkTagsExpanded;
module.exports.searchNetworksByTagArray = searchNetworksByTagArray;
