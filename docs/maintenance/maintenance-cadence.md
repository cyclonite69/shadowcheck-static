# ShadowCheck Maintenance Cadence

To maintain architectural integrity, prevent documentation drift, and prevent codebase decay over time, ShadowCheck relies on a structured, recurring maintenance cadence.

This cadence divides development and audit tasks into four distinct lanes: **Feature Work**, **Regression Protection (Tests)**, **Docs & Wiki Sync**, and **Modularity & Cruft Audits**.

---

## 0. Gate Before Every Lane: Existing Work Audit

Every substantive lane begins with the read-only [Existing Work Audit](../workflow/EXISTING_WORK_AUDIT.md). Agents must establish current implementation, tests, docs, scripts, schema, dirty files, prior work, and lane ownership; report the evidence; and wait for explicit scope approval before editing. `Continue` means re-audit and resume only the verified interrupted lane, never restart from memory.

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

---

## 4. Git History & Changelog Assisted Documentation Audit

A thorough documentation audit should not merely inspect the current state of the code. It must systematically identify changes since the last verified docs update to capture behavioral drift.

### Core Workflow

1. **Find last docs update**: Locate the commit where subsystem or general documentation was last systematically reconciled.
2. **Identify changes since then**: Trace modifications across server and client source files, database schemas, route configurations, and test suites.
3. **Group by subsystem**: Classify the changed files into relevant subsystems (e.g. WiGLE import, sibling inference, surveillance, geospatial).
4. **Map to documentation**: Review if corresponding feature docs, schemas, filter reference guides, and wiki pages were modified. If they were bypassed, flag them as drift candidates.
5. **Update as current truth**: Rewrite documentation to describe the active operational model and constraints, avoiding simple append-only chronologies.

### Recommended Audit Commands

```bash
# Locate the last documentation commits
git log --oneline --decorate -20 -- docs README.md .github/wiki

# View file changes and diff statistics since the last docs update
git diff --name-only <last-doc-commit>..HEAD
git diff --stat <last-doc-commit>..HEAD

# Inspect server, client, database, and test modifications since that commit
git log --name-status <last-doc-commit>..HEAD -- server/src client/src sql tests

# Inspect changes in specific files and subsystems
git log --grep="wigle\|sibling\|visint\|surveillance\|badge\|geospatial" --oneline --all
git log --name-status -- sql/migrations
git log --name-status -- tests
```

### Reference Material

Use these supplemental resources to reconstruct feature updates:

- **`CHANGELOG.md`**: Discover historical feature releases and milestones (note: code/tests remain the final authority).
- **`docs/ai/decisions/`**: Reference Architecture Decision Records (ADRs) to understand design constraints.
- **`docs/ai/sessions/ACTIVE.md`**: Scan recent session status lists for context on active changes.

---

## 5. Lessons Learned Feed & Operational Guardrails

All major findings from previous work and incident post-mortems must be integrated directly into operational guardrails. Future agents must review the active lessons-learned files before making edits:

1. **VISINT Integration Guardrail**: Default pipeline behavior must be a safe preview/no-write option. DDL and database inserts only execute when `commit=true` is explicitly requested by the operator.
2. **WiGLE Coverage Guardrail**: Never treat `rows_inserted` counts as coverage metrics. Progress logs represent import flow, but `stored_count` and coverage mapping tables are the source of truth.
3. **Sibling Undirectedness**: Sibling relationships in database tables and views are undirected; queries and graph traversals must check both endpoints (`bssid1` and `bssid2`) for symmetry.
4. **Sibling Candidates vs. Effective Truth**: Sibling matches remain candidates until validated through confidence metrics and effective override policies.
5. **Documentation Integrity**: Documentation must represent the current state. Do not leave obsolete flags, features, or paths documented alongside new features. Update the body of documentation rather than adding append-only update logs.
6. **Diagram Maintenance**: If a subsystem changes, its Mermaid diagrams in both the repo and `.github/wiki/` must be synchronized to prevent diagram-code drift.
