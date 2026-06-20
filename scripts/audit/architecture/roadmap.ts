import path from 'node:path';
import type {
  AuditFinding,
  CruftAuditResult,
  ModularityAuditResult,
  RepositoryInventory,
  RoadmapItem,
} from './types';

const testCommandsFor = (findings: AuditFinding[]): string[] =>
  [...new Set(findings.flatMap((finding) => finding.requiredTests))].slice(0, 5);

const riskFor = (
  finding: AuditFinding,
  inventory: RepositoryInventory
): 'low' | 'medium' | 'high' => {
  const record = inventory.sourceByPath.get(finding.path);
  if (
    finding.severity === 'high' ||
    (record?.metrics.sideEffectCallCount || 0) >= 3 ||
    /sql\/|migration|orchestrator/i.test(finding.path)
  ) {
    return 'high';
  }
  return finding.severity === 'medium' ? 'medium' : 'low';
};

const stageOnePriorityFor = (findings: AuditFinding[]): 'P0' | 'P1' =>
  findings.some(
    (finding) =>
      finding.category === 'policy-threshold' ||
      (finding.category === 'role-violation' && finding.severity === 'high') ||
      ((finding.category === 'high-fan-out' || finding.category === 'coupling-hub') &&
        finding.severity === 'high')
  )
    ? 'P0'
    : 'P1';

export const buildRefactorRoadmap = (
  inventory: RepositoryInventory,
  modularity: ModularityAuditResult,
  cruft: CruftAuditResult
): RoadmapItem[] => {
  const grouped = new Map<string, AuditFinding[]>();
  for (const finding of modularity.findings) {
    const existing = grouped.get(finding.path) || [];
    existing.push(finding);
    grouped.set(finding.path, existing);
  }

  const items: RoadmapItem[] = [];
  for (const [file, findings] of grouped) {
    const record = inventory.sourceByPath.get(file);
    const risk = riskFor(findings[0], inventory);
    items.push({
      stage: 1,
      priority: stageOnePriorityFor(findings),
      risk: 'low',
      path: file,
      goal: 'Add or confirm characterization coverage before structural changes.',
      rationale: findings.map((finding) => finding.evidence).join(' '),
      requiredTests: testCommandsFor(findings),
    });

    if (record && record.metrics.sideEffectCallCount === 0 && risk !== 'high') {
      items.push({
        stage: 2,
        priority: 'P1',
        risk: 'low',
        path: file,
        goal: 'Extract pure decision, parsing, or rendering logic into focused modules.',
        rationale: `Static analysis found ${record.metrics.functionCount} functions and a largest function of ${record.metrics.maxFunctionLines} lines without direct side-effect call signals.`,
        requiredTests: testCommandsFor(findings),
      });
    } else if (record && record.metrics.sideEffectCallCount > 0) {
      items.push({
        stage: 3,
        priority: risk === 'high' ? 'P2' : 'P1',
        risk,
        path: file,
        goal: 'Isolate side effects behind explicit service/repository boundaries after role locks exist.',
        rationale: `Static analysis found ${record.metrics.sideEffectCallCount} direct side-effect call signals.`,
        requiredTests: testCommandsFor(findings),
      });
    }

    if (record && record.metrics.sqlStatementCount >= 4) {
      items.push({
        stage: 4,
        priority: 'P2',
        risk: 'high',
        path: file,
        goal: 'Separate SQL structure from business rules only after integration behavior is locked.',
        rationale: `Static analysis found ${record.metrics.sqlStatementCount} SQL keyword occurrences.`,
        requiredTests: testCommandsFor(findings),
      });
    }
  }

  for (const finding of [...cruft.unreferencedFiles, ...cruft.unusedExports]) {
    items.push({
      stage: 5,
      priority: 'P3',
      risk: 'low',
      path: finding.path,
      goal: 'Confirm runtime ownership, then remove or de-export only with explicit approval.',
      rationale: finding.evidence,
      requiredTests: finding.requiredTests,
    });
  }

  const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return items
    .filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) => candidate.stage === item.stage && candidate.path === item.path
        ) === index
    )
    .sort(
      (a, b) =>
        a.stage - b.stage ||
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        a.path.localeCompare(b.path)
    );
};

export const suggestedTestPath = (sourcePath: string): string => {
  const basename = path.basename(sourcePath).replace(/\.[^.]+$/, '');
  return `tests/unit/${basename}.test.ts`;
};
