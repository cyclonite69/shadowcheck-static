import path from 'node:path';
import { emitAuditReport, parseAuditCli } from './architecture/cli';
import { buildRepositoryInventory, loadAuditConfig } from './architecture/inventory';
import { analyzeModularity } from './architecture/modularityAnalysis';
import { renderModularityReport } from './architecture/reporting';

const repoRoot = path.resolve(__dirname, '../..');
const options = parseAuditCli(process.argv.slice(2));
const config = loadAuditConfig(repoRoot);
const inventory = buildRepositoryInventory(repoRoot, options.date, config);
const result = analyzeModularity(inventory, config);
const report = renderModularityReport(inventory, result, options.top);

emitAuditReport(repoRoot, `${options.date}-modularity-audit.md`, report, options);
