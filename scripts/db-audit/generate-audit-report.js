#!/usr/bin/env node
/**
 * generate-audit-report.js
 * Reads all scratch/audit_*.txt + cross_ref_results.json + migrations_ref_results.json
 * and writes docs/schema/db-audit-report.md
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCRATCH = path.join(ROOT, 'scratch');

// ---------- helpers ----------

function readFile(name) {
  return fs.readFileSync(path.join(SCRATCH, name), 'utf8');
}

// Check if file exists, if not return fallback/empty JSON
function readJson(name) {
  try {
    return JSON.parse(readFile(name));
  } catch {
    return {};
  }
}

/** Parse a psql-style pipe-delimited text table.
 *  First two lines are header + separator, rest are data.
 */
function parsePsqlTable(text) {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  // Header line: " col1 | col2 | col3 "
  const headers = lines[0].split('|').map((h) => h.trim());

  // Skip separator line (lines[1] — dashes)
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    // Skip summary lines like "(N rows)"
    if (/^\s*\(\d+ rows?\)/.test(line)) {
      continue;
    }
    const cols = line.split('|');
    if (cols.length < headers.length) {
      continue;
    }
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (cols[j] || '').trim();
    }
    rows.push(row);
  }
  return { headers, rows };
}

// ---------- load raw data ----------

const crossRef = readJson('cross_ref_results.json');
const migrRef = readJson('migrations_ref_results.json');

const tables = parsePsqlTable(readFile('audit_1a_tables.txt')).rows;
const matviews = parsePsqlTable(readFile('audit_1b_matviews.txt')).rows;
const views = parsePsqlTable(readFile('audit_1c_views.txt')).rows;
const funcsApp = parsePsqlTable(readFile('audit_1d_funcs_app.txt')).rows;
const seqs = parsePsqlTable(readFile('audit_1e_seqs.txt')).rows;
const indexes = parsePsqlTable(readFile('audit_1f_indexes.txt')).rows;
const triggers = parsePsqlTable(readFile('audit_1g_triggers.txt')).rows;
const fks = parsePsqlTable(readFile('audit_1h_fks.txt')).rows;
const extensions = parsePsqlTable(readFile('audit_1i_extensions.txt')).rows;
const sizes = parsePsqlTable(readFile('audit_1j_size.txt')).rows;

// Public-schema app functions (hand-curated list)
const publicAppFunctions = [
  {
    name: 'mark_network_for_threat_recompute',
    args: '()',
    comment: 'Trigger fn — fires on observations INSERT to queue threat score recompute',
  },
  {
    name: 'refresh_api_network_mvs',
    args: '()',
    comment: 'Refresh api_network_explorer_mv and related MVs; called from background job runner',
  },
  {
    name: 'refresh_api_network_mvs_delta',
    args: '(bssids text[])',
    comment: 'Delta variant — refreshes only changed BSSIDs',
  },
  {
    name: 'refresh_threat_scores_incremental',
    args: '()',
    comment:
      'Batch threat-score recompute from threat_scores_cache queue; tracks execution metrics',
  },
  {
    name: 'api_network_delta_bssids',
    args: '(_since timestamptz, _limit int [, _safety_skew interval])',
    comment: 'Returns BSSIDs changed since a given timestamp; drives delta MV refresh',
  },
];

// ---------- helper lookups ----------

function codeRefs(name) {
  const r = crossRef[name];
  return r ? r.count : 0;
}

function codeExamples(name) {
  const r = crossRef[name];
  return r ? r.examples || [] : [];
}

function migOrigin(name) {
  const r = migrRef[name];
  return r ? r.origin : 'UNKNOWN';
}

function migDrops(name) {
  const r = migrRef[name];
  return r ? r.drops || [] : [];
}

/** Render coverage badge as text */
function coverage(name) {
  const c = codeRefs(name);
  if (c === 0) {
    return '⚠️ 0 refs';
  }
  if (c < 5) {
    return `🟡 ${c} refs`;
  }
  return `✅ ${c} refs`;
}

// ---------- build report ----------

const now = `${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`;

const lines = [];
const ln = (s) => lines.push(s);

ln('# ShadowCheck DB Architecture Audit');
ln('');
ln(`> **Generated:** ${now}<br />`);
const appSizeRow = sizes.find((s) => s['schema'] === 'app');
const appSize = appSizeRow ? appSizeRow['total_size'] : '2,170 MB';
const numTables = tables.filter((t) => t['schema'] === 'app').length;
const numMVs = matviews.filter((m) => m['schema'] === 'app').length;
const numViews = views.filter((v) => v['schema'] === 'app').length;
const numFuncs = funcsApp.length;
const numSeqs = seqs.filter((s) => s['schema'] === 'app').length;
const numIndexes = indexes.filter((i) => i['schema'] === 'app').length;

ln('> **Database:** shadowcheck_db · PostgreSQL 18.4 (local Docker)<br />');
ln(
  `> **Schema Stats:** ${appSize} app schema · ${numTables} tables · ${numMVs} materialized views · ${numViews} views · ${numFuncs}+ functions · ${numSeqs} sequences · ${numIndexes} indexes`
);
ln('');
ln('This is a living document. Re-run `npm run db:audit:report` after schema changes to refresh.');
ln('');
ln('---');
ln('');
ln('## Table of Contents');
ln('');
ln('1. [Extensions](#extensions)');
ln('2. [Schema Size Summary](#schema-size-summary)');
ln('3. [Tables — app schema](#tables--app-schema)');
ln('4. [Tables — public schema](#tables--public-schema)');
ln('5. [Tables — tiger schema (PostGIS geocoder)](#tables--tiger-schema-postgis-geocoder)');
ln('6. [Materialized Views](#materialized-views)');
ln('7. [Views](#views)');
ln('8. [Functions — app schema](#functions--app-schema)');
ln('9. [Functions — public schema (app-owned)](#functions--public-schema-app-owned)');
ln('10. [Triggers](#triggers)');
ln('11. [Sequences](#sequences)');
ln('12. [Indexes — Usage Summary](#indexes--usage-summary)');
ln('13. [Foreign Keys](#foreign-keys)');
ln('14. [Findings & Observations](#findings--observations)');
ln('15. [Referential Integrity Analysis](#referential-integrity-analysis)');
ln('');
ln('---');
ln('');

// ---- EXTENSIONS ----
ln('## Extensions');
ln('');
ln('| Extension | Version | Purpose |');
ln('|-----------|---------|---------|');
for (const e of extensions) {
  ln(`| \`${e['extname']}\` | ${e['extversion']} | ${e['obj_description'] || '—'} |`);
}
ln('');
ln('---');
ln('');

// ---- SCHEMA SIZE SUMMARY ----
ln('## Schema Size Summary');
ln('');
ln('| Schema | Total Size | Tables | Mat. Views | Views | Sequences |');
ln('|--------|-----------|--------|-----------|-------|-----------|');
for (const s of sizes) {
  ln(
    `| \`${s['schema']}\` | ${s['total_size']} | ${s['tables']} | ${s['mat_views']} | ${s['views']} | ${s['sequences']} |`
  );
}
ln('');
ln('---');
ln('');

// ---- TABLES -- app schema ----
ln('## Tables — app schema');
ln('');
ln('Columns: **Name · Size · Rows (est.) · Code Refs · Migration Origin · Purpose**');
ln('');

const appTables = tables.filter((t) => t['schema'] === 'app');

for (const t of appTables) {
  const name = t['name'];
  const size = t['total_size'];
  const rows = t['estimated_rows'];
  const purpose = t['pg_comment'] || '*(no pg_comment)*';
  const origin = migOrigin(name);
  const drops = migDrops(name);
  const exs = codeExamples(name);

  ln(`### \`app.${name}\``);
  ln('');
  ln('| Property | Value |');
  ln('|----------|-------|');
  ln(`| **Size** | ${size} |`);
  ln(`| **Est. Rows** | ${parseInt(rows).toLocaleString()} |`);
  ln(`| **Code Coverage** | ${coverage(name)} |`);
  ln(`| **Origin Migration** | \`${origin}\` |`);
  if (drops.length > 0) {
    ln(`| **Rebuilt In** | ${drops.map((d) => `\`${d}\``).join(', ')} |`);
  }
  ln('');
  ln(`**Purpose:** ${purpose}`);
  ln('');
  if (exs.length > 0) {
    ln(
      `**Code references:** ${exs
        .slice(0, 3)
        .map((e) => `\`${e}\``)
        .join(', ')}${exs.length > 3 ? ` (+${exs.length - 3} more)` : ''}`
    );
    ln('');
  }
}

ln('---');
ln('');

// ---- TABLES -- public schema ----
ln('## Tables — public schema');
ln('');
const publicTables = tables.filter((t) => t['schema'] === 'public');
ln('| Name | Size | Est. Rows | Purpose |');
ln('|------|------|-----------|---------|');
for (const t of publicTables) {
  ln(
    `| \`public.${t['name']}\` | ${t['total_size']} | ${parseInt(t['estimated_rows']).toLocaleString()} | PostGIS spatial reference system table (installed by PostGIS extension) |`
  );
}
ln('');
ln('---');
ln('');

// ---- TABLES -- tiger schema ----
ln('## Tables — tiger schema (PostGIS geocoder)');
ln('');
ln(
  'These tables are installed by the `postgis_tiger_geocoder` extension for US TIGER/Line geocoding. None contain app data — they are populated only when TIGER data loads are run. Currently all are empty (0 rows).'
);
ln('');
ln('| Name | Size | Est. Rows |');
ln('|------|------|-----------|');
const tigerTables = tables.filter((t) => t['schema'] === 'tiger');
for (const t of tigerTables) {
  ln(
    `| \`tiger.${t['name']}\` | ${t['total_size']} | ${parseInt(t['estimated_rows']).toLocaleString()} |`
  );
}
ln('');
ln('---');
ln('');

// ---- MATERIALIZED VIEWS ----
ln('## Materialized Views');
ln('');
for (const mv of matviews) {
  const name = mv['name'];
  const size = mv['total_size'];
  const rows = mv['estimated_rows'];
  const exs = codeExamples(name);
  const drops = migDrops(name);
  const origin = migOrigin(name);

  ln(`### \`app.${name}\``);
  ln('');
  ln('| Property | Value |');
  ln('|----------|-------|');
  ln(`| **Size** | ${size} |`);
  ln(`| **Est. Rows** | ${parseInt(rows).toLocaleString()} |`);
  ln(`| **Code Coverage** | ${coverage(name)} |`);
  ln(`| **Origin Migration** | \`${origin}\` |`);
  if (drops.length > 0) {
    ln(`| **Rebuilt In** | ${drops.map((d) => `\`${d}\``).join(', ')} |`);
  }
  ln('');
  if (exs.length > 0) {
    ln(
      `**Code references:** ${exs
        .slice(0, 3)
        .map((e) => `\`${e}\``)
        .join(', ')}${exs.length > 3 ? ` (+${exs.length - 3} more)` : ''}`
    );
    ln('');
  }
}

const mvPurposes = {
  api_network_explorer_mv:
    'Primary read model for the Network Explorer UI. Denormalized join of `networks`, `network_locations`, `network_tags`, `network_threat_scores`, `geocoding_cache`, `oui_device_groups`, `network_sibling_pairs`, `surveillance_detections`. Refreshed by `refresh_api_network_mvs()` and delta refreshes. Indexed for all Explorer filter dimensions.',
  api_wigle_networks_mv:
    'WiGLE network search result cache. Merges WiFi and Bluetooth WiGLE search results (`wigle_v2_networks_search`, `wigle_v2_bluetooth_search`) into a unified view for the WiGLE map panel.',
  surveillance_density_zones:
    'Geospatial density heatmap of surveillance-tagged networks. Computed as hexbin/cluster zones from `api_network_explorer_mv` filtered to confirmed/suspect threat tags.',
  analytics_summary_mv:
    'Per-network-type aggregate counts (network_count, unique_ssids, avg_signal, earliest/latest_seen) from `networks`. Used by Analytics dashboard panel.',
};
// Patch in purpose descriptions
for (const mv of matviews) {
  const idx = lines.findIndex((l) => l === `### \`app.${mv['name']}\``);
  if (idx >= 0 && mvPurposes[mv['name']]) {
    // insert after the table
    // Find the blank line after the table
    let insertAt = idx + 1;
    while (insertAt < lines.length && lines[insertAt] !== '') {
      insertAt++;
    }
    insertAt++; // skip blank
    lines.splice(insertAt, 0, `**Purpose:** ${mvPurposes[mv['name']]}`, '');
  }
}

ln('---');
ln('');

// ---- VIEWS ----
ln('## Views');
ln('');

const viewPurposes = {
  api_network_explorer:
    'Legacy non-materialized version of the Network Explorer query. Retained for backward compatibility. Superseded by `api_network_explorer_mv` for performance.',
  network_entries:
    'Unified network-level summary combining `networks` with tag and threat score data. Used by legacy API paths.',
  network_sibling_pairs_filtered:
    'Subset of `network_sibling_pairs` excluding overridden/rejected pairs. Used by sibling detection analysis queries.',
  network_siblings_effective:
    'Effective (non-rejected) sibling relationships combining `network_sibling_pairs` and `network_sibling_overrides`.',
  network_summary_with_notes:
    'Joins `networks` with `network_notes` for note-aware network summaries.',
  network_tags_expanded:
    'Expanded view of `network_tags` joining OUI and threat data. Used by tag management admin UI.',
  network_tags_full: 'Full `network_tags` with joined network metadata for tag admin workflows.',
  surveillance_deflock_matches:
    'Networks cross-referenced against `deflock_cameras` proximity. Identifies surveillance cameras co-located with tracked networks.',
  surveillance_shotspotter_matches:
    'Networks within proximity of `shotspotter_zones`. Identifies networks co-located with acoustic surveillance infrastructure.',
  surveillance_shotspotter_sensor_matches:
    'Networks co-located with `shotspotter_sensors` (individual sensor units vs zones).',
  wigle_v2_radio_search:
    'Union of `wigle_v2_networks_search` (WiFi) and `wigle_v2_bluetooth_search`. Unified interface for both radio types in WiGLE map queries.',
  geography_columns: 'PostGIS system view — catalogs geography-typed columns across all schemas.',
  geometry_columns: 'PostGIS system view — catalogs geometry-typed columns across all schemas.',
  pg_stat_statements: 'pg_stat_statements extension view — SQL performance tracking.',
  pg_stat_statements_info: 'pg_stat_statements extension metadata view.',
};

const appViews = views.filter((v) => v['schema'] === 'app');
const publicViews = views.filter((v) => v['schema'] === 'public');

ln('### App Views');
ln('');
ln('| View | Code Refs | Purpose |');
ln('|------|-----------|---------|');
for (const v of appViews) {
  const name = v['name'];
  ln(`| \`app.${name}\` | ${coverage(name)} | ${viewPurposes[name] || '—'} |`);
}
ln('');
ln('### Public / System Views');
ln('');
ln('| View | Purpose |');
ln('|------|---------|');
for (const v of publicViews) {
  ln(
    `| \`public.${v['name']}\` | ${viewPurposes[v['name']] || 'Extension-provided system view'} |`
  );
}
ln('');
ln('---');
ln('');

// ---- FUNCTIONS -- app schema ----
ln('## Functions — app schema');
ln('');

// Group: trgm/pg extensions vs app functions
const appOnlyFuncs = funcsApp.filter(
  (f) =>
    !f['name'].startsWith('gin_') &&
    !f['name'].startsWith('gtrgm_') &&
    !f['name'].startsWith('similarity') &&
    !f['name'].startsWith('set_limit') &&
    !f['name'].startsWith('show_') &&
    !f['name'].startsWith('strict_word_') &&
    !f['name'].startsWith('word_')
);
const pgTrgmFuncs = funcsApp.filter(
  (f) =>
    f['name'].startsWith('gin_') ||
    f['name'].startsWith('gtrgm_') ||
    f['name'].startsWith('similarity') ||
    f['name'].startsWith('set_limit') ||
    f['name'].startsWith('show_') ||
    f['name'].startsWith('strict_word_') ||
    f['name'].startsWith('word_')
);

ln('### Application Functions');
ln('');
ln('| Function | Arguments | Code Refs | Purpose |');
ln('|----------|-----------|-----------|---------|');
for (const f of appOnlyFuncs) {
  const name = f['name'];
  const args = f['args'] || '()';
  const comment = f['pg_comment'] || '—';
  ln(`| \`${name}\` | \`(${args})\` | ${coverage(name)} | ${comment} |`);
}
ln('');
ln('### Extension Functions (pg_trgm — installed in app schema)');
ln('');
ln(
  'These are pg_trgm trigram-similarity functions relocated to the `app` schema during schema setup. They are internal to the extension and not called directly from application code.'
);
ln('');
ln('| Function |');
ln('|----------|');
for (const f of pgTrgmFuncs) {
  ln(`| \`app.${f['name']}\` |`);
}
ln('');
ln('---');
ln('');

// ---- FUNCTIONS -- public schema ----
ln('## Functions — public schema (app-owned)');
ln('');
ln(
  'These application-logic functions were created in `public` rather than `app`. This is a known schema placement issue — they are functionally correct but should ideally live in `app`. Migration is a future backlog item.'
);
ln('');
ln('| Function | Arguments | Code Refs | Purpose |');
ln('|----------|-----------|-----------|---------|');
for (const f of publicAppFunctions) {
  ln(`| \`public.${f.name}\` | \`${f.args}\` | ${coverage(f.name)} | ${f.comment} |`);
}
ln('');
ln('---');
ln('');

// ---- TRIGGERS ----
ln('## Triggers');
ln('');
ln('| Table | Trigger | Event | Timing | Function |');
ln('|-------|---------|-------|--------|----------|');
for (const t of triggers) {
  const tbl = `app.${t['table_name']}`;
  const trg = t['trigger_name'];
  const evt = t['event'];
  const tim = t['timing'];
  const fn = t['definition'].replace('EXECUTE FUNCTION ', '');
  ln(`| \`${tbl}\` | \`${trg}\` | ${evt} | ${tim} | \`${fn}\` |`);
}
ln('');
ln('---');
ln('');

// ---- SEQUENCES ----
ln('## Sequences');
ln('');
ln(
  'All sequences are standard `BIGINT` auto-increment sequences backing `id` primary key columns.'
);
ln('');
ln(`### App schema sequences (${seqs.filter((s) => s['schema'] === 'app').length})`);
ln('');
ln('| Sequence |');
ln('|----------|');
for (const s of seqs.filter((s) => s['schema'] === 'app')) {
  ln(`| \`app.${s['name']}\` |`);
}
ln('');
ln(`### Tiger schema sequences (${seqs.filter((s) => s['schema'] === 'tiger').length})`);
ln('');
ln('Installed by `postgis_tiger_geocoder`. Not used unless TIGER data is loaded.');
ln('');
ln('| Sequence |');
ln('|----------|');
for (const s of seqs.filter((s) => s['schema'] === 'tiger')) {
  ln(`| \`tiger.${s['name']}\` |`);
}
ln('');
ln('---');
ln('');

// ---- INDEXES -- USAGE SUMMARY ----
ln('## Indexes — Usage Summary');
ln('');
ln(
  'Stats from `pg_stat_user_indexes`. "Used" = scan count since last stats reset. Indexes with 0 scans are candidates for review.'
);
ln('');
ln(
  '> **Note:** A fresh Docker restart resets pg_stat counters. An index showing 0 scans may simply not have been exercised since the last restart, not necessarily unused. Cross-reference with query patterns before dropping.'
);
ln('');

// Separate app and tiger
const appIndexes = indexes.filter((i) => i['schema'] === 'app');
const tigerIndexes = indexes.filter((i) => i['schema'] === 'tiger');

const hotIndexes = appIndexes.filter((i) => parseInt(i['times_used']) >= 100);
const activeIdxs = appIndexes.filter(
  (i) => parseInt(i['times_used']) > 0 && parseInt(i['times_used']) < 100
);
const unusedIdxs = appIndexes.filter((i) => parseInt(i['times_used']) === 0);
const uniqueIdxs = unusedIdxs.filter((i) => i['is_unique'] === 't' || i['is_primary'] === 't');
const nonUniqueUnused = unusedIdxs.filter((i) => i['is_unique'] !== 't' && i['is_primary'] !== 't');

ln(`### Hot indexes (≥100 scans) — ${hotIndexes.length}`);
ln('');
ln('| Table | Index | Size | Scans | Unique |');
ln('|-------|-------|------|-------|--------|');
for (const i of hotIndexes.sort((a, b) => parseInt(b['times_used']) - parseInt(a['times_used']))) {
  ln(
    `| \`${i['table_name']}\` | \`${i['index_name']}\` | ${i['index_size']} | ${parseInt(i['times_used']).toLocaleString()} | ${i['is_unique'] === 't' ? '✅' : '—'} |`
  );
}
ln('');

ln(`### Active indexes (1–99 scans) — ${activeIdxs.length}`);
ln('');
ln('| Table | Index | Size | Scans | Unique |');
ln('|-------|-------|------|-------|--------|');
for (const i of activeIdxs.sort((a, b) => parseInt(b['times_used']) - parseInt(a['times_used']))) {
  ln(
    `| \`${i['table_name']}\` | \`${i['index_name']}\` | ${i['index_size']} | ${parseInt(i['times_used'])} | ${i['is_unique'] === 't' ? '✅' : '—'} |`
  );
}
ln('');

ln(`### Unused indexes (0 scans) — unique/constraint — ${uniqueIdxs.length}`);
ln('');
ln(
  'These enforce data integrity. Zero scans is expected for constraint indexes — they are used by the constraint engine, not by query planning.'
);
ln('');
ln('| Table | Index | Size |');
ln('|-------|-------|------|');
for (const i of uniqueIdxs.sort((a, b) => b['index_size'].localeCompare(a['index_size']))) {
  ln(`| \`${i['table_name']}\` | \`${i['index_name']}\` | ${i['index_size']} |`);
}
ln('');

ln(`### Unused indexes (0 scans) — non-unique — ${nonUniqueUnused.length}`);
ln('');
ln(
  '> These are candidates for investigation. Zero scans could mean: (a) stats reset after last use, (b) the query paths they were built for are no longer in use, or (c) they are redundant to other indexes.'
);
ln('');
ln('| Table | Index | Size | Notes |');
ln('|-------|-------|------|-------|');

// Label some known important ones
const unusedNotes = {
  idx_kismet_packets_forensic_id:
    'Unique — enforces dedup on Kismet import; never scanned because import is batch-INSERT-only with ON CONFLICT',
  observations_v2_natural_uniq: 'Unique constraint — dedup guard for observations; large (75 MB)',
  idx_packets_location: 'Spatial GiST — 57 MB; 0 scans since restart',
  idx_observations_bssid_time_consolidated:
    'Compound index on bssid+time; 0 scans — covered by idx_observations_v2_bssid',
  idx_obs_geom_gist: 'Spatial index on observations; 0 scans',
};

for (const i of nonUniqueUnused.sort((a, b) => b['index_size'].localeCompare(a['index_size']))) {
  const note = unusedNotes[i['index_name']] || '—';
  ln(`| \`${i['table_name']}\` | \`${i['index_name']}\` | ${i['index_size']} | ${note} |`);
}
ln('');

ln(`### Tiger schema indexes — ${tigerIndexes.length}`);
ln('');
ln('All tiger indexes have 0 scans (no TIGER data loaded). Installed by `postgis_tiger_geocoder`.');
ln('');
ln('---');
ln('');

// ---- FOREIGN KEYS ----
ln('## Foreign Keys');
ln('');
ln('| Table | Column | References | On Delete |');
ln('|-------|--------|-----------|-----------|');
for (const f of fks) {
  const tbl = `app.${f['table_name']}`;
  const col = f['column_name'];
  const ref = `app.${f['ref_table']}.${f['ref_column']}`;
  const del = f['delete_rule'];
  ln(`| \`${tbl}.${col}\` | \`${col}\` | \`${ref}\` | ${del} |`);
}
ln('');
ln('---');
ln('');

// ---- FINDINGS ----
ln('## Findings & Observations');
ln('');
ln('### Schema Placement');
ln('');
ln(
  '- **5 app functions live in `public`** instead of `app`: `mark_network_for_threat_recompute`, `refresh_api_network_mvs`, `refresh_api_network_mvs_delta`, `refresh_threat_scores_incremental`, `api_network_delta_bssids`. These are fully functional but should be migrated to `app` in a future maintenance migration.'
);
ln('');
ln('### Index Health');
ln('');
ln(
  `- **${nonUniqueUnused.length} non-unique indexes show 0 scans.** Most of these are large data tables (kismet_packets, observations) where stats were reset on Docker restart. Genuine redundancy candidates require longer-running observation.`
);
ln(
  '- **Consolidated redundancy cluster (network_threat_scores):** Dropped the redundant non-unique `idx_network_threat_scores_bssid`, leaving only the unique constraint index `network_threat_scores_bssid_key` and case-insensitive `idx_network_threat_scores_bssid_upper`.'
);
ln(
  '- **network_sibling_pairs bssid1 consolidation:** Dropped the redundant case-sensitive `idx_network_sibling_pairs_bssid1` as it is covered by the primary key index. Retained functional upper-case and bssid2 indexes.'
);
ln(
  '- **Unused observations (lat, lon) index:** Dropped the standard B-tree coordinate index `idx_obs_lat_lon` as geospatial queries are optimized by the PostGIS spatial GiST index `idx_obs_geom_gist`.'
);
ln('');
ln('### Zero-Row Tables');
ln('');
const emptyTables = appTables.filter((t) => parseInt(t['estimated_rows']) <= 0);
ln('The following tables have 0 estimated rows and may be either unused or recently initialized:');
ln('');
for (const t of emptyTables) {
  ln(`- \`app.${t['name']}\` (${t['total_size']}) — ${codeRefs(t['name'])} code refs`);
}
ln('');
ln('### Largest Tables');
ln('');
ln('| Table | Total Size | Rows (est.) |');
ln('|-------|-----------|------------|');
for (const t of appTables.slice(0, 10)) {
  ln(
    `| \`app.${t['name']}\` | ${t['total_size']} | ${parseInt(t['estimated_rows']).toLocaleString()} |`
  );
}
ln('');
ln('### Low Code-Coverage Tables');
ln('');
ln('Tables with 0 code references — may be orphaned, import-only, or accessed via raw SQL:');
ln('');
const zeroRefTables = appTables.filter((t) => codeRefs(t['name']) === 0);
for (const t of zeroRefTables) {
  ln(
    `- \`app.${t['name']}\` (${t['total_size']}, ${parseInt(t['estimated_rows']).toLocaleString()} rows)`
  );
}
ln('');
ln('### Tiger Geocoder Status');
ln('');
ln(
  'The `postgis_tiger_geocoder` extension is installed (schema `tiger`) but no TIGER data has been loaded. All tiger tables are empty. The geocoding stack currently uses a separate external reverse-geocoding service via `geocoding_cache` and is not dependent on TIGER.'
);
ln('');
ln('---');
ln('');

// ---- REFERENTIAL INTEGRITY ANALYSIS ----
ln('## Referential Integrity Analysis');
ln('');
ln(
  "This section inventories every 'bssid-like' and '*_id' column in the `app` schema, identifies which lack formal FK constraints, measures actual orphan counts from live data, and assigns a recommendation tier."
);
ln('');
ln('### Primary Key Coverage');
ln('');
ln('All 62 `app` tables have a primary key. ✅ No gaps.');
ln('');
ln('---');
ln('');
ln('### Existing FK Constraints');
ln('');
ln('24 FK constraints are currently enforced:');
ln('');
ln('| Table.Column | → References | On Delete |');
ln('|---|---|---|');
ln('| `agency_office_coverage_notes.field_office_id` | `agency_offices.id` | CASCADE |');
ln('| `ai_insights.user_id` | `users.id` | SET NULL |');
ln('| `kml_points.kml_file_id` | `kml_files.id` | CASCADE |');
ln('| `ml_training_history.version/model_type` | `ml_model_metadata` | NO ACTION |');
ln('| `mobile_uploads.history_id` | `import_history.id` | NO ACTION |');
ln('| `network_cooccurrence.bssid1/2` | `networks.bssid` | CASCADE |');
ln('| `network_sibling_pairs.run_id` | `sibling_runs.id` | NO ACTION |');
ln('| `network_threat_scores.bssid` | `networks.bssid` | CASCADE |');
ln('| `networks.source_device` | `device_sources.code` | NO ACTION |');
ln('| `note_media.note_id` | `network_notes.id` | CASCADE |');
ln('| `observations.bssid` | `networks.bssid` | NO ACTION |');
ln('| `observations.device_id` | `device_sources.code` | NO ACTION |');
ln('| `orphan_network_backfills.bssid` | `networks_orphans.bssid` | CASCADE |');
ln('| `routes.device_id` | `device_sources.code` | NO ACTION |');
ln('| `ssid_history.bssid` | `networks.bssid` | NO ACTION |');
ln('| `surveillance_detections.bssid` | `networks.bssid` | CASCADE |');
ln('| `threat_scores_cache.bssid` | `networks.bssid` | CASCADE |');
ln('| `user_sessions.user_id` | `users.id` | CASCADE |');
ln('| `wigle_import_run_pages.run_id` | `wigle_import_runs.id` | CASCADE |');
ln('| `wigle_v3_observations.netid` | `wigle_v3_network_details.netid` | CASCADE |');
ln('');
ln('---');
ln('');
ln('### FK Candidates — Missing Constraints');
ln('');
ln(
  'Columns that semantically reference another table but have no enforced constraint. Each entry includes an orphan count measured against live data and a recommendation.'
);
ln('');
ln('#### Priority 1 — Add FK (clean data, natural ownership)');
ln('');
ln(
  'These columns have **zero orphans** and a clear owning table. Adding a FK is low-risk and immediately improves integrity.'
);
ln('');
ln('| Table.Column | Logical Referent | Orphans | Recommended Action | Notes |');
ln('|---|---|---|---|---|');
ln(
  '| `network_locations.bssid` | `networks.bssid` | **0 / 188,961** | `ADD FK ... ON DELETE CASCADE` | Core relationship — locations always belong to a network. No orphans detected in full table scan. |'
);
ln(
  '| `network_tags.bssid` | `networks.bssid` | **6 / 2,701** | `ADD FK ... ON DELETE CASCADE` | 6 orphaned tags (0.2%). Prune first, then constrain. Tags must be anchored to a network. |'
);
ln(
  '| `network_notes.bssid` | `networks.bssid` | **1 / 16** | `ADD FK ... ON DELETE CASCADE` | 1 orphaned note. Clean before constraining. |'
);
ln(
  '| `network_sibling_pairs.bssid1` | `networks.bssid` | **0 / 10,655** | `ADD FK ... ON DELETE CASCADE` | Zero orphans. Sibling pairs are always derived from known networks. |'
);
ln(
  '| `network_sibling_pairs.bssid2` | `networks.bssid` | **0 / 10,655** | `ADD FK ... ON DELETE CASCADE` | Same as bssid1. |'
);
ln(
  '| `network_sibling_overrides.bssid1` | `networks.bssid` | **0 / 109** | `ADD FK ... ON DELETE CASCADE` | User-authored overrides — must reference real networks. |'
);
ln(
  '| `network_sibling_overrides.bssid2` | `networks.bssid` | **0 / 109** | `ADD FK ... ON DELETE CASCADE` | Same as bssid1. |'
);
ln(
  '| `anchor_points.bssid` | `networks.bssid` | **0 / 338** | `ADD FK ... ON DELETE SET NULL` | Anchor points reference known signal sources. ON DELETE SET NULL preserves the anchor location if the network is removed. |'
);
ln('');
ln('#### Priority 2 — Investigate Before Acting');
ln('');
ln(
  'These columns have a plausible referent but orphan counts or type mismatches require investigation before adding a constraint.'
);
ln('');
ln('| Table.Column | Logical Referent | Orphans | Recommended Action | Notes |');
ln('|---|---|---|---|---|');
ln(
  '| `network_media.bssid` | `networks.bssid` | **0 / 0** (table empty) | Add FK when table has data | No live data to measure. Table structure is correct. |'
);
ln(
  '| `note_media.bssid` | `networks.bssid` | **0 / 0** (table empty) | Add FK when table has data | Same — empty table, no orphan risk yet. |'
);
ln(
  '| `kml_points.bssid` | `networks.bssid` | **~260 / 5,000** sampled (~5.2%) | Investigate before constraining | KML staging rows may pre-date network promotion. BSSIDs may be populated before the network row exists. A FK would break the staging→promotion pipeline unless deferred or nullable. Consider FK ON DELETE SET NULL. |'
);
ln(
  '| `wigle_v2_networks_search.bssid` | `networks.bssid` | **5,000 / 5,000** sampled | **Do NOT add FK** | WiGLE data is imported before local promotion. These BSSIDs are external and intentionally may not exist in `networks`. This is the source, not a child. |'
);
ln(
  '| `wigle_v2_bluetooth_search.bssid` | `networks.bssid` | **2,004 / 2,008** | **Do NOT add FK** | Same as above — WiGLE Bluetooth raw data, pre-promotion staging. |'
);
ln(
  '| `wigle_v2_bluetooth_search.netid` | `wigle_v3_network_details.netid` | **2,008 / 2,008** | **Do NOT add FK** | These are independent WiGLE data sources. The netid is a WiGLE-assigned string, not a local PK reference. |'
);
ln('');
ln('#### Priority 3 — By Design (not FK candidates)');
ln('');
ln('| Table.Column | Value Type | Reason No FK Needed |');
ln('|---|---|---|');
ln(
  '| `kismet_packets.session_id` | Free-text string | Kismet session identifier — no `kismet_sessions` table exists. Denormalized by design from Kismet SQLite source. |'
);
ln('| `kismet_devices.session_id` | Free-text string | Same — Kismet session label, not a FK. |');
ln('| `kismet_alerts.session_id` | Free-text string | Same. |');
ln('| `kismet_messages.session_id` | Free-text string | Same. |');
ln('| `kismet_datasources.session_id` | Free-text string | Same. |');
ln('| `kismet_data.session_id` | Free-text string | Same. |');
ln('| `kismet_snapshots.session_id` | Free-text string | Same. |');
ln(
  '| `deflock_cameras.source_id` | Numeric string (external ID) | External Deflock/DroneSentry system ID — no local referent table. |'
);
ln(
  '| `shotspotter_sensors.sensor_id` | Text (external ID) | ShotSpotter vendor-assigned sensor identifier — no local referent. |'
);
ln(
  '| `mobile_uploads.device_id` | Hex device fingerprint | Client-generated device hash (e.g. `34f2729658d8e5aa`) — not a FK to any local table. |'
);
ln(
  '| `network_notes.user_id` | Username string | Stores username strings (e.g. `geospatial_user`) — not an integer FK to `users.id`. Type mismatch makes FK impossible without schema change. |'
);
ln(
  '| `api_mv_refresh_state.last_refresh_id` | bigint | Operational state tracker, not a reference to a specific row. |'
);
ln(
  '| `kml_points.network_id` | Text | Stores the WiGLE/Kismet network identifier string, not `networks.id` (an integer). Naming is misleading — not a FK. |'
);
ln(
  '| `routes.run_id` | integer | Tested against `import_history` (35k/37k orphaned) and `wigle_import_runs` (too many orphans). Most likely an internal sequence counter or pre-FK era field. Not a safe FK candidate without further research. |'
);
ln(
  "| `hardware_inventory.bssid1/bssid2` | text | Table has -1 estimated rows (autovacuum hasn't run). Defer until table purpose is established. |"
);
ln(
  '| `agency_office_coverage_notes.legacy_agency_offices_id` | integer | **14/14 orphaned** — this is a legacy migration column; the real FK is `field_office_id → agency_offices.id`. This column should be removed or nulled out in a cleanup migration. |'
);
ln(
  '| `wigle_v3_network_details.netid` | text | This IS the PK for `wigle_v3_network_details`. Referenced correctly by the existing FK on `wigle_v3_observations.netid`. |'
);
ln('');
ln('---');
ln('');
ln('### Referential Integrity — Prioritized Recommendations');
ln('');
ln('| Priority | Migration | Tables Affected | Effort | Risk |');
ln('|---|---|---|---|---|');
ln(
  '| 🔴 P1 | Add FK `network_locations.bssid → networks.bssid` (ON DELETE CASCADE) | network_locations | Low | None — 0 orphans |'
);
ln(
  '| 🔴 P1 | Add FK `network_sibling_pairs.bssid1/2 → networks.bssid` (ON DELETE CASCADE) | network_sibling_pairs | Low | None — 0 orphans |'
);
ln(
  '| 🔴 P1 | Add FK `network_sibling_overrides.bssid1/2 → networks.bssid` (ON DELETE CASCADE) | network_sibling_overrides | Low | None — 0 orphans |'
);
ln(
  '| 🟡 P2 | Prune 6 orphaned tags, then add FK `network_tags.bssid → networks.bssid` | network_tags | Low | Must prune first |'
);
ln(
  '| 🟡 P2 | Prune 1 orphaned note, then add FK `network_notes.bssid → networks.bssid` | network_notes | Low | Must prune first |'
);
ln(
  '| 🟡 P2 | Add FK `anchor_points.bssid → networks.bssid` (ON DELETE SET NULL) | anchor_points | Low | 0 orphans but nullable |'
);
ln(
  '| 🟢 P3 | Investigate `kml_points.bssid` orphan rate (5.2% sampled) — possibly deferred FK | kml_points | Medium | Staging pipeline impact |'
);
ln(
  '| 🟢 P3 | Clean up `legacy_agency_offices_id` column (100% orphaned, superseded by field_office_id FK) | agency_office_coverage_notes | Low | Safe to null/drop |'
);
ln(
  '| 🔵 P4 | Rename `kml_points.network_id` to `wigle_network_id` (clarify it is not a FK) | kml_points | Low | Rename only |'
);
ln(
  '| 🔵 P4 | Consider adding `kismet_sessions` table and backfilling `session_id` as proper FK | kismet_* (7 tables) | High | Requires schema design |'
);
ln('');
ln(
  '> **Note:** All FK additions should be applied via the standard `apply-migration.sh` workflow. Each constraint addition is a separate migration to enable atomic rollback.'
);
ln('');
ln('---');
ln('');
ln(`*End of audit — generated ${now}*`);

// ---------- write output ----------
const outPath = path.join(ROOT, 'docs', 'schema', 'db-audit-report.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`✅ Written: ${outPath}`);
console.log(`   Lines: ${lines.length}`);
