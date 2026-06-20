# Documentation Maintenance & Drift Workflow

This workflow guide ensures project documentation remains a durable, reliable source of truth for developers and AI agents alike.

---

## 0. Existing Work Audit Gate

Before creating or rewriting documentation, complete the read-only [Existing Work Audit](../workflow/EXISTING_WORK_AUDIT.md) and receive scope approval. Search current subsystem docs, ADRs, session notes, generated reports, README indexes, wiki mirrors, and git history first. Update or link the canonical document instead of creating parallel documentation.

---

## 1. Documentation Map by Subsystem

Reference the following documentation files when reviewing changes to respective subsystems:

| Subsystem             | Primary Repo Document                                                                                             | Source files / Databases of Truth                                                                                                                                                                                       |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Testing & Gates**   | [TESTING.md](../TESTING.md) and [TESTING_STANDARDS.md](../workflow/TESTING_STANDARDS.md)                          | [jest.config.js](../../jest.config.js) and [tests/setup.ts](../../tests/setup.ts)                                                                                                                                       |
| **Universal Filters** | [FILTERS.md](../FILTERS.md)                                                                                       | [constants.ts](../../server/src/services/filterQueryBuilder/constants.ts) and [networkFastPathSupplementalPredicates.ts](../../server/src/services/filterQueryBuilder/modules/networkFastPathSupplementalPredicates.ts) |
| **Database Schemas**  | [network-tables.md](../schema/network-tables.md) and [observations-sources.md](../schema/observations-sources.md) | Core migrations (`sql/migrations/` and `sql/baseline_phase3/`)                                                                                                                                                          |
| **Sibling Detection** | [SIBLING_RULESET_ANALYSIS.md](../SIBLING_RULESET_ANALYSIS.md)                                                     | `app.network_siblings_effective` view and [siblingDetectionQueries.ts](../../server/src/services/admin/siblingDetectionQueries.ts)                                                                                      |
| **Badge Studio**      | [badge-studio.md](../features/badge-studio.md)                                                                    | `useBadgeConfigs.ts` and `NetworkTableRow.tsx`                                                                                                                                                                          |
| **Surveillance Gear** | [surveillance-detection.md](../features/surveillance-detection.md)                                                | `app.surveillance_detections` and `surveillanceDetectionRepository.ts`                                                                                                                                                  |
| **WiGLE Import**      | [wigle-import-player.md](../features/wigle-import-player.md)                                                      | `WigleImportRunOrchestrator.ts` and `wigleRequestLedger.ts`                                                                                                                                                             |

---

## 2. Documentation Impact Matrix

Whenever code changes occur, consult this matrix to see if associated documentation must be updated:

```
IF YOU ARE CHANGING:                   THEN YOU MUST UPDATE:
+------------------------+             +--------------------------------------+
| An Express API route   | ------------> | client/src/config/apiTestEndpoints.ts |
| or its parameters      |             | docs/API_REFERENCE.md                |
|                        |             | docs/api/route-inventory.md          |
|                        |             | docs/api/manual-only-endpoints.md    |
+------------------------+             +--------------------------------------+
| An SQL table column,   | ------------> | JSDoc on the query function          |
| view, function, index  |             | docs/schema/network-tables.md        |
+------------------------+             +--------------------------------------+
| A filter predicate key | ------------> | docs/FILTERS.md                      |
| or constant in CJS     |             |                                      |
+------------------------+             +--------------------------------------+
| global jest parameters | ------------> | docs/TESTING.md                      |
| or threshold rules     |             | docs/workflow/TESTING_STANDARDS.md   |
+------------------------+             +--------------------------------------+
```

---

## 3. Drift Verification Checklist

1. **New Route Check**: Ensure all routes in `server/src/api/routes` are registered in `client/src/config/apiTestEndpoints.ts`, documented in `docs/api/route-inventory.md`, and marked in `docs/api/manual-only-endpoints.md` if unsafe for automation:
   ```bash
   grep -rE "router\.(get|post|put|delete|patch)\(" server/src/api/routes/
   ```
2. **New Filter Constants**: Ensure that any new query parameters matches the constant arrays:
   ```bash
   grep -oE "[a-zA-Z0-9]+Filter" server/src/services/filterQueryBuilder/constants.ts | sort -u
   ```
3. **Threshold Check**: Ensure that documented coverage percentages matches the actual threshold defined in `jest.config.js`.

---

## 4. Future Automation Opportunities

To eliminate manual checking, future workstreams should implement the following automation checks in the CI/CD pipeline:

- **Coverage Sync Check**: A lint-level task that reads `jest.config.js` `coverageThreshold` and fails if it mismatch the threshold tables in `docs/TESTING.md`.
- **API Registry Check**: A script that crawls route modules and alerts if any route is missing from `apiTestEndpoints.ts`.

---

## 5. Maintenance Cadence

For a structured view of ShadowCheck's four recurring maintenance lanes, invalidation checklists, and audit prompts for future agents, see the [Maintenance Cadence Guide](maintenance-cadence.md).
