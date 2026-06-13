#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SUMMARY_PATH = path.join(ROOT_DIR, 'coverage', 'coverage-summary.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'docs', 'metrics', 'coverage_report.md');
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

function renderTopUncovered(files) {
  const targets = files
    .filter(
      ({ filePath, summary }) =>
        filePath.startsWith('server/src/') &&
        fileVerdict(summary) === 'UNCOVERED' &&
        summary.lines.total - summary.lines.covered > 0
    )
    .map(({ filePath, summary }) => ({
      filePath,
      summary,
      uncoveredLines: summary.lines.total - summary.lines.covered,
    }))
    .sort(
      (left, right) =>
        right.uncoveredLines - left.uncoveredLines ||
        left.summary.lines.pct - right.summary.lines.pct ||
        left.filePath.localeCompare(right.filePath)
    )
    .slice(0, 10);

  const rows = targets.map(
    ({ filePath, summary, uncoveredLines }, index) =>
      `| ${index + 1} | \`${filePath}\` | ${uncoveredLines} | ${formatPercentage(summary.lines.pct)} | ${formatPercentage(summary.branches.pct)} | ${formatPercentage(summary.functions.pct)} |`
  );

  return [
    '| Rank | File | Uncovered Lines | Lines | Branches | Functions |',
    '| ---: | --- | ---: | ---: | ---: | ---: |',
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
    '## Highest-Value Uncovered Application Files',
    '',
    'Limited to `server/src/`; ETL and CLI scripts are excluded. Files are ranked by uncovered executable lines. The per-file verdict is determined by the weakest of Lines, Branches, and Functions coverage.',
    '',
    renderTopUncovered(files),
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
}

main();
