import {
  analyzeSourceText,
  resolveRelativeImport,
} from '../../scripts/audit/architecture/inventory';
import {
  classifyRole,
  isRepositoryOrchestrationImport,
} from '../../scripts/audit/architecture/modularityAnalysis';
import { emitAuditReport, parseAuditCli } from '../../scripts/audit/architecture/cli';
import { buildRefactorRoadmap } from '../../scripts/audit/architecture/roadmap';
import { renderCruftReport } from '../../scripts/audit/architecture/reporting';
import type {
  CruftAuditResult,
  ModularityAuditResult,
  RepositoryInventory,
  SourceRecord,
} from '../../scripts/audit/architecture/types';

const emptyInventory = (records: SourceRecord[] = []): RepositoryInventory => ({
  repoRoot: '/repo',
  head: 'abc12345',
  generatedDate: '2026-06-20',
  allFiles: records.map((record) => record.path),
  sourceRecords: records,
  sourceByPath: new Map(records.map((record) => [record.path, record])),
  inboundReferences: new Map(records.map((record) => [record.path, []])),
  packageManifest: {},
  documentedEnvKeys: [],
  usedEnvKeys: [],
});

const emptyCruft = (): CruftAuditResult => ({
  findings: [],
  unreferencedFiles: [],
  unusedExports: [],
  orphanTests: [],
  dependencyCandidates: [],
  envCandidates: [],
  temporaryFiles: [],
});

const emptyModularity = (): ModularityAuditResult => ({
  findings: [],
  oversizedModules: [],
  roleViolations: [],
  couplingCandidates: [],
  policyFindings: [],
  largestModules: [],
});

describe('architecture audit tooling', () => {
  it('collects static, dynamic, type-only, and Jest module references', () => {
    const record = analyzeSourceText(
      'client/src/App.tsx',
      `
        import { alpha } from './alpha';
        const Page = lazy(() => import('./Page'));
        type Config = import('./types').Config;
        jest.mock('./mocked');
        export const value = alpha;
      `
    );

    expect(record.imports.map((item) => item.specifier)).toEqual(
      expect.arrayContaining(['./alpha', './Page', './types', './mocked'])
    );
    expect(record.exports).toContain('value');
  });

  it('resolves extensionless and index imports against the inventory', () => {
    const paths = new Set([
      'client/src/alpha.ts',
      'client/src/beta/index.tsx',
      'server/src/config/database.ts',
    ]);
    expect(resolveRelativeImport('client/src/App.tsx', './alpha', paths)).toBe(
      'client/src/alpha.ts'
    );
    expect(resolveRelativeImport('client/src/App.tsx', './beta', paths)).toBe(
      'client/src/beta/index.tsx'
    );
    expect(
      resolveRelativeImport('tests/unit/database.test.ts', 'server/src/config/database', paths)
    ).toBe('server/src/config/database.ts');
  });

  it('counts SQL only from code literals, not comments', () => {
    const record = analyzeSourceText(
      'server/src/api/routes/v1/example.ts',
      `
        // SELECT and DELETE are documentation only.
        const sql = 'SELECT * FROM app.example';
        query(sql);
      `
    );
    expect(record.metrics.sqlStatementCount).toBe(1);
    expect(record.metrics.lineCount).toBe(5);
  });

  it('matches the existing policy export-count semantics for CommonJS modules', () => {
    const record = analyzeSourceText(
      'server/src/example.ts',
      'export {};\nconst alpha = 1;\nconst beta = 2;\nmodule.exports = { alpha, beta };\n'
    );
    expect(record.exports).toEqual(['alpha', 'beta']);
    expect(record.metrics.exportCount).toBe(3);
  });

  it('classifies common architectural roles deterministically', () => {
    expect(classifyRole('server/src/api/routes/v1/health.ts')).toBe('route');
    expect(classifyRole('server/src/repositories/networkRepository.ts')).toBe('repository');
    expect(classifyRole('client/src/components/geospatial/hooks/useMap.ts')).toBe('hook');
    expect(classifyRole('client/src/config/apiTestEndpoints.ts')).toBe('registry');
  });

  it('does not treat repository support modules as orchestration dependencies', () => {
    expect(
      isRepositoryOrchestrationImport('server/src/services/filterQueryBuilder/sqlExpressions.ts')
    ).toBe(false);
    expect(
      isRepositoryOrchestrationImport(
        'server/src/services/wigleImport/repositories/runReadRepository.ts'
      )
    ).toBe(false);
    expect(
      isRepositoryOrchestrationImport('server/src/services/networkOrchestrationService.ts')
    ).toBe(true);
  });

  it('validates safe CLI arguments', () => {
    expect(parseAuditCli(['--date', '2026-06-20', '--stdout', '--top', '25'])).toEqual({
      date: '2026-06-20',
      stdout: true,
      output: null,
      top: 25,
    });
    expect(() => parseAuditCli(['--date', '06/20/2026'])).toThrow('Invalid --date');
    expect(() => parseAuditCli(['--unknown'])).toThrow('Unknown audit option');
  });

  it('refuses report output outside docs/audits', () => {
    expect(() =>
      emitAuditReport('/repo', 'audit.md', '# Audit', {
        date: '2026-06-20',
        stdout: false,
        output: 'docs/architecture-audit.md',
        top: 25,
      })
    ).toThrow('Audit reports may only be written under docs/audits/');
  });

  it('keeps role locks ahead of extraction and deletion roadmap stages', () => {
    const record = analyzeSourceText(
      'client/src/hooks/useExample.ts',
      'export const useExample = () => Array.from({ length: 2 }, (_, index) => index);'
    );
    const inventory = emptyInventory([record]);
    const finding = {
      id: 'threshold:example',
      category: 'structural-threshold',
      severity: 'medium' as const,
      confidence: 'high' as const,
      path: record.path,
      evidence: 'Example exceeds a role threshold.',
      recommendation: 'Extract pure logic.',
      requiredTests: ['npx jest tests/unit/useExample.test.ts --no-coverage --runInBand'],
    };
    const modularity = emptyModularity();
    modularity.findings = [finding];
    const cruft = emptyCruft();
    cruft.unreferencedFiles = [{ ...finding, category: 'unreferenced-file' }];

    const roadmap = buildRefactorRoadmap(inventory, modularity, cruft);
    expect(roadmap.map((item) => item.stage)).toEqual([1, 2, 5]);
    expect(roadmap[0].priority).toBe('P1');
  });

  it('renders an explicit no-delete safety contract', () => {
    const report = renderCruftReport(emptyInventory(), emptyCruft());
    expect(report).toContain('findings are candidates, not deletion or refactor authorization');
    expect(report).toContain('No candidate in this report is approved for deletion');
  });
});
