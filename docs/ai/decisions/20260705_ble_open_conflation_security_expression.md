# ADR-20260705-002: BLE/OPEN Conflation Bug in SECURITYFROMCAPS_EXPR

**Date:** 2026-07-05
**Status:** Partially mitigated — `type = 'E'` guard exists in live migration; root cause
documented for complete resolution
**Scope:** `SECURITYFROMCAPS_EXPR` in `app.api_network_explorer_mv`

---

## Context

The `security` CASE expression in `app.api_network_explorer_mv` evaluates WiFi capability
strings to classify network security. BLE (Bluetooth Low Energy) beacons observed via
WiGLE have a `type` of `'E'` and typically carry empty or non-WiFi capability strings.

An open WiFi access point (`type = 'W'`) with no capabilities advertised also produces
an empty or `[ESS]`-only capability string, which the expression maps to `OPEN`.

Without a radio-type gate, both cases would fall through to the same `OPEN` bucket:

```sql
-- Without type guard: both empty-caps BLE and empty-caps WiFi → OPEN
WHEN COALESCE(n.capabilities, '') = '' THEN 'OPEN'
```

## Current State (Live Migration)

As of `sql/migrations/20260507_fix_mv_ble_exclusion.sql`, the expression includes type
guards at the top of the CASE:

```sql
WHEN n.type = 'E' THEN 'BLE'
WHEN n.type = 'B' THEN 'BT'
WHEN n.capabilities ~ ';10$' THEN 'BLE'
WHEN UPPER(n.capabilities) IN ('MISC', 'UNCATEGORIZED') THEN 'BT'
-- WiFi capability strings start here
WHEN COALESCE(n.capabilities, '') = '' THEN 'OPEN'
```

This correctly separates `type = 'E'` from the WiFi branch. However, the mitigation
relies entirely on WiGLE populating `n.type` correctly. The root cause — that the
expression is not explicitly radio-type-aware throughout — remains:

1. **Type = 'W' not asserted** before WiFi branches. The CASE proceeds to WiFi checks
   only by elimination (`type != 'E'` and `type != 'B'` have already fired), not by
   explicit `type = 'W'` assertion. An LTE record (`type = 'L'`) or 5G NR record
   (`type = 'N'`) with an empty capabilities string would still fall through to `OPEN`.

2. **Capabilities-based BLE detection is fragile.** The `capabilities ~ ';10$'` pattern
   depends on WiGLE's internal class code encoding. If WiGLE changes its export format
   or if the field is NULL vs empty, BLE records may slip through to the WiFi branch.

3. **Non-WiFi radio types without a type guard.** Types `L` (LTE), `N` (5G NR), `G` (GSM)
   are not explicitly handled. They currently reach the WiFi CASE branch and will
   classify as `OPEN` if their capabilities string is empty.

## Root Cause

The expression evaluates in the wrong dimension order: it is security-token-aware before
it is radio-type-aware. The correct hierarchy is:

```
radio type → security capabilities
```

Not:

```
BLE/BT shortcircuits → WiFi security checks (with silent fall-through for other types)
```

## Decision

Do not rework during the active modularization contract (Stage 1). This is the same
root-cause class as ADR-20260705-001 (wrong evaluation order / missing dimension) and
should be fixed in the same work session.

**Recommended fix:** Assert `n.type = 'W'` explicitly before the WiFi capability checks,
and add explicit ELSE branches for remaining radio types:

```sql
CASE
  -- Radio type gate: classify non-WiFi types first, unconditionally
  WHEN n.type = 'E' THEN 'BLE'
  WHEN n.type = 'B' THEN 'BT'
  WHEN n.type IN ('L', 'N', 'G') THEN 'CELLULAR'
  -- Capabilities-based BLE fallback (for rows where type is NULL or mislabeled)
  WHEN n.capabilities ~ ';10$' THEN 'BLE'
  WHEN UPPER(n.capabilities) IN ('MISC', 'UNCATEGORIZED') THEN 'BT'
  -- WiFi: only reached for type = 'W' or type IS NULL with WiFi-shaped caps
  WHEN n.type = 'W' AND COALESCE(n.capabilities, '') = '' THEN 'OPEN'
  WHEN n.type = 'W' AND UPPER(n.capabilities) LIKE '%WEP%' THEN 'WEP'
  -- ... etc
  -- Fallback for unexpected type + capabilities combinations
  ELSE 'UNKNOWN'
END AS security
```

This makes the radio-type → security pipeline explicit rather than relying on the BLE/BT
short-circuit at the top. A `type = 'L'` record with empty capabilities would now produce
`CELLULAR` rather than `OPEN`.

## Downstream Impact

If `security = 'OPEN'` is used in threat scoring (e.g., open WiFi is a higher-risk signal
than BLE beacon), BLE records that slip through to `OPEN` will accumulate false positive
threat signals. The `20260507_fix_mv_ble_exclusion.sql` migration reduced this risk but
did not eliminate it for non-WiFi, non-BLE/BT types.

## Test Coverage Required

Regression tests before any fix:

```typescript
test('BLE type=E with empty caps classifies as BLE, not OPEN', () => {
  expect(classifySecurityFromCaps('', 'E')).toBe('BLE');
});
test('WiFi type=W with empty caps classifies as OPEN', () => {
  expect(classifySecurityFromCaps('', 'W')).toBe('OPEN');
});
test('LTE type=L with empty caps does not classify as OPEN', () => {
  const result = classifySecurityFromCaps('', 'L');
  expect(result).not.toBe('OPEN');
  expect(result).toBe('CELLULAR');
});
```

## Fix Timing

Fix alongside ADR-20260705-001. Both require the same migration (redefine the
`SECURITYFROMCAPS_EXPR` CASE block), the same test file, and the same MV refresh cycle.
Combining them into one migration is more efficient and avoids a two-step MV rebuild in
production.

## Related

- ADR-20260705-001: WPA2/WPA3 transition classification bug (same root class)
- `sql/migrations/20260507_fix_mv_ble_exclusion.sql` — partial mitigation (BLE type guard)
- `docs/ai/sessions/ACTIVE.md` — active session state
- Network types: `W` (WiFi), `E` (BLE), `B` (Bluetooth), `L` (LTE), `N` (5G NR), `G` (GSM)
