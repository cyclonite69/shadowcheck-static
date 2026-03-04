#!/usr/bin/env tsx
/**
 * Compatibility wrapper for WiGLE SQLite imports.
 *
 * Historically this file implemented a parallel bulk importer with an older schema.
 * It now delegates to IncrementalImporter so ETL `load` stage stays compatible with
 * the current observations/access_points/networks schema.
 *
 * Usage:
 *   npx tsx etl/load/sqlite-import.ts <sqlite_file> [source_tag]
 *
 * If source_tag is omitted:
 *   1) IMPORT_SOURCE_TAG env var
 *   2) SOURCE_TAG env var
 *   3) derived from sqlite filename
 */

import * as fs from 'fs';
import * as path from 'path';
import { IncrementalImporter } from './sqlite-import-incremental';

function sanitizeSourceTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

function deriveSourceTag(sqliteFile: string): string {
  const base = path.basename(sqliteFile, path.extname(sqliteFile));
  const tag = sanitizeSourceTag(base);
  return tag || 'wigle_import';
}

function printUsage(scriptName: string): void {
  console.log(`
Usage: npx tsx ${scriptName} <sqlite_file> [source_tag]

Arguments:
  sqlite_file   Path to WiGLE SQLite backup file
  source_tag    Optional source identifier (defaults to env or filename-derived)

Environment fallback for source_tag:
  IMPORT_SOURCE_TAG
  SOURCE_TAG
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    printUsage(path.basename(process.argv[1]));
    process.exit(1);
  }

  const [sqliteFile, sourceTagArg] = args;
  if (!fs.existsSync(sqliteFile)) {
    console.error(`❌ File not found: ${sqliteFile}`);
    process.exit(1);
  }

  const selectedTag =
    sourceTagArg ||
    process.env.IMPORT_SOURCE_TAG ||
    process.env.SOURCE_TAG ||
    deriveSourceTag(sqliteFile);
  const sourceTag = sanitizeSourceTag(selectedTag);

  if (!sourceTag) {
    console.error('❌ source_tag could not be derived; provide it explicitly.');
    process.exit(1);
  }

  console.log('🔁 sqlite-import.ts compatibility mode');
  console.log(`   SQLite file: ${sqliteFile}`);
  console.log(`   Source tag: ${sourceTag}`);
  console.log('   Delegating to IncrementalImporter...\n');

  const importer = new IncrementalImporter(sqliteFile, sourceTag);
  await importer.start();
}

if (require.main === module) {
  main().catch((error) => {
    const err = error as Error;
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
