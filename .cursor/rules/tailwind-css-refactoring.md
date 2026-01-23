# Tailwind CSS Refactoring Rules for ShadowCheck

## Project Context

**Stack**: React 18 + TypeScript, Tailwind CSS v4.1.18, Vite, Express backend
**Theme**: Dark-only (slate-950 primary, no light mode needed)
**Design System**: 
- Color palette: Tailwind slate-{50-950}, with blue/green/red accents
- Spacing: Tailwind 4px scale (1 unit = 4px)
- Typography: Inter (sans-serif), JetBrains Mono (monospace)
- Shadows: `shadow-lg`, `shadow-xl`, `shadow-2xl`
- Rounded corners: `rounded-lg`, `rounded-xl`

**Critical Constraints**:
- ⚠️ **Tailwind v4** requires `@tailwindcss/postcss` plugin (NOT `tailwindcss`)
- ✅ CommonJS `module.exports` in config files (not ES modules)
- ✅ React components use ESM (TSX)
- DO NOT run `npm run format` unless explicitly instructed (Prettier reformats unrelated files)
- Safelist in `tailwind.config.js` should be minimal (pattern-based only)
- z-index semantic tokens: `z-modal` (1000), `z-dropdown` (100)

---

## Before You Start: Reference Files

When refactoring, always reference:
- `@tailwind.config.js` — Current config with z-index scale and safelist
- `@postcss.config.js` — Must use `@tailwindcss/postcss` for v4
- `@src/index.css` — Custom CSS layer with reusable classes
- Component being refactored (e.g., `@src/components/AdminPage.tsx`)

---

## Rule 1: Replace Inline Styles with Tailwind Utilities

### ✅ DO

```tsx
// Use Tailwind classes first
<div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-lg">
  Content
</div>

// For opacity, use Tailwind modifiers
<div className="bg-slate-900/95 border-slate-800/80">
  Content
</div>

// For responsive widths, use Tailwind prefixes
<div className={`w-full ${isCompact ? 'sm:w-72' : 'sm:w-80'}`}>
  Content
</div>

// For dynamic values that can't be static, use CSS variables
<div 
  className="h-screen"
  style={{ height: dynamicHeightValue }}
>
  Content
</div>
```

### ❌ DON'T

```tsx
// Never hardcode colors in style={{}}
<div style={{ backgroundColor: '#132744', borderColor: '#1c3050' }}>

// Never use arbitrary inline shadows
<div style={{ boxShadow: '0 10px 24px rgba(0,0,0,0.35)' }}>

// Never mix inline styles with className for same property
<div 
  className="bg-slate-900"
  style={{ background: 'rgba(15, 23, 42, 0.92)' }}
>
```

Pattern to refactor:

```tsx
// BEFORE
<div style={{ 
  backgroundColor: '#0f1e34',
  border: '1px solid rgba(71, 85, 105, 0.6)',
  padding: '20px',
  borderRadius: '12px'
}}>

// AFTER
<div className="bg-slate-950/95 border border-slate-600/60 p-5 rounded-lg">
```

---

## Rule 2: Extract Complex Gradients & Shadows to Custom CSS

When to Use Custom Classes
If a style:

- Uses linear-gradient() or radial-gradient()
- Uses complex text-shadow or filter effects
- Is repeated across 3+ components
- Requires WebKit prefixes (-webkit-background-clip, etc.)

→ Add to src/index.css under @layer components

✅ Good Pattern

```tsx
// In src/index.css
@layer components {
  .bg-ml-training {
    background:
      radial-gradient(circle at 20% 20%, rgba(var(--emerald-400-rgb), 0.06), transparent 25%),
      radial-gradient(circle at 80% 0%, rgba(var(--blue-500-rgb), 0.06), transparent 20%),
      linear-gradient(135deg, var(--slate-950) 0%, var(--slate-900) 40%, var(--slate-950) 100%);
  }

  .text-gradient-blue {
    @apply bg-clip-text text-transparent;
    background-image: linear-gradient(135deg, var(--blue-400) 0%, var(--blue-500) 100%);
    -webkit-text-fill-color: transparent;
  }

  .text-glow-strong {
    text-shadow: 0 0 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.6);
    filter:
      drop-shadow(0 4px 12px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 30px rgba(100, 116, 139, 0.3));
  }
}
```

```tsx
// In component
<div className="bg-ml-training w-full h-screen">
  <h1 className="text-gradient-blue text-glow-strong">Title</h1>
</div>
```

❌ Bad Pattern

```tsx
// Don't hardcode gradients in className with arbitrary values
<div className="bg-gradient-to-r" style={{
  background: 'linear-gradient(...)'  // ← Still using inline!
}}>

// Don't create one-off custom styles
<div style={{
  background: 'radial-gradient(...)',
  textShadow: '...'
  // used in only one place
}}>
```

---

## Rule 3: Use CSS Variables for Theme Colors

✅ Define Once in :root

```css
/* src/index.css */
:root {
  /* Tailwind palette tokens for reuse */
  --slate-950: #0f172a;
  --slate-900: #0f172a;
  --blue-400: #60a5fa;
  --blue-500-rgb: 59, 130, 246;  /* RGB for rgba() */
  --emerald-400-rgb: 52, 211, 153;
}
```

Use in Custom CSS

```css
@layer components {
  .card-custom {
    background: rgba(var(--blue-500-rgb), 0.1);  /* Using RGB var */
    color: var(--slate-900);
  }
}
```

❌ Don't Repeat Hardcoded Colors

```css
/* BAD: Colors hardcoded in multiple places */
.card { background: #0f1e34; }
.header { background: #0f1e34; }
.sidebar { background: #0f1e34; }

/* GOOD: Use variable once */
.card { background: var(--slate-950); }
.header { background: var(--slate-950); }
.sidebar { background: var(--slate-950); }
```

---

## Rule 4: Safelist & Z-Index Management

✅ Minimal Safelist (Pattern-Based Only)

```javascript
// tailwind.config.js
safelist: [
  // Only for genuinely dynamic classes (e.g., data-driven gradients)
  { pattern: /^(from|to)-(red|orange|yellow|green|blue|purple|cyan|emerald|indigo|amber)-(600|700|800|900)$/ },
]
```

✅ Use Semantic Z-Index Tokens

```javascript
// tailwind.config.js
extend: {
  zIndex: {
    dropdown: '100',
    modal: '1000',
  },
}
```

```tsx
// In components
<div className="fixed inset-0 z-modal bg-black/80">
  {/* Modal background */}
</div>

<div className="absolute z-dropdown top-full mt-2">
  {/* Dropdown menu */}
</div>
```

❌ Never Use Extreme Z-Index Values

```tsx
// BAD
className="z-[999999]"
className="z-[100000]"
className="z-[50000]"

// GOOD
className="z-modal"       // 1000
className="z-dropdown"    // 100
```

---

## Rule 5: Color Conversion Cheatsheet

Mapping Hardcoded Hex to Tailwind
When you see inline hex/rgba colors, map to Tailwind:

Hardcoded	Tailwind Class	Notes
#0f172a	bg-slate-950	Dark background
#1e293b	bg-slate-800	Card/panel bg
#334155	bg-slate-700	Hover states
rgba(X, 0.95)	bg-slate-900/95	Use opacity modifier
rgba(X, 0.05)	bg-white/5	Light overlay
#ef4444	text-red-500 or bg-red-500	Red accent
#3b82f6	text-blue-500 or bg-blue-500	Blue accent

Common Opacity Replacements

Pattern	Tailwind
rgba(..., 0.9)	/90
rgba(..., 0.8)	/80
rgba(..., 0.6)	/60
rgba(..., 0.5)	/50
rgba(..., 0.3)	/30
rgba(..., 0.1)	/10

---

## Rule 6: What NOT to Refactor

Leave These Untouched

- Logic changes: Never alter component behavior, props, or exports
- HTML structure: Keep DOM elements identical
- Accessibility: Preserve aria-*, role, alt attributes
- Dynamic inline styles: If style={{}} depends on JS variables/calculations, it may need to stay (e.g., style={{ height: calculatedValue }})
- Tooltip HTML strings: Inline HTML in JS strings is risky to refactor (Tailwind won't process classes inside strings)
- Unrelated files: Only refactor the components explicitly listed

---

## Rule 7: Testing After Refactor

Always Run This Before Commit

```bash
# 1. Lint (read-only, no changes)
npm run lint

# 2. Build (catches CSS/Tailwind errors)
npm run build

# 3. Check bundle size
ls -lh dist/assets/index-*.css

# 4. Visual regression check
# - Open browser DevTools
# - Compare colors, spacing, shadows with before refactoring
# - Test dark mode (should be default)
# - Check hover states
```

Success Criteria
✅ No ESLint errors
✅ Build succeeds with no Vite/PostCSS errors
✅ CSS bundle size ≤ original (or improved)
✅ Visual appearance identical
✅ No new console errors

---

## Rule 8: Common Refactoring Scenarios

Scenario A: Replacing Hardcoded Card Styles

```tsx
// BEFORE
<div
  className="rounded-lg p-4"
  style={{
    backgroundColor: '#1e293b',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
  }}
>

// AFTER
<div className="rounded-lg p-4 bg-slate-800 border border-slate-700/20 shadow-lg">
```

Scenario B: Replacing Button Gradients

```tsx
// BEFORE
<button
  style={{
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  }}
>

// AFTER
<button className="bg-gradient-to-br from-red-500 to-red-600">
```

Scenario C: Replacing Text Gradients with Custom Class

```tsx
// BEFORE
<h1
  style={{
    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }}
>

// AFTER (add to index.css first)
<h1 className="text-gradient-blue">
```

Scenario D: Responsive Widths (Compact vs. Full)

```tsx
// BEFORE
<div
  style={{
    width: isCompact ? 280 : 320,
    minWidth: isCompact ? 280 : 320,
  }}
>

// AFTER
<div className={`${isCompact ? 'w-64' : 'w-80'}`}>
```

---

## Rule 9: Component Files Already Refactored

These files are safe to reference and have been updated:

✅ src/components/AdminPage.tsx — Hardcoded hex → Tailwind
✅ src/components/FilterPanel.tsx — Inline widths → Tailwind responsive
✅ src/components/MLTrainingPage.tsx — Gradients extracted to .bg-ml-training
✅ src/components/KeplerTestPage.tsx — Shadows/borders → Tailwind
✅ src/index.css — Custom classes added, unused removed
✅ tailwind.config.js — Safelist optimized, z-index tokens added
✅ postcss.config.js — Using correct v4 plugin

---

## Rule 10: When to Ask for Help

❌ STOP and ask if:

- A component has complex logic tied to inline styles
- Refactoring would require changing HTML structure
- You see version mismatches (e.g., Tailwind v3 expected, v4 found)
- PostCSS plugin names conflict with installed version
- A style seems impossible to replicate with Tailwind (propose custom CSS instead)

✅ Safe to proceed with:

- Replacing hardcoded colors with Tailwind palette
- Extracting gradients/shadows to custom CSS
- Converting spacing/sizing to Tailwind utilities
- Updating z-index values to semantic tokens
- Removing unused CSS classes

---

## Quick Reference: File Locations

```
.cursor/rules/
  └─ tailwind-css-refactoring.md (this file)

src/
  ├─ index.css (custom CSS layer, gradients, variables)
  ├─ components/
  │   ├─ AdminPage.tsx (refactored example)
  │   ├─ FilterPanel.tsx (refactored example)
  │   ├─ MLTrainingPage.tsx (refactored example)
  │   └─ KeplerTestPage.tsx (refactored example)
  └─ App.tsx (uses z-modal token)

tailwind.config.js (safelist + z-index tokens)
postcss.config.js (v4 plugin: @tailwindcss/postcss)
```

---

## Template Prompt for Codex

When refactoring a new component, use this template:

```
# Refactor [ComponentName].tsx for Tailwind CSS

## Goal
Replace inline styles and hardcoded colors with Tailwind utilities.

## Constraints
- Do NOT change component logic or props
- Do NOT alter HTML structure
- Preserve all accessibility attributes (aria-*, role)
- Use only colors from Tailwind palette or CSS variables
- If a gradient is needed, extract to @layer components in src/index.css

## Files to Reference
@tailwind.config.js - for color palette, z-index tokens
@src/index.css - for custom CSS classes (gradients, shadows, text effects)
@src/components/AdminPage.tsx - working example of refactored component

## Changes Needed
- [ ] Replace all style={{}} with className
- [ ] Map hardcoded hex/rgba to Tailwind colors
- [ ] Replace custom shadows with shadow-lg / shadow-xl
- [ ] Update z-index values to z-modal or z-dropdown
- [ ] Extract complex gradients to custom CSS class in index.css

## Success Criteria
- npm run lint passes
- npm run build succeeds
- Visual appearance unchanged
- No new console errors

## After Completion
1. Show git diff of changes
2. Run: npm run lint && npm run build
3. Report bundle size of dist/assets/index-*.css
```

---

Additional Resources
- Tailwind Docs: https://tailwindcss.com/docs (v4)
- Color Palette: https://tailwindcss.com/docs/customizing-colors
- Opacity Modifiers: https://tailwindcss.com/docs/background-color#changing-the-opacity
- Z-Index: https://tailwindcss.com/docs/z-index
- Custom CSS Layer: https://tailwindcss.com/docs/adding-custom-styles#using-css-and-layer

Last Updated: 2026-01-23
Project: cyclonite69/shadowcheck-static
Tailwind Version: v4.1.18
