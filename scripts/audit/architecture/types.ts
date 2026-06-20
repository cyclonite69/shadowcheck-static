export type AuditSeverity = 'high' | 'medium' | 'low' | 'info';
export type AuditConfidence = 'high' | 'medium' | 'low';

export type ImportReference = {
  specifier: string;
  names: string[];
  wholeModule: boolean;
  resolvedPath: string | null;
};

export type SourceMetrics = {
  lineCount: number;
  importCount: number;
  exportCount: number;
  functionCount: number;
  maxFunctionLines: number;
  sqlStatementCount: number;
  sideEffectCallCount: number;
};

export type SourceRecord = {
  path: string;
  content: string;
  imports: ImportReference[];
  exports: string[];
  metrics: SourceMetrics;
};

export type PackageManifest = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type RepositoryInventory = {
  repoRoot: string;
  head: string;
  generatedDate: string;
  allFiles: string[];
  sourceRecords: SourceRecord[];
  sourceByPath: Map<string, SourceRecord>;
  inboundReferences: Map<string, string[]>;
  packageManifest: PackageManifest;
  documentedEnvKeys: string[];
  usedEnvKeys: string[];
};

export type AuditFinding = {
  id: string;
  category: string;
  severity: AuditSeverity;
  confidence: AuditConfidence;
  path: string;
  evidence: string;
  recommendation: string;
  requiredTests: string[];
};

export type CruftAuditResult = {
  findings: AuditFinding[];
  unreferencedFiles: AuditFinding[];
  unusedExports: AuditFinding[];
  orphanTests: AuditFinding[];
  dependencyCandidates: AuditFinding[];
  envCandidates: AuditFinding[];
  temporaryFiles: AuditFinding[];
};

export type RoleThreshold = {
  maxLines: number;
  maxImports: number;
  maxFunctions: number;
  maxFunctionLines: number;
};

export type ArchitectureAuditConfig = {
  roots: string[];
  excludes: string[];
  entrypoints: string[];
  envIgnore: string[];
  roles: Record<string, RoleThreshold>;
};

export type ModularityAuditResult = {
  findings: AuditFinding[];
  oversizedModules: AuditFinding[];
  roleViolations: AuditFinding[];
  couplingCandidates: AuditFinding[];
  policyFindings: AuditFinding[];
  largestModules: SourceRecord[];
};

export type RoadmapItem = {
  stage: number;
  priority: string;
  risk: 'low' | 'medium' | 'high';
  path: string;
  goal: string;
  rationale: string;
  requiredTests: string[];
};
