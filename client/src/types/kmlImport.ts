export interface KmlSkippedFile {
  filename: string;
  hash: string;
  existingSourceFile: string;
  existingImportedAt: string;
}

export interface KmlImportStatusRow {
  id: number;
  source_file: string;
  source_name: string | null;
  source_type: string | null;
  file_hash: string | null;
  hash_prefix: string | null;
  placemark_count: number;
  point_count: number;
  imported_at: string;
}

export interface KmlImportStatusResponse {
  files: KmlImportStatusRow[];
  totals: {
    file_count: number;
    point_count: number;
    wigle_file_count: number;
    latest_imported_at: string | null;
  };
}

export interface KmlImportResult {
  ok: boolean;
  filesImported?: number;
  pointsImported?: number;
  skipped?: number;
  skippedFiles?: KmlSkippedFile[];
  forced?: boolean;
  batchId?: string;
  sourceType?: string;
  uploadedToS3?: boolean;
  message?: string;
  error?: string;
  output?: string;
  errorOutput?: string;
  durationSec?: string | number;
  importType?: string;
  metricsBefore?: Record<string, number | null | undefined> | null;
  metricsAfter?: Record<string, number | null | undefined> | null;
}
