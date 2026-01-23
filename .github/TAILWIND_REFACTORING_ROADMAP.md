# ShadowCheck Tailwind CSS Refactoring Roadmap

## Executive Summary

Systematic refactoring of React component styling from hardcoded CSS to Tailwind utility-first approach.

**Status**: Phase 1 ✅ Complete | Phase 2 📋 Ready to Start

---

## Phase 1: Foundation ✅ (COMPLETE)

**Commits**:

- `bc0a7de` — Cursor rules + core component refactors
- `07079cd` — Phase 1 completion summary
- `7f87d52` — Phase 2 roadmap

**What Was Done**:

- Fixed PostCSS/Tailwind v4 compatibility
- Optimized safelist (50 classes → 1 pattern)
- Removed unused CSS components
- Refactored 4 major components (AdminPage, FilterPanel, MLTrainingPage, KeplerTestPage)
- Added semantic z-index tokens
- Created comprehensive Cursor rules (496 lines)

**Files Changed**: 10 files | 583 insertions | 221 deletions

**Build Status**: ✅ Lint Pass | ✅ Build Pass | ✅ CSS Optimized (17K)

**Documentation**:

- `.cursor/rules/tailwind-css-refactoring.md` — Complete refactoring guide
- `docs/TAILWIND_REFACTORING_COMPLETE.md` — Phase 1 summary
- `.github/PHASE2_TAILWIND_REFACTORING.md` — Phase 2 instructions

---

## Phase 2: Extended Refactoring 📋 (READY)

**Components to Refactor** (in order):

1. `DashboardPage.tsx` — Metric cards, dashboard layout
2. `AnalyticsPage.tsx` — Chart panels, visualizations
3. `GeospatialIntelligencePage.tsx` — Map panels, sidebars
4. `NetworksExplorer.tsx` — Table and list styling
5. `ThreatsExplorer.tsx` — Alerts and badges

**Estimated Effort**: 2-4 hours total (30-45 min per component)

**How to Proceed**:

1. Open `.cursor/rules/tailwind-css-refactoring.md`
2. Open `.github/PHASE2_TAILWIND_REFACTORING.md`
3. Pick a component
4. Use the Codex prompt template
5. Test & commit

**Testing Required**:

```bash
npm run lint
npm run build
ls -lh dist/assets/index-*.css
```

---

## Phase 3: Polish (FUTURE)

- Standardize remaining arbitrary color classes
- Ensure consistent shadow usage across app
- Create component styling guide
- Add Tailwind plugin for custom animations

---

## Key Resources

### For Developers

Reference Guide: `.cursor/rules/tailwind-css-refactoring.md`

- Color conversion cheatsheet
- Common refactoring patterns
- When to extract to custom CSS
- Testing procedures

Working Examples:

- `src/components/AdminPage.tsx` — Hex → Tailwind conversion
- `src/components/MLTrainingPage.tsx` — Gradient extraction
- `src/components/KeplerTestPage.tsx` — Shadow/border refactor
- `src/components/FilterPanel.tsx` — Responsive widths

Project Setup:

- `tailwind.config.js` — Palette, z-index tokens, safelist
- `postcss.config.js` — Tailwind v4 plugin (must use @tailwindcss/postcss)
- `src/index.css` — CSS variables, custom classes, @layer components

### For AI Assistants (Cursor/Claude)

Cursor Rules: `.cursor/rules/tailwind-css-refactoring.md`

- 496 lines of project-specific guidance
- Constraints and gotchas documented
- Template prompt included for easy reuse

Critical Constraints:

- ⚠️ Tailwind v4 requires @tailwindcss/postcss plugin (NOT tailwindcss)
- ⚠️ DO NOT run npm run format (reformats unrelated files)
- ⚠️ Do NOT change component logic or HTML structure
- ✅ CommonJS config files (not ESM)
- ✅ React components are ESM/TSX

---

## Quick Start for Phase 2

### Option A: Manual (Recommended First Pass)

```bash
# Pick a component from Phase 2 list
# Reference .cursor/rules/tailwind-css-refactoring.md Rule 5 (Color Cheatsheet)
# Open component in editor
# Replace inline styles with Tailwind utilities
# Test before committing
```

### Option B: Use Cursor Codex (Faster)

```
Use template prompt from .cursor/rules/tailwind-css-refactoring.md
Reference @src/components/AdminPage.tsx as example
Let Codex handle the conversion
Test results before committing
```

---

## Metrics & Goals

### Phase 1 Results

| Metric                 | Value                  |
| ---------------------- | ---------------------- |
| CSS Bundle Size        | 17K (stable)           |
| Safelist Reduction     | 50 classes → 1 pattern |
| Components Refactored  | 4 major                |
| Custom Classes Removed | 3 unused               |
| Z-Index Tokens Added   | 2 (dropdown, modal)    |
| Documentation Lines    | 496 (Cursor rules)     |

### Phase 2 Goals

| Goal                  | Target  |
| --------------------- | ------- |
| Components Refactored | 5 more  |
| CSS Bundle Size       | ≤ 17K   |
| Lint Status           | ✅ Pass |
| Build Status          | ✅ Pass |
| Visual Regressions    | 0       |

---

## Testing Checklist

Before Each Commit:

- npm run lint passes
- npm run build succeeds
- CSS bundle size checked
- Visual appearance verified in browser
- No new console errors
- Accessibility attributes preserved

After Merge:

- No reports of styling issues
- Dark mode renders correctly
- Responsive behavior intact
- All interactive components work

---

## Known Issues & Limitations

### Resolved in Phase 1 ✅

- Hardcoded z-index values (999999, 100000) → Semantic tokens
- Bloated safelist (50 classes) → Pattern-based
- Unused custom CSS → Removed
- PostCSS plugin mismatch → Fixed for v4

### Remaining (Phase 2+)

- Tooltip HTML strings still inline (risky to refactor)
  - Reason: Tailwind won't process classes in template strings
  - Workaround: Extract tooltip to separate component later
- Some components (AnalyticsPage, DashboardPage) still have hardcoded styles
  - Will be addressed in Phase 2

---

## Support & Questions

For styling issues: Reference .cursor/rules/tailwind-css-refactoring.md Rule 10

For component-specific help:

- Check working examples in Phase 1
- Reference color cheatsheet in Cursor rules
- Test changes with npm run build

For refactoring blockers:

- Consult "Rule 6: What NOT to Refactor"
- Use "Rule 8: Common Scenarios"
- Ask before modifying component logic

---

## Timeline

| Phase   | Status      | Commits | Date       |
| ------- | ----------- | ------- | ---------- |
| Phase 1 | ✅ Complete | 3       | 2026-01-23 |
| Phase 2 | 📋 Ready    | —       | TBD        |
| Phase 3 | 🔲 Planned  | —       | TBD        |

---

## How to Contribute

### For Manual Refactoring

- Pick a component from Phase 2 list
- Follow .cursor/rules/tailwind-css-refactoring.md
- Test thoroughly before committing
- Include before/after in commit message

### For AI-Assisted Refactoring

- Use Cursor with Codex
- Reference .cursor/rules/tailwind-css-refactoring.md
- Use template prompt in "Rule 8"
- Test output before committing

---

## Sign-Off

✅ Phase 1 Complete  
✅ Foundation Established  
✅ Phase 2 Ready to Start  
✅ Documentation Complete

Next Step: Start Phase 2 with first component, or pause for review.

For questions, consult .cursor/rules/tailwind-css-refactoring.md or this document.
