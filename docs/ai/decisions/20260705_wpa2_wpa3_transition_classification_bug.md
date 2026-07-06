# ADR-20260705-001: WPA2/WPA3 Transition Classification Bug in SECURITYFROMCAPS_EXPR

**Date:** 2026-07-05
**Status:** Open — ticket filed, not yet implemented
**Scope:** `SECURITYFROMCAPS_EXPR` in `app.api_network_explorer_mv` (and any migration
or view that duplicates this CASE expression)

---

## Context

The materialized view `app.api_network_explorer_mv` computes a `security` column via a
CASE expression that inspects `n.capabilities` to classify each network's security posture.
The expression currently evaluates WPA3/SAE capability strings **before** WPA2/RSN checks:

```sql
-- Current order (incorrect for transition APs)
WHEN UPPER(n.capabilities) ~ 'RSN-SAE' THEN 'WPA3-P'
WHEN UPPER(n.capabilities) ~ '(WPA3|SAE)' THEN 'WPA3'
WHEN UPPER(n.capabilities) ~ '(WPA2|RSN)' AND UPPER(n.capabilities) ~ '(EAP|MGT)' THEN 'WPA2-E'
WHEN UPPER(n.capabilities) ~ '(WPA2|RSN)' THEN 'WPA2'
```

A WPA2/WPA3 transition access point advertises **both** PSK (WPA2) and SAE (WPA3) in its
capabilities string — for example:

```
[WPA2-PSK-CCMP][RSN-SAE-CCMP][ESS]
```

Because `RSN-SAE` fires first, this AP is classified as `WPA3-P` (WPA3-Personal). That
overstates its security posture.

## Problem

A WPA2/WPA3 transition AP is only as secure as its weakest accepted handshake. A WPA2
client can still associate using a PSK handshake — the AP explicitly negotiates down to
WPA2. Classifying it as WPA3 implies WPA2-equivalent security has been eliminated, which
is false.

If `security` downstream is used in:

- `final_threat_score` heuristics that treat WPA3 as "safe" (lower threat weight)
- Analyst filters on `security = 'WPA3-P'` to find WPA3-only networks
- Reporting that aggregates WPA3 coverage as a security metric

…then a pool of transition APs will be systematically misclassified as higher-security
than they are.

## Root Cause

The CASE expression evaluates in the wrong dimension order. It is security-token-aware
but **transition-unaware**: it does not check whether both WPA2 and WPA3 tokens coexist
before emitting a label.

## Decision

Do not fix inline during the active modularization contract (Stage 1). File as a
data-correctness ticket against `SECURITYFROMCAPS_EXPR`. When addressed:

**Option A — Transition guard (preferred):** Add an explicit check for the WPA2+SAE
co-presence before either individual branch fires:

```sql
-- Proposed insertion point (before WPA3-P and WPA3 branches):
WHEN UPPER(n.capabilities) ~ '(WPA2|RSN)' AND UPPER(n.capabilities) ~ '(RSN-SAE|SAE)' THEN 'WPA2/WPA3-TRANSITION'
WHEN UPPER(n.capabilities) ~ 'RSN-SAE' THEN 'WPA3-P'
WHEN UPPER(n.capabilities) ~ '(WPA3|SAE)' THEN 'WPA3'
```

This emits a distinct `WPA2/WPA3-TRANSITION` category rather than collapsing to either
parent label. Downstream threat heuristics should treat this as WPA2-equivalent risk
until the AP is confirmed WPA3-only.

**Option B — WPA2 precedence:** Evaluate WPA2 branches first. Any capability string
containing `WPA2|RSN` is classified WPA2 or WPA2-E regardless of SAE presence. Simpler,
but loses the explicit signal that the AP is a transition device.

Option A is preferred because it preserves forensic fidelity: an analyst can explicitly
query for transition APs rather than having them silently lumped into WPA2.

## Migration Scope

The CASE expression appears in multiple places. Any fix must be applied consistently:

- `sql/migrations/20260507_fix_mv_ble_exclusion.sql` (live, most recent)
- `sql/baseline_phase3/baseline_005_analysis_views_materialized_views.sql`
- `sql/baseline_phase3/baseline_006_indexes_grants_defaults.sql`

All are the same expression. The migration that redefines the MV should carry the fix
forward; baseline files should be updated to match so fresh rebuilds are also correct.

After fix, `app.api_network_explorer_mv` must be refreshed (concurrent refresh is safe
in production; trigger via `mvRefresh` job or directly via `adminDbService`).

## Test Coverage Required

A regression test must validate the transition case before the fix lands:

```typescript
// tests/unit/securityClassification.test.ts
test('WPA2+SAE transition AP classifies as WPA2/WPA3-TRANSITION, not WPA3-P', () => {
  const caps = '[WPA2-PSK-CCMP][RSN-SAE-CCMP][ESS]';
  expect(classifySecurityFromCaps(caps, 'W')).toBe('WPA2/WPA3-TRANSITION');
});
test('SAE-only AP classifies as WPA3-P', () => {
  const caps = '[RSN-SAE-CCMP][ESS]';
  expect(classifySecurityFromCaps(caps, 'W')).toBe('WPA3-P');
});
```

If the CASE expression is extracted into a TypeScript function before this is fixed, the
test can be written against that function. If it remains pure SQL, a certification-style
test against the live DB is acceptable.

## Alternatives Considered

- **Ignore as cosmetic** — rejected. If threat scoring weights WPA3 differently than
  WPA2, this directly affects `final_threat_score` output and analyst decisions.
- **Add a note in the MV comment** — rejected. Comments don't prevent misclassification.
- **Fix inline as a quick patch** — deferred. This session is committed to Stage 1
  modularization. A capabilities-classification change warrants its own migration,
  its own test, and its own review cycle.

## Related

- ADR-20260705-002: BLE/OPEN conflation bug (same root class — wrong evaluation order)
- `sql/migrations/20260507_fix_mv_ble_exclusion.sql` — previous BLE exclusion work
- `docs/ai/sessions/ACTIVE.md` — active session state
