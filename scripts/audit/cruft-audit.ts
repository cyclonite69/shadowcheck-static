import path from 'node:path';
import { analyzeCruft } from './architecture/cruftAnalysis';
import { emitAuditReport, parseAuditCli } from './architecture/cli';
import { buildRepositoryInventory, loadAuditConfig } from './architecture/inventory';
import { renderCruftReport } from './architecture/reporting';

const repoRoot = path.resolve(__dirname, '../..');
const options = parseAuditCli(process.argv.slice(2));
const config = loadAuditConfig(repoRoot);
const inventory = buildRepositoryInventory(repoRoot, options.date, config);
const result = analyzeCruft(inventory, config);
const report = renderCruftReport(inventory, result, options.top);

emitAuditReport(repoRoot, `${options.date}-cruft-audit.md`, report, options);
