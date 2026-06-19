# Badge Studio Feature Documentation

Badge Studio is an advanced forensic customization tool that allows analysts to dynamically customize grid table cell badge indicators, HSL/RGB palettes, and column styling rules.

---

## 1. Feature Flag & Access Gating

Badge Studio is gated by the database-backed `badge_studio` runtime feature flag.

- **Config file**: `client/src/components/admin/hooks/useConfigurationFlags.ts`
- **Runtime source**: `GET /api/admin/settings/runtime` returns the flag as `featureFlags.badgeStudio`.
- **Flag definition**: `"Badge Studio"`: `"Enable Badge Studio tools for column badge rendering, palettes, and badge configuration experiments."`
- **UI Mounting**: Rendered inside [AdminPage.tsx](../../client/src/components/AdminPage.tsx) under the `badge-studio` tab content, mapping to [BadgeStudioTab.tsx](../../client/src/components/admin/tabs/BadgeStudioTab.tsx).
- **Explorer behavior**: When the flag is disabled or unavailable, Explorer withholds stored badge configs from both cell rendering and the column chooser. Existing local configurations remain stored and become active again when the flag is enabled.

---

## 2. Configuration Persistence

Badge Studio configuration properties persist client-side.

- **Persistence Method**: Browser `localStorage`
- **Current storage key**: `'shadowcheck.badgeStudio.columnConfigs.v1'` (`BADGE_COLUMN_CONFIGS_STORAGE_KEY` inside `useBadgeConfigs.ts`)
- **Legacy storage key**: `'shadowcheck_badge_column_configs'`; it is migrated to the current key on read when the current key is absent.
- **Key Operations**:
  - `readStoredColumnBadgeConfigs()`: Loads active layouts.
  - `writeStoredColumnBadgeConfigs(configs)`: Persists manual column badge maps.
  - `createFallbackBadgeConfig(column)`: Generates safe defaults for unconfigured columns.

---

## 3. Table Cell Rendering Integration

Badge Studio configurations directly feed into virtualized list rendering pipelines.

- **Grid Integration**: Confirmed in [GeospatialTableContent](../../client/src/components/geospatial/GeospatialTableContent.tsx) and [NetworkTableRow](../../client/src/components/geospatial/table/NetworkTableRow.tsx).
- `GeospatialExplorer` resolves the runtime feature flag and passes `badgeStudioEnabled` to `GeospatialTableContent`.
- When enabled, the table passes stored `badgeConfigs` through the Explorer section and row renderer to `renderNetworkTableCell(context, badgeConfigs)`.
- When disabled, `badgeConfigs` is withheld, so the normal per-column renderers are used and the column chooser does not show active Badge indicators.
- This maps the user-defined HSL color shifts, styles (`solid`, `outlined`, `ghost`, `text-only`), and visibility options per column directly in the explorer tables.

---

## 4. Color Rendering & Rule Matchers

- **Color Utilities**: Pure helper math is encapsulated inside badge renderer utilities:
  - `hexToRgb`, `hexToHsl`, `hslToHex` (for color system swaps)
  - `resolveBadgeColors` (handles outline/ghost/solid layout styling bounds)
  - `autoContrastText` (ensures optimal text readability against dynamic background colors)
- **Rule Evaluators**: Matches cells based on dynamic criteria:
  - Supports condition rules: `any`, `exact`, `range`, `contains`, and `regex`.

---

## 5. Verification Tests

- **Persistence Integrity**: `tests/unit/badgeConfigsPersistence.test.ts`
- **Table Wire Integration**: `tests/unit/networkTableWiring.test.ts`
- **Color Conversion & Matchers**: `tests/unit/badgeRenderer.test.ts`
- **Cell Output Rendering**: `tests/unit/networkTableCellRenderers.test.ts`
