import * as path from 'path';

export function sanitizeSourceTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

export function deriveSourceTag(sqliteFile: string): string {
  const base = path.basename(sqliteFile, path.extname(sqliteFile));
  const tag = sanitizeSourceTag(base);
  return tag || 'wigle_import';
}

export function resolveSourceTag(
  sqliteFile: string,
  sourceTagArg?: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  const selectedTag =
    sourceTagArg || env.IMPORT_SOURCE_TAG || env.SOURCE_TAG || deriveSourceTag(sqliteFile);

  return sanitizeSourceTag(selectedTag);
}
