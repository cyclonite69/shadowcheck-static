#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SUMMARY_PATH = path.join(ROOT_DIR, 'coverage', 'coverage-summary.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'docs', 'metrics', 'coverage_report.md');
const SNAPSHOT_PATH = path.join(ROOT_DIR, 'docs', 'metrics', 'coverage_snapshot.json');
const GLOBAL_THRESHOLD = 60;
const METRICS = ['statements', 'branches', 'functions', 'lines'];
const FILE_VERDICT_METRICS = ['lines', 'branches', 'functions'];

const GROUPS = [
  { name: 'etl/', matches: (filePath) => filePath.startsWith('etl/') },
  { name: 'scripts/', matches: (filePath) => filePath.startsWith('scripts/') },
  {
    name: 'server/src/api/routes/',
    matches: (filePath) => filePath.startsWith('server/src/api/routes/'),
  },
  {
    name: 'server/src/services/',
    matches: (filePath) => filePath.startsWith('server/src/services/'),
  },
  {
    name: 'server/src/repositories/',
    matches: (filePath) => filePath.startsWith('server/src/repositories/'),
  },
  {
    name: 'server/src/ (other)',
    matches: (filePath) => filePath.startsWith('server/src/'),
  },
];

function percentage(covered, total) {
  if (total === 0) {
    return 100;
  }

  return Math.floor((covered / total) * 10000) / 100;
}

function formatPercentage(value) {
  return `${value.toFixed(2)}%`;
}

function verdictForPercentage(value) {
  if (value >= 80) {
    return 'COVERED';
  }
  if (value >= 40) {
    return 'PARTIAL';
  }
  return 'UNCOVERED';
}

function fileVerdict(summary) {
  const weakestMetric = Math.min(...FILE_VERDICT_METRICS.map((metric) => summary[metric].pct));
  return verdictForPercentage(weakestMetric);
}

function aggregateSummaries(summaries) {
  return Object.fromEntries(
    METRICS.map((metric) => {
      const totals = summaries.reduce(
        (aggregate, summary) => ({
          total: aggregate.total + summary[metric].total,
          covered: aggregate.covered + summary[metric].covered,
          skipped: aggregate.skipped + summary[metric].skipped,
        }),
        { total: 0, covered: 0, skipped: 0 }
      );

      return [
        metric,
        {
          ...totals,
          pct: percentage(totals.covered, totals.total),
        },
      ];
    })
  );
}

function relativeCoveragePath(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  return relativePath.split(path.sep).join('/');
}

function resolveGitDirectory() {
  const gitPath = path.join(ROOT_DIR, '.git');
  const gitStat = fs.statSync(gitPath);

  if (gitStat.isDirectory()) {
    return gitPath;
  }

  const gitFile = fs.readFileSync(gitPath, 'utf8').trim();
  const match = /^gitdir:\s*(.+)$/.exec(gitFile);
  if (!match) {
    throw new Error(`Unable to resolve Git directory from ${gitPath}`);
  }

  return path.resolve(ROOT_DIR, match[1]);
}

function readGitSha() {
  const gitDirectory = resolveGitDirectory();
  const head = fs.readFileSync(path.join(gitDirectory, 'HEAD'), 'utf8').trim();

  if (!head.startsWith('ref: ')) {
    return head.slice(0, 8);
  }

  const refName = head.slice('ref: '.length);
  const looseRefPath = path.join(gitDirectory, ...refName.split('/'));
  if (fs.existsSync(looseRefPath)) {
    return fs.readFileSync(looseRefPath, 'utf8').trim().slice(0, 8);
  }

  const packedRefsPath = path.join(gitDirectory, 'packed-refs');
  if (fs.existsSync(packedRefsPath)) {
    const packedRef = fs
      .readFileSync(packedRefsPath, 'utf8')
      .split('\n')
      .find((line) => line.endsWith(` ${refName}`));
    if (packedRef) {
      return packedRef.split(' ')[0].slice(0, 8);
    }
  }

  throw new Error(`Unable to resolve Git ref ${refName}`);
}

function metricLabel(metric) {
  return metric.charAt(0).toUpperCase() + metric.slice(1);
}

function renderAggregateTable(summary) {
  const rows = METRICS.map(
    (metric) =>
      `| ${metricLabel(metric)} | ${summary[metric].covered} / ${summary[metric].total} | ${formatPercentage(summary[metric].pct)} |`
  );

  return ['| Metric | Covered / Total | Coverage |', '| --- | ---: | ---: |', ...rows].join('\n');
}

function renderFileTable(files) {
  const rows = files.map(({ filePath, summary }) => {
    const lines = formatPercentage(summary.lines.pct);
    const branches = formatPercentage(summary.branches.pct);
    const functions = formatPercentage(summary.functions.pct);
    return `| \`${filePath}\` | ${lines} | ${branches} | ${functions} | ${fileVerdict(summary)} |`;
  });

  return [
    '| File | Lines | Branches | Functions | Verdict |',
    '| --- | ---: | ---: | ---: | --- |',
    ...rows,
  ].join('\n');
}

function renderGlobalTotals(total) {
  const rows = METRICS.map((metric) => {
    const status = total[metric].pct >= GLOBAL_THRESHOLD ? 'PASS' : 'FAIL';
    return `| ${metricLabel(metric)} | ${total[metric].covered} / ${total[metric].total} | ${formatPercentage(total[metric].pct)} | ${GLOBAL_THRESHOLD}% | ${status} |`;
  });

  return [
    '| Metric | Covered / Total | Actual | Threshold | Status |',
    '| --- | ---: | ---: | ---: | --- |',
    ...rows,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Next Opportunities — engineering-value ranking
// ---------------------------------------------------------------------------

/**
 * Returns true for files that should be excluded from opportunity ranking:
 * - TypeScript declaration files (.d.ts)
 * - Barrel / re-export-only files whose name is index.ts/js (no own logic)
 * - Generated migration SQL runners
 * - The coverage report generator itself (meta-script)
 */
function isLowValueFile(filePath) {
  if (filePath.endsWith('.d.ts')) {
    return true;
  }
  // Barrel files: named exactly index.ts or index.js (possibly with path prefix)
  const basename = path.basename(filePath);
  if (basename === 'index.ts' || basename === 'index.js') {
    return true;
  }
  // Migration/seed scripts
  if (filePath.includes('sql/migrations/') || filePath.includes('sql/seeds/')) {
    return true;
  }
  // The report generator itself
  if (filePath === 'scripts/generate-coverage-report.js') {
    return true;
  }
  return false;
}

/**
 * Returns a tier multiplier (1–4) based on how high-impact the file type is.
 * Routes, services, validators, and parsers are tier 4 (highest).
 * Repositories are tier 3. ETL/scripts with logic are tier 2. Everything else is tier 1.
 */
function fileTier(filePath) {
  if (
    filePath.startsWith('server/src/api/routes/') ||
    filePath.startsWith('server/src/services/') ||
    filePath.startsWith('server/src/validation/') ||
    filePath.includes('/validators') ||
    filePath.includes('/parsers/') ||
    filePath.includes('parseParams') ||
    filePath.includes('parser.')
  ) {
    return 4;
  }
  if (filePath.startsWith('server/src/repositories/')) {
    return 3;
  }
  if (filePath.startsWith('etl/') || filePath.startsWith('scripts/')) {
    return 2;
  }
  return 1;
}

/**
 * Computes the engineering-value score for a file.
 *
 * Score = tier × (uncoveredBranches × 3 + uncoveredFunctions × 2 + uncoveredStatements × 1)
 *
 * Branches are weighted highest because they represent untested decision paths.
 * Functions are next because an uncovered function means zero coverage of its body.
 * Statements provide a tiebreaker for files with similar branch/function gaps.
 */
function engineeringScore(filePath, summary) {
  const uncoveredBranches = summary.branches.total - summary.branches.covered;
  const uncoveredFunctions = summary.functions.total - summary.functions.covered;
  const uncoveredStatements = summary.statements.total - summary.statements.covered;
  const tier = fileTier(filePath);
  return tier * (uncoveredBranches * 3 + uncoveredFunctions * 2 + uncoveredStatements);
}

function renderNextOpportunities(files) {
  const LIMIT = 15;

  const targets = files
    .filter(({ filePath, summary }) => {
      if (isLowValueFile(filePath)) {
        return false;
      }
      // Must have at least one uncovered branch, function, or statement to be actionable
      const hasGap =
        summary.branches.covered < summary.branches.total ||
        summary.functions.covered < summary.functions.total ||
        summary.statements.covered < summary.statements.total;
      return hasGap;
    })
    .map(({ filePath, summary }) => ({
      filePath,
      summary,
      score: engineeringScore(filePath, summary),
      uncoveredBranches: summary.branches.total - summary.branches.covered,
      uncoveredFunctions: summary.functions.total - summary.functions.covered,
      uncoveredStatements: summary.statements.total - summary.statements.covered,
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.uncoveredBranches - left.uncoveredBranches ||
        right.uncoveredFunctions - left.uncoveredFunctions ||
        left.filePath.localeCompare(right.filePath)
    )
    .slice(0, LIMIT);

  if (targets.length === 0) {
    return '_No actionable gaps found._';
  }

  const rows = targets.map(
    (
      { filePath, summary, score, uncoveredBranches, uncoveredFunctions, uncoveredStatements },
      index
    ) =>
      `| ${index + 1} | \`${filePath}\` | ${score} | ${uncoveredBranches} | ${uncoveredFunctions} | ${uncoveredStatements} | ${formatPercentage(summary.branches.pct)} | ${formatPercentage(summary.functions.pct)} |`
  );

  return [
    '| Rank | File | Score | Uncov. Branches | Uncov. Functions | Uncov. Statements | Branches | Functions |',
    '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Coverage Trend
// ---------------------------------------------------------------------------

/**
 * Reads the previous snapshot from SNAPSHOT_PATH if it exists.
 * Returns null if the file is absent or unparseable.
 */
function readSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Writes the current totals as a snapshot for future trend comparisons.
 *
 * @param {object} total - The `total` entry from coverage-summary.json
 * @param {string} generatedAt - ISO timestamp of this run
 * @param {string} gitSha - Short git SHA of this run
 */
function writeSnapshot(total, generatedAt, gitSha) {
  const snapshot = {
    generatedAt,
    gitSha,
    totals: Object.fromEntries(
      METRICS.map((metric) => [
        metric,
        {
          covered: total[metric].covered,
          total: total[metric].total,
          pct: total[metric].pct,
        },
      ])
    ),
  };
  fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
}

/**
 * Formats a percentage delta with an explicit sign and two decimal places.
 * e.g. +1.23%, -0.50%, 0.00%
 */
function formatDelta(value) {
  if (value === 0) {
    return '0.00%';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function renderTrend(previousSnapshot, currentTotals) {
  if (!previousSnapshot) {
    return '_No previous snapshot found. Trend will appear on the next run after this one._';
  }

  const rows = METRICS.map((metric) => {
    const prev = previousSnapshot.totals[metric];
    const curr = {
      covered: currentTotals[metric].covered,
      total: currentTotals[metric].total,
      pct: currentTotals[metric].pct,
    };
    const deltaPct = Math.round((curr.pct - prev.pct) * 100) / 100;
    const deltaCovered = curr.covered - prev.covered;
    const deltaTotal = curr.total - prev.total;
    const covDeltaStr = deltaCovered >= 0 ? `+${deltaCovered}` : `${deltaCovered}`;
    const totDeltaStr = deltaTotal >= 0 ? `+${deltaTotal}` : `${deltaTotal}`;
    return `| ${metricLabel(metric)} | ${prev.covered} / ${prev.total} | ${formatPercentage(prev.pct)} | ${curr.covered} / ${curr.total} | ${formatPercentage(curr.pct)} | ${covDeltaStr} / ${totDeltaStr} | ${formatDelta(deltaPct)} |`;
  });

  const prevLabel = previousSnapshot.gitSha
    ? `Previous (\`${previousSnapshot.gitSha}\` — ${previousSnapshot.generatedAt})`
    : 'Previous';

  return [
    `_${prevLabel}_`,
    '',
    '| Metric | Prev Covered / Total | Prev % | Curr Covered / Total | Curr % | Δ Covered / Total | Δ % |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
  ].join('\n');
}

function main() {
  const coverage = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
  const files = Object.entries(coverage)
    .filter(([filePath]) => filePath !== 'total')
    .map(([filePath, summary]) => ({
      filePath: relativeCoveragePath(filePath),
      summary,
    }))
    .sort((left, right) => left.filePath.localeCompare(right.filePath));

  const groupedFiles = new Map(GROUPS.map((group) => [group.name, []]));
  const unrecognizedPaths = [];

  for (const file of files) {
    const group = GROUPS.find(({ matches }) => matches(file.filePath));
    if (!group) {
      unrecognizedPaths.push(file.filePath);
      continue;
    }
    groupedFiles.get(group.name).push(file);
  }

  if (unrecognizedPaths.length > 0) {
    throw new Error(`Coverage paths do not match a report group:\n${unrecognizedPaths.join('\n')}`);
  }

  const generatedAt = new Date().toISOString();
  const gitSha = readGitSha();
  const sourceModifiedAt = fs.statSync(SUMMARY_PATH).mtime.toISOString();

  // Read previous snapshot before writing the new one
  const previousSnapshot = readSnapshot();
  writeSnapshot(coverage.total, generatedAt, gitSha);

  const sections = [
    '# Coverage Report',
    '',
    `- Generated: ${generatedAt}`,
    `- Git SHA: \`${gitSha}\``,
    '- Source: `coverage/coverage-summary.json`',
    `- Coverage artifact modified: ${sourceModifiedAt}`,
    `- Global threshold: ${GLOBAL_THRESHOLD}% per metric`,
    '',
    '## Global Totals',
    '',
    renderGlobalTotals(coverage.total),
    '',
    '> Coverage totals reflect the collection scope of the source artifact. Layer aggregates are calculated from covered and total counters, not averages of file percentages.',
    '',
    '## Coverage Trend',
    '',
    renderTrend(previousSnapshot, coverage.total),
    '',
    '## Layer Breakdown',
    '',
  ];

  for (const group of GROUPS) {
    const groupFiles = groupedFiles.get(group.name);
    const aggregate = aggregateSummaries(groupFiles.map(({ summary }) => summary));

    sections.push(
      `### \`${group.name}\``,
      '',
      `Files: ${groupFiles.length}`,
      '',
      renderAggregateTable(aggregate),
      '',
      renderFileTable(groupFiles),
      ''
    );
  }

  sections.push(
    '## Next Opportunities',
    '',
    'Files ranked by engineering value: uncovered decision paths (branches) and entry points (functions) weighted above raw statement count.',
    'Route handlers, services, validators, and parsers are prioritised over utility and configuration files.',
    'Declaration files (`.d.ts`), barrel re-exports (`index.ts/js`), and the report generator itself are excluded.',
    '',
    renderNextOpportunities(files),
    '',
    '## Verdict Scale',
    '',
    '| Verdict | Coverage |',
    '| --- | ---: |',
    '| COVERED | >= 80% |',
    '| PARTIAL | 40% to 79.99% |',
    '| UNCOVERED | < 40% |',
    ''
  );

  fs.writeFileSync(OUTPUT_PATH, sections.join('\n'));
  console.log(`Wrote ${path.relative(ROOT_DIR, OUTPUT_PATH)}`);
  console.log(`Updated snapshot ${path.relative(ROOT_DIR, SNAPSHOT_PATH)}`);
}

main();
