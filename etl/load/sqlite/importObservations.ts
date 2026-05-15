import type { Pool } from 'pg';
import { insertBatch } from './insertObservations';
import type {
  BatchResult,
  SqliteLocationRow,
  SqliteNetworkRow,
  ValidatedObservation,
} from './types';
import { validateAndEnrich } from './validateAndEnrich';

export interface ObservationImportProgress {
  imported: number;
  processedRows: number;
  startTime: number;
  totalRows: number;
}

export interface ObservationImportResult {
  errors: string[];
  failed: number;
  imported: number;
}

export interface ImportObservationRowsOptions {
  batchSize: number;
  debug: boolean;
  initialImported?: number;
  onProgress?: (progress: ObservationImportProgress) => void;
  pool: Pool;
  rows: SqliteLocationRow[];
  sourceTag: string;
  validateAndEnrichFn?: typeof validateAndEnrich;
  insertBatchFn?: (
    pool: Pool,
    records: ValidatedObservation[],
    debug: boolean
  ) => Promise<BatchResult>;
  networkCache: Map<string, SqliteNetworkRow>;
}

export async function importObservationRows(
  options: ImportObservationRowsOptions
): Promise<ObservationImportResult> {
  const validateAndEnrichFn = options.validateAndEnrichFn || validateAndEnrich;
  const insertBatchFn = options.insertBatchFn || insertBatch;
  const startTime = Date.now();
  const errors: string[] = [];

  let imported = 0;
  let failed = 0;
  let validBatch: ValidatedObservation[] = [];

  for (let i = 0; i < options.rows.length; i++) {
    const row = options.rows[i];
    const validated = validateAndEnrichFn(row, options.networkCache, options.sourceTag, errors);

    if (!validated) {
      failed++;
      continue;
    }

    validBatch.push(validated);

    if (validBatch.length >= options.batchSize) {
      const batchResult = await flushBatch({
        batch: validBatch,
        debug: options.debug,
        errorLabel: 'Batch insert error',
        insertBatchFn,
        pool: options.pool,
      });

      imported += batchResult.inserted;
      failed += batchResult.failed;
      errors.push(...batchResult.errors);
      validBatch = [];

      options.onProgress?.({
        imported: (options.initialImported || 0) + imported,
        processedRows: i + 1,
        startTime,
        totalRows: options.rows.length,
      });
    }
  }

  if (validBatch.length > 0) {
    const batchResult = await flushBatch({
      batch: validBatch,
      debug: options.debug,
      errorLabel: 'Final batch error',
      insertBatchFn,
      pool: options.pool,
    });

    imported += batchResult.inserted;
    failed += batchResult.failed;
    errors.push(...batchResult.errors);
  }

  return { imported, failed, errors };
}

interface FlushBatchOptions {
  batch: ValidatedObservation[];
  debug: boolean;
  errorLabel: string;
  insertBatchFn: (
    pool: Pool,
    records: ValidatedObservation[],
    debug: boolean
  ) => Promise<BatchResult>;
  pool: Pool;
}

async function flushBatch(options: FlushBatchOptions): Promise<BatchResult> {
  try {
    return await options.insertBatchFn(options.pool, options.batch, options.debug);
  } catch (error) {
    const err = error as Error;
    if (options.debug && options.errorLabel === 'Batch insert error') {
      console.error(`\n   Batch error: ${err.message}`);
    }

    return {
      inserted: 0,
      failed: 0,
      errors: [`${options.errorLabel}: ${err.message}`],
    };
  }
}
