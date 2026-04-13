# Tooltip Audit — Non-Geospatial Pages

**Date:** 2026-04-13  
**Scope:** WiGLE v2 Search Table, WiGLE v3 Enrichment Table, Orphan Recovery Table  
**Reference standard:** Geospatial Explorer (`useMapPopups.ts` → `renderNetworkTooltip.ts`)  
**Status:** Phase 1 complete — implementation proposal ready for approval

---

## TL;DR

All three tables currently have **zero tooltip code**. Rows are either clickable with no tooltip, or not clickable at all. The forensic card infrastructure (`renderNetworkTooltip` + `normalizeTooltipData`) is fully reusable but has one blocker that requires a shim. Data shape compatibility is good across all three tables with minor field aliasing.

---

## 1. How Geospatial Tooltips Work (Reference)

**File:** `client/src/components/geospatial/hooks/useMapPopups.ts`

```
Map layer click event
  → feature.properties (from Mapbox vector layer)
  → normalizeTooltipData({ ...props, lat, lon })   ← field aliasing + defaults
  → renderNetworkTooltip(normalizedData)            ← returns HTML string
  → mapboxgl.Popup.setHTML(html)                   ← Mapbox renders it
```

**Key facts about `renderNetworkTooltip`:**

- Location: `client/src/utils/geospatial/renderNetworkTooltip.ts:185`
- Signature: `renderNetworkTooltip(props: any): string | null`
- Returns: inline-styled HTML string (no CSS classes, fully self-contained)
- All styling is via `style={{}}` attributes — works anywhere, not Mapbox-specific

**Key facts about `normalizeTooltipData`:**

- Location: `client/src/utils/geospatial/tooltipDataNormalizer.ts:78`
- Signature: `normalizeTooltipData(raw: AnyRecord, fallbackPosition?: [number, number])`
- Handles field aliasing aggressively: `trilat/trilong`, `bestlevel`, `firsttime/lasttime`, `wigle_v3_observation_count`, etc.
- Fills all missing fields with safe defaults (NONE threat, 0 score, null coords)
- Returns a canonical object — all fields always present

---

## 2. The One Blocker: `triggerElement` Guard

**File:** `renderNetworkTooltip.ts:185–197`

```typescript
const triggerElement = props?.triggerElement;
if (!triggerElement || !triggerElement.getBoundingClientRect) {
  console.warn('[Tooltip] Trigger element not found or not in DOM.');
  return null; // ← blocks all table callers
}
const rect = triggerElement.getBoundingClientRect();
if (rect.width === 0 || rect.height === 0) {
  return null;
}
// rect is never used again after this point
```

**What it does:** Guards on a DOM element reference. Returns `null` if absent.  
**What it doesn't do:** `rect` is computed but never referenced in the HTML output. The check has zero functional effect on tooltip content — it only gates execution.  
**Why tables fail:** Table rows never pass `triggerElement`, so the function always returns `null`.  
**Cannot modify:** `renderNetworkTooltip.ts` is in the geospatial utils path — read-only.

**Shim:** Pass `event.currentTarget` (the clicked `<tr>` element) as `triggerElement` after normalization:

```typescript
const normalized = normalizeTooltipData(row);
const html = renderNetworkTooltip({ ...normalized, triggerElement: event.currentTarget });
```

This satisfies the guard (the `<tr>` is a live DOM element with valid `getBoundingClientRect`) without touching any protected file.

---

## 3. Call Sites Inventory

| Page                | File                               | Calls `renderNetworkTooltip`? | Row click handler?                                                        |
| ------------------- | ---------------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| Geospatial          | `useMapPopups.ts`                  | ✓ via Mapbox popup            | Map layer click                                                           |
| WiGLE v2 Search     | `WigleSearchTab.tsx:452`           | ✗ none                        | ✗ none — `<tr>` has no onClick                                            |
| WiGLE v3 Enrichment | `V3EnrichmentManagerTable.tsx:251` | ✗ none                        | `onClick={() => onSelect(row.bssid)` (passes BSSID to parent, no tooltip) |
| Orphan Recovery     | `OrphanNetworksPanel.tsx:238`      | ✗ none                        | ✗ none — `<tr>` has no onClick                                            |

All three tables: **no tooltip code whatsoever**. The issue is absence, not malfunction.

---

## 4. Data Shape Compatibility

### 4.1 WiGLE v2 — `WigleNetworkResult`

| Tooltip field                     | Source field                   | Notes                                      |
| --------------------------------- | ------------------------------ | ------------------------------------------ |
| `bssid`                           | `net.netid \|\| net.bssid`     | needs `netid` alias                        |
| `ssid`                            | `net.ssid`                     | ✓ direct                                   |
| `type`                            | `net.type`                     | ✓ direct                                   |
| `encryption` / `capabilities_raw` | `net.encryption`               | ✓ direct                                   |
| `channel`                         | `net.channel`                  | ✓ direct                                   |
| `lat` / `lon`                     | `net.trilat` / `net.trilong`   | normalizer aliases these                   |
| `first_seen`                      | `net.firsttime`                | normalizer aliases                         |
| `last_seen`                       | `net.lasttime`                 | normalizer aliases                         |
| `geocoded_city`                   | `net.city`                     | normalizer aliases                         |
| `geocoded_state`                  | `net.region`                   | normalizer aliases                         |
| `housenumber` / `road`            | `net.housenumber` / `net.road` | ✓ direct                                   |
| `signal`                          | —                              | **missing** — shows `—` in tooltip         |
| `threat_level` / `threat_score`   | —                              | **missing** — defaults to NONE/0           |
| `manufacturer`                    | —                              | **missing** — shows `—`                    |
| `observation_count`               | —                              | **missing** — shows `—`                    |
| `frequency`                       | —                              | **missing** — channel present but not freq |

**Assessment:** Works out of the box via `normalizeTooltipData`. Missing fields render as `—` (expected for WiGLE search results which don't carry our enrichment data). No shim needed.

---

### 4.2 WiGLE v3 Enrichment — `EnrichmentRow`

| Tooltip field                   | Source field       | Notes                                                                                 |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| `bssid`                         | `row.bssid`        | ✓ direct                                                                              |
| `ssid`                          | `row.ssid`         | ✓ direct                                                                              |
| `type`                          | `row.type`         | ✓ direct                                                                              |
| `geocoded_city`                 | `row.city`         | normalizer aliases                                                                    |
| `geocoded_state`                | `row.region`       | normalizer aliases                                                                    |
| `observation_count`             | `row.v3_obs_count` | **needs shim**: normalizer looks for `wigle_v3_observation_count`, not `v3_obs_count` |
| `lat` / `lon`                   | —                  | **missing** — no coordinates in enrichment catalog                                    |
| `signal`                        | —                  | **missing**                                                                           |
| `threat_level` / `threat_score` | —                  | **missing** — defaults to NONE/0                                                      |
| `manufacturer`                  | —                  | **missing**                                                                           |
| `first_seen` / `last_seen`      | —                  | **missing** (`last_v3_import` is import date, not network date)                       |

**Assessment:** One field shim needed — remap `v3_obs_count` → `wigle_v3_observation_count`:

```typescript
normalizeTooltipData({ ...row, wigle_v3_observation_count: row.v3_obs_count });
```

---

### 4.3 Orphan Recovery — `OrphanNetworkRow`

| Tooltip field                         | Source field                     | Notes                                                                     |
| ------------------------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| `bssid`                               | `row.bssid`                      | ✓ direct                                                                  |
| `ssid`                                | `row.ssid`                       | ✓ direct                                                                  |
| `type`                                | `row.type`                       | ✓ direct                                                                  |
| `frequency`                           | `row.frequency`                  | ✓ direct                                                                  |
| `capabilities_raw`                    | `row.capabilities`               | normalizer aliases `raw.capabilities`                                     |
| `signal`                              | `row.bestlevel`                  | normalizer includes `bestlevel` in pickFirst                              |
| `observation_count`                   | `row.wigle_v3_observation_count` | normalizer aliases directly                                               |
| `unique_days`                         | `row.unique_days`                | ✓ direct                                                                  |
| `lat` / `lon`                         | `row.bestlat` / `row.bestlon`    | **needs shim**: normalizer looks for `lat/latitude/trilat`, not `bestlat` |
| `threat_level` / `threat_score`       | —                                | **missing** — defaults to NONE/0                                          |
| `manufacturer`                        | —                                | **missing**                                                               |
| `geocoded_address` / `city` / `state` | —                                | **missing**                                                               |

**Assessment:** One coordinate shim needed:

```typescript
normalizeTooltipData({ ...row, lat: row.bestlat, lon: row.bestlon });
```

---

## 5. Rendering Mechanism for Tables

Geospatial uses Mapbox `popup.setHTML()`. Tables need an alternative.

**Chosen approach: Inline row expansion**

When a row is clicked, insert a full-width `<tr>` immediately below it containing the tooltip HTML rendered via `dangerouslySetInnerHTML`. Close on second click of the same row or on any other row click.

```tsx
const [activeTooltip, setActiveTooltip] = useState<{ bssid: string; html: string } | null>(null);

const handleRowClick = (row: RowType, event: React.MouseEvent<HTMLTableRowElement>) => {
  if (activeTooltip?.bssid === row.bssid) {
    setActiveTooltip(null);
    return;
  }
  const normalized = normalizeTooltipData({ ...rowToProps(row) });
  const html = renderNetworkTooltip({ ...normalized, triggerElement: event.currentTarget });
  if (html) setActiveTooltip({ bssid: row.bssid, html });
};

// In the table body, after each data row:
{
  activeTooltip?.bssid === row.bssid && (
    <tr>
      <td colSpan={N} style={{ padding: '0 12px 12px', background: 'transparent', border: 'none' }}>
        <div dangerouslySetInnerHTML={{ __html: activeTooltip.html }} />
      </td>
    </tr>
  );
}
```

**Why this approach:**

- No CSS positioning needed — expands inline, no overflow clipping issues
- Tooltip HTML is 100% self-contained (all inline styles)
- Works within scrollable table containers
- Toggle behavior matches standard UX (click opens, click again closes)
- Zero new dependencies

---

## 6. Implementation Proposal

**Approach: Direct reuse with per-table shims**

No adapter layer, no new abstractions. Each table independently adds:

1. `useState` for active tooltip
2. `onClick` on `<tr>` → `normalizeTooltipData` shim + `renderNetworkTooltip` call
3. Conditional `<tr>` for tooltip expansion below active row

**Per-table changes:**

| Table    | File                           | Lines changed (est.) | Shim needed                                       |
| -------- | ------------------------------ | -------------------- | ------------------------------------------------- |
| WiGLE v2 | `WigleSearchTab.tsx`           | ~20                  | `netid → bssid` alias (already present in render) |
| WiGLE v3 | `V3EnrichmentManagerTable.tsx` | ~20                  | `v3_obs_count → wigle_v3_observation_count`       |
| Orphan   | `OrphanNetworksPanel.tsx`      | ~20                  | `bestlat/bestlon → lat/lon`                       |

**Imports needed in each file (no protected files):**

```typescript
import { renderNetworkTooltip } from '../../../../utils/geospatial/renderNetworkTooltip';
import { normalizeTooltipData } from '../../../../utils/geospatial/tooltipDataNormalizer';
```

These are utility imports, not Geospatial component imports — no boundary violation.

**What the tooltip will show per table:**

| Field           | WiGLE v2                 | WiGLE v3             | Orphan              |
| --------------- | ------------------------ | -------------------- | ------------------- |
| SSID            | ✓                        | ✓                    | ✓                   |
| BSSID           | ✓                        | ✓                    | ✓                   |
| Threat badge    | NONE (no enrichment)     | NONE                 | NONE                |
| Signal          | —                        | —                    | ✓ (bestlevel)       |
| Channel/Freq    | ✓ (channel only)         | —                    | ✓ (frequency)       |
| Encryption      | ✓                        | —                    | ✓ (capabilities)    |
| Observations    | —                        | ✓ (v3_obs_count)     | ✓                   |
| Location        | ✓ (coords + city/region) | ✓ (city/region only) | ✓ (bestlat/bestlon) |
| First/Last Seen | ✓ (firsttime/lasttime)   | —                    | —                   |

---

## 7. Decision Required Before Phase 2

**Approved approach:** Direct reuse with per-table shims (Option A)

Questions for approval:

1. **Rendering placement** — inline row expansion (`<tr>` below clicked row) vs. fixed side panel?  
   Recommendation: inline expansion — simplest, no positioning math.

2. **Tooltip close behavior** — click same row again to close, OR close button inside card?  
   Recommendation: click same row toggles; the tooltip card already has a drag handle but no close button for table use — add a simple ✕ to the outer wrapper.

3. **V3 Enrichment table** — rows currently call `onSelect(row.bssid)` on click, which navigates/highlights the network elsewhere in the parent. Should row click show tooltip AND call onSelect, or replace onSelect with tooltip?  
   Recommendation: tooltip only (the `onSelect` currently does nothing visible without separate investigation).

4. **Branch** — create `feature/tooltip-alignment` before Phase 2 begins?  
   Recommendation: yes, per the plan.

---

## 8. Pre-existing Test Failures (Not Related to This Work)

Two test suites were failing before this session began:

- `tooltipDataNormalizer.test.ts` — 3 failures (signal alias, stingray color, BLE radio codes)
- `networkFastPathPredicates.test.ts` — 1 failure (unsupported WiGLE filter)

These are independent of the tooltip rendering changes planned here. They should be triaged separately. The normalizer failures are particularly relevant — if the normalizer has bugs for signal/BLE, those will surface in orphan and WiGLE row tooltips too.

---

## 9. Files That Will Be Modified (Phases 2–4)

```
client/src/components/admin/tabs/WigleSearchTab.tsx
client/src/components/admin/tabs/data-import/V3EnrichmentManagerTable.tsx
client/src/components/admin/tabs/data-import/OrphanNetworksPanel.tsx
```

**Files that will NOT be modified:**

```
client/src/utils/geospatial/renderNetworkTooltip.ts   ← read-only
client/src/utils/geospatial/tooltipDataNormalizer.ts  ← read-only
client/src/components/geospatial/**                   ← read-only
```
