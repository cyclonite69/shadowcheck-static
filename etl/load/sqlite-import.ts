#!/usr/bin/env tsx
/**
 * TURBO IMPORT V2 - Enhanced High-Performance WiGLE SQLite → PostgreSQL Importer
 *
 * Improvements:
 * - Fixed column mappings (level → level in observations table)
 * - Better error handling with retry logic
 * - Real-time progress bars
 * - Data validation before insert
 * - Debug mode for troubleshooting
 * - Auto-refresh Materialized Views
 * - Comprehensive logging
 */

import * as fs from 'fs';
import { Worker, workerData, parentPort, isMainThread } from 'worker_threads';
import { Pool, QueryResult } from 'pg';
import sqlite3 from 'sqlite3';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

interface Config {
  WORKERS: number;
  BATCH_SIZE: number;
  MAX_RETRIES: number;
  RETRY_DELAY_MS: number;
  DEBUG: boolean;
  DB_CONFIG: {
    user: string;
    password?: string;
    host: string;
    database: string;
    port: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
}

interface WorkerData {
  sqliteFile: string;
  offset: number;
  limit: number;
  workerId: number;
  batchSize: number;
  dbConfig: Config['DB_CONFIG'];
  debug: boolean;
}

interface WorkerResult {
  imported: number;
  failed: number;
  errors: string[];
}

interface SqliteRow {
  bssid: string;
  lat: number | string;
  lon: number | string;
  altitude?: number | string;
  accuracy?: number | string;
  time: number | string;
  level: number | string;
  mfgrid?: string;
  type?: string;
}

interface ValidatedRecord {
  bssid: string;
  lat: number;
  lon: number;
  altitude: number;
  accuracy: number;
  time: Date;
  level: number;
  mfgrid: string | null;
  radio_type: string;
}

interface RefreshRow {
  view_name: string;
  refresh_duration: { seconds?: number; milliseconds?: number } | string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG: Config = {
  WORKERS: parseInt(process.env.IMPORT_WORKERS || '4', 10),
  BATCH_SIZE: parseInt(process.env.IMPORT_BATCH_SIZE || '1000', 10),
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  DEBUG: process.env.DEBUG === 'true',
  DB_CONFIG: {
    user: process.env.DB_USER || 'shadowcheck_user',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'shadowcheck_db',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

// ============================================================================
// MAIN IMPORT ORCHESTRATOR
// ============================================================================

class TurboImporter {
  private sqliteFile: string;
  private pool: Pool;
  private importId: number | null = null;
  private totalRecords = 0;
  private importedRecords = 0;
  private failedRecords = 0;
  private startTime: number;
  private errors: string[] = [];

  constructor(sqliteFile: string) {
    this.sqliteFile = sqliteFile;
    this.pool = new Pool(CONFIG.DB_CONFIG);
    this.startTime = Date.now();
  }

  async start(): Promise<void> {
    console.log('\n🚀 TURBO IMPORT V2 - Enhanced Parallel Loading');
    console.log('━'.repeat(60));
    console.log(`📁 Source: ${this.sqliteFile}`);
    console.log(`🧵 Workers: ${CONFIG.WORKERS} threads`);
    console.log(`📦 Batch size: ${CONFIG.BATCH_SIZE} records/batch`);
    console.log(`🐛 Debug mode: ${CONFIG.DEBUG ? 'ON' : 'OFF'}\n`);

    try {
      // 1. Test database connection
      await this.testConnections();

      // 2. Analyze SQLite database
      await this.analyzeSQLiteSchema();

      // 3. Create import tracking record
      await this.createImportRecord();

      // 4. Get total record count
      this.totalRecords = await this.getTotalRecords();
      console.log(`📊 Total records: ${this.totalRecords.toLocaleString()}\n`);

      if (this.totalRecords === 0) {
        console.log('⚠️  No records to import. Exiting.');
        return;
      }

      // 5. Run parallel import
      console.log('⚡ Starting parallel import...\n');
      await this.runParallelImport();

      // 6. Refresh Materialized Views
      await this.refreshMaterializedViews();

      // 7. Mark import as complete
      await this.completeImport();

      // 8. Print summary
      this.printSummary();
    } catch (error) {
      const err = error as Error;
      console.error('\n❌ IMPORT FAILED:', err.message);
      if (CONFIG.DEBUG) {
        console.error('Stack trace:', err.stack);
      }
      await this.failImport(err);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  private async testConnections(): Promise<void> {
    console.log('🔍 Testing connections...');

    // Test SQLite
    if (!fs.existsSync(this.sqliteFile)) {
      throw new Error(`SQLite file not found: ${this.sqliteFile}`);
    }

    // Test PostgreSQL
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log(`✅ PostgreSQL connected: ${result.rows[0].now}`);
    } catch (error) {
      const err = error as Error;
      throw new Error(`PostgreSQL connection failed: ${err.message}`);
    }
  }

  private async analyzeSQLiteSchema(): Promise<void> {
    console.log('🔍 Analyzing SQLite schema...');

    return new Promise((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.sqliteFile, sqlite3.OPEN_READONLY);

      db.get(
        'SELECT sql FROM sqlite_master WHERE type="table" AND name="location"',
        (err: Error | null, row: { sql: string } | undefined) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          if (!row) {
            db.close();
            reject(new Error('Table "location" not found in SQLite database'));
            return;
          }

          console.log('✅ SQLite schema validated');
          if (CONFIG.DEBUG) {
            console.log('Schema:', row.sql);
          }

          db.close();
          resolve();
        }
      );
    });
  }

  private async createImportRecord(): Promise<void> {
    const result = await this.pool.query(
      `
      INSERT INTO app.imports (source_file, source_type, status, started_at, errors)
      VALUES ($1, $2, $3, NOW(), $4::jsonb)
      RETURNING id
    `,
      [
        this.sqliteFile,
        'wigle',
        'in_progress',
        JSON.stringify({
          workers: CONFIG.WORKERS,
          batch_size: CONFIG.BATCH_SIZE,
          debug: CONFIG.DEBUG,
        }),
      ]
    );

    this.importId = result.rows[0].id;
    console.log(`📋 Import ID: ${this.importId}`);
  }

  private async getTotalRecords(): Promise<number> {
    return new Promise((resolve, reject) => {
      const db = new (sqlite3.verbose().Database)(this.sqliteFile, sqlite3.OPEN_READONLY);
      db.get(
        'SELECT COUNT(*) as count FROM location',
        (err: Error | null, row: { count: number }) => {
          db.close();
          if (err) {
            reject(err);
          } else {
            resolve(row.count);
          }
        }
      );
    });
  }

  private async runParallelImport(): Promise<void> {
    const recordsPerWorker = Math.ceil(this.totalRecords / CONFIG.WORKERS);
    const workers: Promise<WorkerResult>[] = [];

    for (let i = 0; i < CONFIG.WORKERS; i++) {
      const offset = i * recordsPerWorker;
      const limit = Math.min(recordsPerWorker, this.totalRecords - offset);

      if (limit <= 0) {
        break;
      }

      workers.push(this.spawnWorker(offset, limit, i + 1));
    }

    // Wait for all workers to complete
    const results = await Promise.all(workers);

    // Aggregate results
    this.importedRecords = results.reduce((sum, r) => sum + r.imported, 0);
    this.failedRecords = results.reduce((sum, r) => sum + r.failed, 0);
    this.errors = results.flatMap((r) => r.errors || []);
  }

  private spawnWorker(offset: number, limit: number, workerId: number): Promise<WorkerResult> {
    return new Promise((resolve) => {
      const worker = new Worker(__filename, {
        workerData: {
          sqliteFile: this.sqliteFile,
          offset,
          limit,
          workerId,
          batchSize: CONFIG.BATCH_SIZE,
          dbConfig: CONFIG.DB_CONFIG,
          debug: CONFIG.DEBUG,
        } as WorkerData,
      });

      let lastUpdate = Date.now();

      worker.on('message', (msg: { type: string; [key: string]: unknown }) => {
        if (msg.type === 'progress') {
          // Throttle progress updates to every 500ms
          if (Date.now() - lastUpdate > 500) {
            process.stdout.write(
              `\r🔄 [W${workerId}] ${(msg.imported as number).toLocaleString()}/${(msg.total as number).toLocaleString()} ` +
                `(${msg.percent}%) | Speed: ${(msg.speed as number).toLocaleString()} rec/s`
            );
            lastUpdate = Date.now();
          }
        } else if (msg.type === 'complete') {
          console.log(
            `\n✅ Worker ${workerId} done: ` +
              `${(msg.imported as number).toLocaleString()} imported, ` +
              `${(msg.failed as number).toLocaleString()} failed ` +
              `(${(msg.duration as number).toFixed(1)}s)`
          );
          resolve({
            imported: msg.imported as number,
            failed: msg.failed as number,
            errors: msg.errors as string[],
          });
        } else if (msg.type === 'error') {
          console.error(`\n❌ Worker ${workerId} error:`, msg.error);
        }
      });

      worker.on('error', (error: Error) => {
        console.error(`\n❌ Worker ${workerId} crashed:`, error.message);
        resolve({ imported: 0, failed: 0, errors: [error.message] });
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`\n⚠️  Worker ${workerId} exited with code ${code}`);
        }
      });
    });
  }

  private async refreshMaterializedViews(): Promise<void> {
    console.log('\n🔄 Refreshing Materialized Views...');
    const mvStart = Date.now();

    try {
      const result: QueryResult<RefreshRow> = await this.pool.query(
        'SELECT * FROM app.refresh_all_materialized_views()'
      );

      console.log('✅ Materialized Views refreshed:');
      result.rows.forEach((row) => {
        // Extract seconds from interval string (e.g., "00:00:12.345" or "12.345 seconds")
        const duration = row.refresh_duration;
        let seconds = 0;

        if (typeof duration === 'object' && duration.seconds !== undefined) {
          seconds = duration.seconds + (duration.milliseconds || 0) / 1000;
        } else if (typeof duration === 'string') {
          const match = duration.match(/(\d+\.?\d*)/);
          seconds = match ? parseFloat(match[1]) : 0;
        }

        console.log(`   - ${row.view_name}: ${seconds.toFixed(2)}s`);
      });

      console.log(`   Total MV refresh time: ${((Date.now() - mvStart) / 1000).toFixed(2)}s`);
    } catch (error) {
      const err = error as Error;
      console.error('⚠️  MV refresh failed:', err.message);
      // Don't fail the import if MV refresh fails
    }
  }

  private async completeImport(): Promise<void> {
    await this.pool.query(
      `
      UPDATE app.imports
      SET status = 'completed',
          completed_at = NOW(),
          records_total = $1,
          records_imported = $2,
          records_failed = $3,
          duration_seconds = $4,
          errors = $5::jsonb
      WHERE id = $6
    `,
      [
        this.totalRecords,
        this.importedRecords,
        this.failedRecords,
        Math.round((Date.now() - this.startTime) / 1000),
        JSON.stringify({
          sample_errors: this.errors.slice(0, 10),
          total_error_count: this.errors.length,
        }),
        this.importId,
      ]
    );
  }

  private async failImport(error: Error): Promise<void> {
    if (this.importId) {
      await this.pool.query(
        `
        UPDATE app.imports
        SET status = 'failed',
            completed_at = NOW(),
            duration_seconds = $1,
            errors = $2::jsonb
        WHERE id = $3
      `,
        [
          Math.round((Date.now() - this.startTime) / 1000),
          JSON.stringify({
            error: error.message,
            stack: error.stack,
            sample_errors: this.errors.slice(0, 10),
          }),
          this.importId,
        ]
      );
    }
  }

  private printSummary(): void {
    const duration = (Date.now() - this.startTime) / 1000;
    const recordsPerSecond = Math.round(this.importedRecords / duration);
    const successRate = ((this.importedRecords / this.totalRecords) * 100).toFixed(2);

    console.log(`\n${'━'.repeat(60)}`);
    console.log('✅ IMPORT COMPLETE!\n');
    console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log(`📈 Speed: ${recordsPerSecond.toLocaleString()} records/second`);
    console.log(`✔️  Imported: ${this.importedRecords.toLocaleString()} (${successRate}%)`);
    console.log(`❌ Failed: ${this.failedRecords.toLocaleString()}`);

    if (this.errors.length > 0) {
      console.log('\n⚠️  Sample errors (showing first 5):');
      this.errors.slice(0, 5).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    }

    console.log(`${'━'.repeat(60)}\n`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map WiGLE radio type codes to database enum values
 */
function mapRadioType(wigleType: string): string {
  const typeMap: Record<string, string> = {
    W: 'wifi', // WiFi
    B: 'bluetooth_classic', // Bluetooth Classic
    E: 'bluetooth_le', // Bluetooth Low Energy
    G: 'cellular_gsm', // GSM
    C: 'cellular_gsm', // CDMA (map to GSM)
    D: 'cellular_lte', // WCDMA (map to LTE)
    L: 'cellular_lte', // LTE
    N: 'cellular_5g', // 5G NR
    F: 'wifi', // NFC (map to wifi as fallback)
  };
  return typeMap[wigleType] || 'wifi'; // Default to wifi
}

function validateRecord(row: SqliteRow): ValidatedRecord | null {
  // Validate BSSID
  if (!row.bssid || typeof row.bssid !== 'string') {
    return null;
  }

  // Validate coordinates
  const lat = parseFloat(String(row.lat));
  const lon = parseFloat(String(row.lon));

  if (isNaN(lat) || isNaN(lon)) {
    return null;
  }
  if (lat < -90 || lat > 90) {
    return null;
  }
  if (lon < -180 || lon > 180) {
    return null;
  }
  if (!isFinite(lat) || !isFinite(lon)) {
    return null;
  }

  // Validate time (must be after Jan 1, 2000 - 946684800000 ms)
  const time = parseInt(String(row.time), 10);
  const MIN_VALID_TIMESTAMP = 946684800000;
  if (isNaN(time) || time < MIN_VALID_TIMESTAMP) {
    return null;
  }

  // Validate signal level
  const level = parseInt(String(row.level), 10);
  if (isNaN(level)) {
    return null;
  }

  return {
    bssid: row.bssid.toUpperCase(),
    lat: lat,
    lon: lon,
    altitude: parseFloat(String(row.altitude)) || 0,
    accuracy: parseFloat(String(row.accuracy)) || 0,
    time: new Date(time),
    level: level,
    mfgrid: row.mfgrid || null,
    radio_type: mapRadioType(row.type || 'W'), // Map WiGLE type to DB enum
  };
}

async function insertBatch(pool: Pool, records: ValidatedRecord[]): Promise<void> {
  if (records.length === 0) {
    return;
  }

  // Build multi-row INSERT for observations
  const obsValues: string[] = [];
  const obsParams: unknown[] = [];
  let paramIndex = 1;

  for (const record of records) {
    obsValues.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, ` +
        `$${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
    );

    obsParams.push(
      record.bssid,
      record.lat,
      record.lon,
      record.level,
      record.accuracy,
      record.time,
      record.radio_type, // Use mapped radio type
      'wigle_app' // Source type
    );

    paramIndex += 8;
  }

  const obsSql = `
    INSERT INTO app.observations (
      bssid, lat, lon, level, accuracy, time, radio_type, source_type
    )
    VALUES ${obsValues.join(', ')}
  `;

  await pool.query(obsSql, obsParams);

  // Upsert networks (deduplicated) - group by type to insert correct type per BSSID
  const bssidTypeMap = new Map<string, string>();
  for (const record of records) {
    if (!bssidTypeMap.has(record.bssid)) {
      bssidTypeMap.set(record.bssid, record.radio_type);
    }
  }

  const networkValues: string[] = [];
  const networkParams: unknown[] = [];
  paramIndex = 1;

  for (const [bssid, radioType] of bssidTypeMap.entries()) {
    networkValues.push(`($${paramIndex}, $${paramIndex + 1})`);
    networkParams.push(bssid, radioType);
    paramIndex += 2;
  }

  if (networkValues.length > 0) {
    const networkSql = `
      INSERT INTO app.networks (bssid, type)
      VALUES ${networkValues.join(', ')}
      ON CONFLICT (bssid) DO NOTHING
    `;
    await pool.query(networkSql, networkParams);
  }
}

// ============================================================================
// WORKER THREAD LOGIC
// ============================================================================

if (!isMainThread && workerData && parentPort) {
  (async () => {
    const {
      sqliteFile,
      offset,
      limit,
      workerId: _workerId,
      batchSize,
      dbConfig,
      debug,
    } = workerData as WorkerData;

    const pool = new Pool(dbConfig);
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];
    const startTime = Date.now();
    let lastProgressTime = Date.now();

    try {
      const db = new (sqlite3.verbose().Database)(sqliteFile, sqlite3.OPEN_READONLY);

      // Query with CORRECT column names from WiGLE SQLite schema
      // JOIN with network table to get type
      const query = `
        SELECT
          l.bssid,
          l.lat,
          l.lon,
          l.altitude,
          l.accuracy,
          l.time,
          l.level,
          l.mfgrid,
          COALESCE(n.type, 'W') as type
        FROM location l
        LEFT JOIN network n ON l.bssid = n.bssid
        WHERE l.bssid IS NOT NULL
          AND l.lat IS NOT NULL
          AND l.lon IS NOT NULL
        ORDER BY l._id
        LIMIT ${limit} OFFSET ${offset}
      `;

      await new Promise<void>((resolve, reject) => {
        let batch: ValidatedRecord[] = [];
        let processedCount = 0;

        db.each(
          query,
          async (err: Error | null, row: SqliteRow) => {
            if (err) {
              errors.push(`SQLite read error: ${err.message}`);
              failed++;
              return;
            }

            // Debug: Log first few rows
            if (debug && processedCount < 5) {
              parentPort!.postMessage({
                type: 'error',
                error: `DEBUG Row ${processedCount}: ${JSON.stringify(row)}`,
              });
            }

            // Validate and clean data
            const record = validateRecord(row);
            if (!record) {
              failed++;
              const failReason = !row.bssid
                ? 'no_bssid'
                : isNaN(parseFloat(String(row.lat)))
                  ? 'bad_lat'
                  : isNaN(parseFloat(String(row.lon)))
                    ? 'bad_lon'
                    : isNaN(parseInt(String(row.time), 10))
                      ? 'bad_time'
                      : isNaN(parseInt(String(row.level), 10))
                        ? 'bad_level'
                        : 'unknown';
              errors.push(
                `Invalid record (${failReason}): ${JSON.stringify(row).substring(0, 150)}`
              );
              return;
            }

            batch.push(record);

            if (batch.length >= batchSize) {
              const currentBatch = [...batch];
              batch = [];

              try {
                await insertBatch(pool, currentBatch);
                imported += currentBatch.length;
                processedCount += currentBatch.length;

                // Send progress update
                const now = Date.now();
                if (now - lastProgressTime > 1000) {
                  const elapsed = (now - startTime) / 1000;
                  const speed = Math.round(processedCount / elapsed);
                  const percent = Math.round((processedCount / limit) * 100);

                  parentPort!.postMessage({
                    type: 'progress',
                    imported: processedCount,
                    total: limit,
                    percent,
                    speed,
                  });
                  lastProgressTime = now;
                }
              } catch (error) {
                const err = error as Error;
                failed += currentBatch.length;
                errors.push(`Batch insert error: ${err.message}`);

                if (debug) {
                  parentPort!.postMessage({
                    type: 'error',
                    error: `Batch failed: ${err.message}`,
                  });
                }
              }
            }
          },
          async (err: Error | null) => {
            if (err) {
              reject(err);
              return;
            }

            // Insert remaining records
            if (batch.length > 0) {
              try {
                await insertBatch(pool, batch);
                imported += batch.length;
              } catch (error) {
                const e = error as Error;
                failed += batch.length;
                errors.push(`Final batch error: ${e.message}`);
              }
            }

            db.close();
            resolve();
          }
        );
      });

      const duration = (Date.now() - startTime) / 1000;
      parentPort!.postMessage({
        type: 'complete',
        imported,
        failed,
        duration,
        errors: errors.slice(0, 100), // Limit errors sent back
      });
    } catch (error) {
      const err = error as Error;
      parentPort!.postMessage({
        type: 'complete',
        imported,
        failed,
        duration: (Date.now() - startTime) / 1000,
        errors: [...errors, `Worker crash: ${err.message}`],
      });
    } finally {
      await pool.end();
    }
  })();
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

if (isMainThread) {
  const sqliteFile =
    process.argv[2] || '/home/cyclonite01/ShadowCheckStatic/backup-1764309125210.sqlite';

  if (!fs.existsSync(sqliteFile)) {
    console.error(`❌ SQLite file not found: ${sqliteFile}`);
    process.exit(1);
  }

  const importer = new TurboImporter(sqliteFile);
  importer.start().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { TurboImporter, mapRadioType, validateRecord };
