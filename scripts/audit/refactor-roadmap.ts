import path from 'node:path';
import { emitAuditReport, parseAuditCli } from './architecture/cli';
import { analyzeCruft } from './architecture/cruftAnalysis';
import { buildRepositoryInventory, loadAuditConfig } from './architecture/inventory';
import { analyzeModularity } from './architecture/modularityAnalysis';
import { renderRoadmapReport } from './architecture/reporting';
import { buildRefactorRoadmap } from './architecture/roadmap';

const repoRoot = path.resolve(__dirname, '../..');
const options = parseAuditCli(process.argv.slice(2));
const config = loadAuditConfig(repoRoot);
const inventory = buildRepositoryInventory(repoRoot, options.date, config);
const modularity = analyzeModularity(inventory, config);
const cruft = analyzeCruft(inventory, config);
const roadmap = buildRefactorRoadmap(inventory, modularity, cruft);
const report = renderRoadmapReport(inventory, roadmap, options.top);

emitAuditReport(repoRoot, `${options.date}-architecture-roadmap.md`, report, options);
