import type { ImportSummary } from './types';

const DIVIDER = '━'.repeat(60);

export interface ImportReportState {
  imported: number;
  failed: number;
  errors: string[];
  startTime: number;
}

export function buildImportSummary(state: ImportReportState): ImportSummary {
  const duration = (Date.now() - state.startTime) / 1000;
  const speed = state.imported > 0 ? Math.round(state.imported / duration) : 0;

  return {
    imported: state.imported,
    failed: state.failed,
    durationS: duration,
    speed,
    errors: state.errors,
  };
}

export function logImportBanner(
  sqliteFile: string,
  sourceTag: string,
  batchSize: number,
  debug: boolean
): void {
  console.log('\n📦 INCREMENTAL IMPORT - WiGLE SQLite');
  console.log(DIVIDER);
  console.log(`📁 Source: ${sqliteFile}`);
  console.log(`🏷️  Source tag: ${sourceTag}`);
  console.log(`📦 Batch size: ${batchSize}`);
  console.log(`🐛 Debug: ${debug ? 'ON' : 'OFF'}\n`);
}

export function logNoNewRecords(): void {
  console.log('\n✅ Database is up to date - no new records to import.');
}

export function writeImportProgress(
  imported: number,
  totalRows: number,
  startTime: number,
  processedRows: number
): void {
  const elapsed = (Date.now() - startTime) / 1000;
  const speed = elapsed > 0 ? Math.round(imported / elapsed) : 0;
  const percent = Math.round((processedRows / totalRows) * 100);

  process.stdout.write(
    `\r   Progress: ${imported.toLocaleString()}/${totalRows.toLocaleString()} (${percent}%) | ${speed.toLocaleString()} rec/s`
  );
}

export function logProgressComplete(): void {
  console.log('');
}

export function printImportSummary(summary: ImportSummary): void {
  console.log(`\n${DIVIDER}`);
  console.log('✅ INCREMENTAL IMPORT COMPLETE!\n');
  console.log(`⏱️  Duration: ${summary.durationS.toFixed(1)}s`);
  console.log(`📈 Speed: ${summary.speed.toLocaleString()} records/second`);
  console.log(`✔️  Imported: ${summary.imported.toLocaleString()}`);
  console.log(`❌ Failed: ${summary.failed.toLocaleString()}`);

  if (summary.errors.length > 0) {
    console.log('\n⚠️  Sample errors (first 5):');
    summary.errors.slice(0, 5).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
  }

  console.log(`${DIVIDER}\n`);
}
