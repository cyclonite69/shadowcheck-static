# ShadowCheck Maintenance Cadence

To maintain architectural integrity, prevent documentation drift, and prevent codebase decay over time, ShadowCheck relies on a structured, recurring maintenance cadence.

This cadence divides development and audit tasks into four distinct lanes: **Feature Work**, **Regression Protection (Tests)**, **Docs & Wiki Sync**, and **Modularity & Cruft Audits**.

---

## 1. The Four Maintenance Lanes

```
+-------------------------------------------------------------------------------+
|                           1. FEATURE WORK                                     |
|  - Implement new capabilities, endpoints, and database models.                 |
|  - Always perform a "Docs Impact Check" upon modifying a subsystem.            |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                    2. REGRESSION PROTECTION & TESTING                         |
|  - Maintain a minimum 60% coverage threshold (enforced via pre-commit gates). |
|  - Every feature addition requires corresponding unit/integration tests.       |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                       3. DOCS & WIKI SYNCHRONIZATION                          |
|  - Keep repo docs (`docs/`) and wiki files (`.github/wiki/`) aligned.         |
|  - Prevent stale diagrams and absolute link drift (`file:///` references).     |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                       4. MODULARITY & CRUFT AUDITS                            |
|  - Split oversized or mixed-responsibility modules.                           |
|  - Delete dead code, stale scripts, obsolete configs, and database views.     |
+-------------------------------------------------------------------------------+
```

---

## 2. Invalidation & Audit Checklist

Before committing any major feature cluster, run through this checklists to identify and repair architectural drift:

### Docs Impact Check

- **API Routes**: Did the change add or modify Express routes or endpoints? If yes, update `docs/API_REFERENCE.md` and register the endpoints in `client/src/config/apiTestEndpoints.ts`.
- **Database Schema**: Did the change modify, add, or drop columns, tables, triggers, indexes, or views? If yes, update `docs/schema/network-tables.md` or `docs/schema/observations-sources.md`.
- **Query Parameters**: Did the change add new filters? If yes, update `docs/FILTERS.md`.
- **Operator Workflow**: Did the change modify CLI commands, background jobs, or UI dashboards (e.g., WiGLE ingestion player states)? If yes, update the corresponding feature guide under `docs/features/`.

### Drift & Cruft Inspection

- Ensure no absolute local filesystem paths (`file:///home/operator/...`) exist in any documentation or markdown files.
- Ensure that all Mermaid diagrams remain syntactically valid (wrap nodes containing parentheses or special characters inside double quotes `["Like This"]`).
- Ensure that `rows_inserted` counts are treated as import write indicators, and never used in place of `stored_count` for reporting database coverage.

---

## 3. Auditing Workflows for AI Agents

When delegating audits or refactoring tasks, use these standardized audit prompts:

### Modularity Pass

```txt
ShadowCheck Modularity Audit

Goal:
Scan the codebase (focusing on `server/src/services/` and `client/src/components/`) to identify files that exceed single-responsibility bounds, have mixed levels of abstraction, or contain duplicated query builders.

Output:
Provide a report listing candidate files, the rationale for refactoring, and a step-by-step partition plan before editing any files.
```

### Cruft Audit Pass

```txt
ShadowCheck Cruft & Invalidation Audit

Goal:
Scan the repository to locate dead code, obsolete environment variable references, orphaned utility scripts, outdated mock files, or untracked temporary reports/logs.

Output:
List candidate files for deletion. Wait for explicit approval before running any file deletions.
```
