# Badge Studio Feature Documentation

Badge Studio is an advanced forensic customization tool that allows analysts to dynamically customize grid table cell badge indicators, HSL/RGB palettes, and column styling rules.

---

## 1. Feature Flag & Access Gating

Badge Studio is gated under a central database-backed feature flag structure.

- **Config file**: `client/src/components/admin/hooks/useConfigurationFlags.ts`
- **Flag Definition**: `"Badge Studio"`: `"Enable Badge Studio tools for column badge rendering, palettes, and badge configuration experiments."`
- **UI Mounting**: Rendered inside [AdminPage.tsx](../../client/src/components/AdminPage.tsx) under the `badge-studio` tab content, mapping to [BadgeStudioTab.tsx](../../client/src/components/admin/tabs/BadgeStudioTab.tsx).

---

## 2. Configuration Persistence

Badge Studio configuration properties persist client-side.

- **Persistence Method**: Browser `localStorage`
- **Storage Key**: `'shadowcheck_badge_column_configs'` (aliased as `BADGE_COLUMN_CONFIGS_STORAGE_KEY` inside `useBadgeConfigs.ts`)
- **Key Operations**:
  - `readStoredColumnBadgeConfigs()`: Loads active layouts.
  - `writeStoredColumnBadgeConfigs(configs)`: Persists manual column badge maps.
  - `createFallbackBadgeConfig(column)`: Generates safe defaults for unconfigured columns.

---

## 3. Table Cell Rendering Integration

Badge Studio configurations directly feed into virtualized list rendering pipelines.

- **Grid Integration**: Confirmed in [NetworkTableRow](../../client/src/components/explorer/NetworkTableRow.tsx).
- The parent grid extracts stored `badgeConfigs` and passes them to `renderNetworkTableCell(column, value, configs)`.
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
