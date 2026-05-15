import * as fs from 'fs';
import * as path from 'path';
import { resolveSourceTag } from './sourceTag';

export interface IncrementalImportCliRequest {
  sqliteFile: string;
  sourceTag: string;
}

export interface IncrementalImportCliOptions {
  env?: NodeJS.ProcessEnv;
  existsSync?: (path: fs.PathLike) => boolean;
  scriptName?: string;
}

export type IncrementalImportCliParseResult =
  | {
      ok: true;
      request: IncrementalImportCliRequest;
    }
  | {
      ok: false;
      exitCode: number;
      message: string;
      stream: 'stdout' | 'stderr';
    };

export function buildIncrementalImportUsage(scriptName: string): string {
  return `
Usage: npx tsx ${scriptName} <sqlite_file> [source_tag]

Arguments:
  sqlite_file   Path to WiGLE SQLite backup file
  source_tag    Optional unique identifier for this data source (defaults to filename)

Examples:
  npx tsx ${scriptName} ~/Downloads/backup.sqlite s22_backup
  npx tsx ${scriptName} /path/to/wigle.sqlite

Environment:
  DB_HOST       PostgreSQL host (default: 127.0.0.1)
  DB_PORT       PostgreSQL port (default: 5432)
  DB_NAME       Database name (default: shadowcheck_db)
  DB_ADMIN_USER Admin user (default: shadowcheck_admin)
  DB_ADMIN_PASSWORD  Admin password
  DEBUG         Set to 'true' for verbose output
`;
}

export function parseIncrementalImportCliArgs(
  args: string[],
  options: IncrementalImportCliOptions = {}
): IncrementalImportCliParseResult {
  const scriptName = options.scriptName || path.basename(process.argv[1] || 'sqlite-import.ts');
  const existsSync = options.existsSync || fs.existsSync;
  const env = options.env || process.env;

  if (args.length < 1) {
    return {
      ok: false,
      exitCode: 1,
      message: buildIncrementalImportUsage(scriptName),
      stream: 'stdout',
    };
  }

  const [sqliteFile, sourceTagArg] = args;

  if (!existsSync(sqliteFile)) {
    return {
      ok: false,
      exitCode: 1,
      message: `❌ File not found: ${sqliteFile}`,
      stream: 'stderr',
    };
  }

  const sourceTag = resolveSourceTag(sqliteFile, sourceTagArg, env);

  if (!sourceTag) {
    return {
      ok: false,
      exitCode: 1,
      message: '❌ source_tag could not be derived; provide it explicitly.',
      stream: 'stderr',
    };
  }

  return {
    ok: true,
    request: {
      sqliteFile,
      sourceTag,
    },
  };
}
