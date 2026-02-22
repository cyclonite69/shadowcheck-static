# Rule-Based Threat Scoring Audit

**Date:** 2026-02-22
**Author:** Claude Code
**Scope:** `server/src/api/routes/v1/networks/list.ts`, `server/src/services/filterQueryBuilder/sqlExpressions.ts`, `server/src/services/` scoring pipeline

---

## 1. Score Flow Overview

```
Raw observation data (app.observations)
        │
        ▼
ETL threat scoring engine  (etl/promote/run-scoring.js)
        │
        ├── rule_based_score  ← deterministic rule weights
        ├── ml_threat_score   ← ML model output (optional)
        │
        ▼
app.network_threat_scores  (stored pre-computed values)
  ├── rule_based_score
  ├── ml_threat_score
  ├── final_threat_score   ← blended result at scoring time
  ├── final_threat_level   ← CRITICAL/HIGH/MED/LOW/NONE at scoring time
  └── ml_feature_values    ← JSONB: rule_score, ml_score, evidence_weight, ml_boost

Runtime query (list.ts)
  ├── threatScoreExpr    ← inline COALESCE/CASE blending formula
  └── threatLevelExpr    ← inline CASE on threatScoreExpr thresholds
```

Threat tags (`app.network_tags.threat_tag`) modify the final score at query time:

- `FALSE_POSITIVE` → score forced to 0, level forced to `NONE`
- `INVESTIGATE` → score preserved as-is; level uses stored `final_threat_level`
- `THREAT` / default → blended: `score*0.7 + confidence*100*0.3`

---

## 2. SQL Expressions: Inventory

### 2.1 Canonical (sqlExpressions.ts)

**Location:** `server/src/services/filterQueryBuilder/sqlExpressions.ts`

```sql
-- THREAT_SCORE_EXPR
app.get_threat_score(
  nts.rule_based_score,
  nts.ml_threat_score,
  nt.threat_tag,
  nt.threat_confidence
)

-- THREAT_LEVEL_EXPR (uses THREAT_SCORE_EXPR internally)
CASE
  WHEN nt.threat_tag = 'FALSE_POSITIVE' THEN 'NONE'
  WHEN nt.threat_tag = 'INVESTIGATE'    THEN COALESCE(nts.final_threat_level, 'NONE')
  ELSE
    CASE
      WHEN (score) >= 80 THEN 'CRITICAL'
      WHEN (score) >= 60 THEN 'HIGH'
      WHEN (score) >= 40 THEN 'MED'
      WHEN (score) >= 20 THEN 'LOW'
      ELSE 'NONE'
    END
END
```

`app.get_threat_score()` is a PostgreSQL function that reads the `ml_blending_enabled` setting and either returns `rule_based_score` alone or blends `rule_based * (1-weight) + ml * weight`.

### 2.2 Inline (list.ts)

**Location:** `server/src/api/routes/v1/networks/list.ts` (lines 348–370)

```sql
-- threatScoreExpr (inline)
COALESCE(
  CASE
    WHEN nt.threat_tag = 'FALSE_POSITIVE' THEN 0
    WHEN nt.threat_tag = 'INVESTIGATE'    THEN COALESCE(nts.final_threat_score, 0)::numeric
    WHEN nt.threat_tag = 'THREAT'         THEN (nts.final_threat_score * 0.7 + nt.threat_confidence * 100 * 0.3)
    ELSE                                       (nts.final_threat_score * 0.7 + nt.threat_confidence * 100 * 0.3)
  END,
  0
)

-- threatLevelExpr (inline, mirrors THREAT_LEVEL_EXPR thresholds but uses inline score)
CASE
  WHEN nt.threat_tag = 'FALSE_POSITIVE' THEN 'NONE'
  WHEN nt.threat_tag = 'INVESTIGATE'    THEN COALESCE(nts.final_threat_level, 'NONE')
  ELSE
    CASE
      WHEN (threatScoreExpr) >= 80 THEN 'CRITICAL'
      WHEN (threatScoreExpr) >= 60 THEN 'HIGH'   -- note: 60, not 70
      WHEN (threatScoreExpr) >= 40 THEN 'MED'
      WHEN (threatScoreExpr) >= 20 THEN 'LOW'
      ELSE 'NONE'
    END
END
```

---

## 3. Filter Locations

| Filter parameter    | WHERE predicate                                   | Expression used          |
| ------------------- | ------------------------------------------------- | ------------------------ |
| `threat_level`      | `(threatLevelExpr) = $N`                          | inline `threatLevelExpr` |
| `threat_categories` | `(threatLevelExpr) = ANY($N::text[])`             | inline `threatLevelExpr` |
| `threat_score_min`  | `(threatScoreExpr) >= $N`                         | inline `threatScoreExpr` |
| `threat_score_max`  | `(threatScoreExpr) <= $N`                         | inline `threatScoreExpr` |
| `threat` (sort)     | `CASE (threatLevelExpr) WHEN 'CRITICAL' THEN 4 …` | inline `threatLevelExpr` |

All filter predicates consistently use the **inline** expressions. ✓

---

## 4. Identified Duplication Risks

### 4.1 Two Score Formulas

| Aspect            | Canonical (sqlExpressions.ts)          | Inline (list.ts)                                                                 |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| Score computation | `app.get_threat_score()` DB function   | `final_threat_score * 0.7 + confidence * 100 * 0.3`                              |
| ML blending       | Respects `ml_blending_enabled` setting | Always blends with `final_threat_score` (which was computed with ML at ETL time) |
| Input columns     | `rule_based_score`, `ml_threat_score`  | `final_threat_score` (already-blended ETL output)                                |
| Maintainability   | Single place to change                 | Must update list.ts AND sqlExpressions.ts separately                             |

The inline formula uses `final_threat_score` as its score input, which is the ETL-blended output. This means at runtime it further blends an already-blended value with `threat_confidence`. This is semantically different from the canonical formula which blends the raw components.

### 4.2 Display vs. Filter Mismatch (Fixed in this commit)

**Before fix:** `selectColumns` returned `nts.final_threat_level` (stored ETL value) while the WHERE clause used `(threatLevelExpr)` (live computed). A network whose ETL-stored level was `CRITICAL` but whose live formula produced `HIGH` would appear in a CRITICAL filter but display as CRITICAL — misleading the user.

**After fix:** Both SELECT and WHERE now use `(${threatLevelExpr}) AS final_threat_level`, ensuring the displayed level is always the same value that determined whether the row was included. Same change applied to `final_threat_score`.

### 4.3 Threshold Discrepancy

The `THREAT_SCORE_EXPR` in sqlExpressions.ts (used by filterQueryBuilder) and the inline `threatScoreExpr` in list.ts share the same level thresholds (80/60/40/20). However, the **score inputs differ** as noted in §4.1. In practice this means two different features of the app (the v2 filtered endpoint vs. the v1 list endpoint) may assign different levels to the same network.

---

## 5. Simplification Proposal

### Option A: Adopt `app.get_threat_score()` everywhere (Recommended)

Replace the inline `threatScoreExpr` with `THREAT_SCORE_EXPR('nts', 'nt')` from sqlExpressions.ts. This reduces duplication to a single place and makes ML blending consistent.

**Trade-off:** Requires importing the expression builder into list.ts; adds one more function to the `filterQueryBuilder` container export.

### Option B: Inline simple rule-only formula behind feature flag

Add a `simple_rule_scoring_enabled` config flag (see §6). When enabled, use:

```sql
COALESCE(
  CASE
    WHEN nt.threat_tag = 'FALSE_POSITIVE' THEN 0
    WHEN nt.threat_tag = 'INVESTIGATE'    THEN COALESCE(nts.rule_based_score, 0)::numeric
    ELSE COALESCE(nts.rule_based_score, 0)::numeric
  END,
  0
)
```

This ignores ML blending entirely and uses only the deterministic rule score. Useful for debugging and for environments without ML training data.

### Option C: Store computed level in SELECT, keep WHERE aligned

Current post-fix state (this commit). Both SELECT and WHERE use the same inline expression. Simpler than A, no new imports. Duplication remains but is internally consistent.

---

## 6. Migration Plan

**Phase 1 (this commit):** Fix display/filter alignment — done.

**Phase 2:** Add `simple_rule_scoring_enabled` feature flag (task 4 of this audit).

**Phase 3 (future):** Extract inline expressions into `sqlExpressions.ts`:

1. Add `LIST_THREAT_SCORE_EXPR(ntsAlias, ntAlias)` to `sqlExpressions.ts` that uses `final_threat_score` (the ETL-blended value) with confidence blending — making the list.ts inline approach canonical.
2. OR deprecate the inline approach and migrate list.ts to use `THREAT_SCORE_EXPR` (app.get_threat_score), requiring a DB function update to accept `final_threat_score` as input.
3. Add integration tests that compare level values from v1 `/api/networks` and v2 `/api/v2/networks/filtered` for the same network.

**Phase 4 (future):** Audit the ETL scoring engine to confirm `final_threat_score` stored values align with what live computation would produce. Add a scheduled consistency check.

---

## 7. Appendix: Scoring Rule Weights

From ETL documentation and observed scoring behavior:

| Rule                            | Weight            |
| ------------------------------- | ----------------- |
| Seen at home AND away           | +40 pts           |
| Distance range > 200 m          | +25 pts           |
| Multiple unique days (2-4 days) | +5 pts            |
| Multiple unique days (5+ days)  | +15 pts           |
| Observation count (5-9)         | +5 pts            |
| Observation count (10+)         | +10 pts           |
| Threat threshold                | ≥ 40 points total |

ML blending (when enabled): `final = rule * (1 - weight) + ml * weight`
Default ML weight is read from the `ml_blending_enabled` / `ml_blend_weight` settings.
