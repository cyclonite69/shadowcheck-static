#!/usr/bin/env tsx

import { IncrementalImporter } from './sqlite-import';

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error(
      'Usage: npx tsx etl/load/sqlite-import-incremental.ts <sqlite_file> [source_tag]'
    );
    process.exit(1);
  }

  const [sqliteFile, sourceTag] = args;
  const importer = new IncrementalImporter(sqliteFile, sourceTag || 'wigle_import');
  importer.start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { IncrementalImporter };
