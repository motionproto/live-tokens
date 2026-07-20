# Execution plan: semantic text styles

Design rationale and decisions: `docs/semantic-text-styles-plan.md`. Read it before executing any wave. This doc is the operational plan: five waves, each a single commit unit, executable by a sub-agent with no context beyond these two docs and the repo.

## Commit-unit protocol

- One wave = one commit. Run the wave's verification block and get it green before committing. Never commit a red tree.
- Commit message format: `Text styles W<n>: <summary>` plus the standard co-author trailer.
- Do not push, tag, or release. Releases ride CI via tag push and are user-triggered.
- Stop after the wave commits. Review happens between waves.
- If reality contradicts this plan (a file moved, a mechanism works differently than described), stop and report the contradiction instead of improvising around it.
- Never run `npm run sync:component-defaults` or bulk syncs while a dev server is running.

## Global invariants (reviewer checklist)

1. **Scale values unchanged by the rename.** none=1, tight=1.25, normal=1.5, loose=1.75, looser=2. The only new value is tighter=1.1.
2. **Zero stale references after Wave 1.** `grep -rE -- '--line-height-(xs|sm|md|lg|xl)\b'` over `src/`, `vite-plugin/` (excluding `vite-plugin/tokensCssMigrations/migrations/`), `scripts/`, `TOKENS.md` returns nothing. Migration files and CHANGELOG may reference old names; that is their job.
3. **Bundles are alias-only.** Every semantic style token's value is a `var(--...)` reference into a primitive scale. Sole exception: `--eyebrow-text-transform: uppercase`.
4. **No new theme tokens.** No new `--surface-*`, `--text-*`, or `--color-*` names anywhere in this work.
5. **Every tokens.css vocabulary change ships a registered migration** with the correct `kind` (`breaking` for the rename, `additive` for the bundles). `npm run check:token-contract` passes.
6. **Only the decided visual changes occur** (see "Accepted visual changes" below). Everything else renders pixel-identical.
7. **Editor rules.** Chrome stays greyscale (`--ui-*` vars only for chrome). The Text Styles table has NO line-height picker and NO text-transform picker; those axes render read-only.
8. **Token suffixes** use the established kind vocabulary only: `-font-family`, `-font-size`, `-font-weight`, `-line-height`, `-letter-spacing`, `-text-transform`.
9. **tokens.css stays hand-authored.** No runtime code writes it; edits in this plan are repo edits with paired migrations.

### Accepted visual changes (decided 2026-07-20, do not "fix")

- h2, h3: serif → display family. h3: normal → semibold weight.
- p: serif → sans family. h4, code, pre: newly styled (previously browser default).
- Mobile (≤768px): h2 line-height 1.15 → 1.1; h3 line-height 1.2 → 1.25 (its override is deleted).
- `ul li` line-height 1.75 re-pointed to `var(--line-height-loose)` (same value, no visual change; listed here because the diff touches it).

## Reserved judgment calls (flag in review notes, don't guess silently)

- Eyebrow defaults: extract from the existing `.eyebrow` class in `src/app/Home.svelte` and match its rendering; expected shape is sans / xs / semibold / wider / uppercase. If Home's values differ from that shape, match Home and note it.
- Editor preview-cell implementation: follow whatever precedent `TokenScaleTable.svelte` sets for live previews; note the approach taken.
- Override class names (`.heading-xl` etc.): grep for collisions with existing classes before adding; if any collide, propose an alternative and stop.
- `ol li` keeps its raw `line-height: 1.6` (lists joining `body-md` is an open decision; see design doc).

---

## Wave 1: line-height scale rename + `tighter` step

**Goal:** rename the line-height scale from size vocabulary to leading vocabulary, insert the missing 1.1 step, ship the breaking migration.

Mapping: `--line-height-xs`→`--line-height-none` (1), new `--line-height-tighter` (1.1), `--line-height-sm`→`--line-height-tight` (1.25), `--line-height-md`→`--line-height-normal` (1.5), `--line-height-lg`→`--line-height-loose` (1.75), `--line-height-xl`→`--line-height-looser` (2).

Steps:

1. `src/system/styles/tokens.css` (Line Heights block, ~line 598): apply the rename, insert `--line-height-tighter: 1.1;` between none and tight, keep the block comment accurate.
2. Sweep every reference to the five old names across: `src/**/*.{svelte,css,ts}` (component `:global(:root)` blocks, app css, editor UI and styles, demo files), `src/live-tokens/data/**/*.json` (theme `cssVariables` and component config aliases), `src/live-tokens/data/tokens.generated.css`, `src/editor/docs/content/*.md`, `TOKENS.md`, `scripts/`. Mechanical exact-name replacement only; do not touch values.
3. `src/editor/ui/sections/tokenScales.ts`: update `LINE_HEIGHT_VARS` to the six new names in scale order (none, tighter, tight, normal, loose, looser).
4. New migration `vite-plugin/tokensCssMigrations/migrations/2026-07-20-line-height-rename.ts`: `kind: 'breaking'`, use `renameToken` for the five renames and `ensureScale` (or equivalent insertion) for `tighter`, idempotent, modeled on the existing migration files. Register it in `TOKENS_CSS_MIGRATIONS` in `vite-plugin/tokensCssMigrations/index.ts`.
5. If `CHANGELOG.md` exists, add an entry under "Changed (breaking)" naming the rename and the migration id (pre-1.0 gate requires the flag).

Verification: `npm test`, `npm run check`, `npm run check:token-contract`, `npm run check:component-defaults`, plus the invariant-2 grep.

## Wave 2: semantic style bundles in tokens.css + additive migration

**Goal:** define the eight v1 styles as token bundles with their responsive re-points.

1. In `src/system/styles/tokens.css`, insert a new block directly after the Letter Spacing block:

```css
/* Text styles — semantic typography roles. Bundles of aliases into the
   primitive scales; site.css maps elements to styles. */
--heading-xl-font-family: var(--font-display);
--heading-xl-font-size: var(--font-size-4xl);
--heading-xl-font-weight: var(--font-weight-semibold);
--heading-xl-line-height: var(--line-height-tight);
--heading-xl-letter-spacing: var(--letter-spacing-normal);

--heading-lg-font-family: var(--font-display);
--heading-lg-font-size: var(--font-size-2xl);
--heading-lg-font-weight: var(--font-weight-semibold);
--heading-lg-line-height: var(--line-height-tight);
--heading-lg-letter-spacing: var(--letter-spacing-normal);

--heading-md-font-family: var(--font-display);
--heading-md-font-size: var(--font-size-xl);
--heading-md-font-weight: var(--font-weight-semibold);
--heading-md-line-height: var(--line-height-tight);
--heading-md-letter-spacing: var(--letter-spacing-normal);

--heading-sm-font-family: var(--font-sans);
--heading-sm-font-size: var(--font-size-lg);
--heading-sm-font-weight: var(--font-weight-semibold);
--heading-sm-line-height: var(--line-height-tight);
--heading-sm-letter-spacing: var(--letter-spacing-normal);

--body-md-font-family: var(--font-sans);
--body-md-font-size: var(--font-size-md);
--body-md-font-weight: var(--font-weight-normal);
--body-md-line-height: var(--line-height-normal);
--body-md-letter-spacing: var(--letter-spacing-normal);

--body-sm-font-family: var(--font-sans);
--body-sm-font-size: var(--font-size-sm);
--body-sm-font-weight: var(--font-weight-normal);
--body-sm-line-height: var(--line-height-normal);
--body-sm-letter-spacing: var(--letter-spacing-normal);

--code-font-family: var(--font-mono);
--code-font-size: var(--font-size-sm);
--code-font-weight: var(--font-weight-normal);
--code-line-height: var(--line-height-normal);
--code-letter-spacing: var(--letter-spacing-normal);

/* Eyebrow — fill from the existing .eyebrow class in src/app/Home.svelte
   (reserved judgment call; expected: sans / xs / semibold / wider). */
--eyebrow-font-family: var(--font-sans);
--eyebrow-font-size: var(--font-size-xs);
--eyebrow-font-weight: var(--font-weight-semibold);
--eyebrow-line-height: var(--line-height-normal);
--eyebrow-letter-spacing: var(--letter-spacing-wider);
--eyebrow-text-transform: uppercase;
```

2. Alongside the existing responsive font-size overrides (~line 620), add the heading re-points at the same 768px breakpoint:

```css
--heading-xl-line-height: var(--line-height-tighter);
--heading-lg-line-height: var(--line-height-tighter);
```

3. New migration `vite-plugin/tokensCssMigrations/migrations/2026-07-20-semantic-text-styles.ts`: `kind: 'additive'`, inserts the full bundle block plus the breakpoint re-points into a consumer's tokens.css, idempotent, modeled on `2026-05-29-typography-scale-additions.ts`. Register it. Confirm `findContractViolations` stays clean.
4. CHANGELOG entry under "Added" if the file exists.

Verification: `npm test`, `npm run check`, `npm run check:token-contract`. Also confirm `validateTokensCss` reports no missing tokens (`npm run check:token-contract` covers it).

## Wave 3: site.css consumes the layer

**Goal:** elements map to styles; override classes exist; the mobile literals die.

In `src/app/site.css` (the template copies this file via `bin/create.mjs`; no template work needed):

1. Re-point h1, h2, h3 at their bundles (five font axes each; keep existing `color` and `margin` lines untouched). Add an h4 rule on `heading-sm` with `color: var(--text-primary)` and a margin consistent with h3's rhythm.
2. Re-point `p` at `body-md` (family, size, line-height; keep color and margins). Add `code` and `pre` rules on the `code` bundle (code inline: family/size only; pre: family, size, line-height).
3. In the 768px media query: delete the three `line-height` literals; keep the margin tweaks.
4. `ul li`: replace `line-height: 1.75` with `var(--line-height-loose)`. Leave `ol li` untouched.
5. Add override classes after the element rules: `.heading-xl`, `.heading-lg`, `.heading-md`, `.heading-sm`, `.body-md`, `.body-sm` — each sets exactly the five font axes from its bundle. (No `.eyebrow` class yet; that lands with the call-site cleanup in Wave 5 to avoid clashing with existing scoped `.eyebrow` styles.)

Verification: `npm test`, `npm run check`, `npm run build`. Visual spot-check if a browser is available: headings display-family, p sans, h4/code styled, mobile leading intact.

## Wave 4: editor Text Styles table

**Goal:** a Cloudscape-style definition table in the Typography tab; four editable axes, line-height locked.

1. Read `src/editor/ui/TokenScaleTable.svelte`, `src/editor/ui/FontStackEditor.svelte`, and `src/editor/ui/VariablesTab.svelte` first; mirror their read/apply/persist patterns exactly. Live writes go through `setCssVar` (`src/editor/core/cssVarSync.ts`) so self + parent-iframe fan-out is preserved.
2. New `src/editor/ui/TextStylesSection.svelte` plus a small registry module (style name, label, variable prefix, default element, preview text, per-axis editable flags). Render in `VariablesTab.svelte`'s typography section between Font Families and the scale tables under an h3 "Text Styles".
3. Each row: style name + default element, live preview cell (sample text rendered through the bundle's vars), pickers for family / size / weight / letter-spacing (`UIFontFamilySelector`, `UIFontSizeSelector`, `UIFontWeightSelector`, `UILetterSpacingSelector`), read-only display of line-height (and text-transform for eyebrow). No picker for locked axes.
4. Editor chrome conventions: greyscale only, `--ui-*` tokens for all chrome values, `UIPillButton` for any buttons, editor heading roles for headers.
5. Side fix (pre-approved): add `--font-size-7xl` to `FONT_SIZE_VARS` in `src/editor/ui/sections/tokenScales.ts`; tokens.css defines it but the editor table omits it.

Verification: `npm test`, `npm run check`, `npm run check:editor-font-isolation`, `npm run check:component-defaults`. Manual: edit a family in the table, confirm the page re-renders live and the value survives the tab's normal save path.

## Wave 5: first-party adoption

**Goal:** the library's own surfaces consume the layer (app surfaces must use tokens).

1. Add the `.eyebrow` class to `src/app/site.css` using the eyebrow bundle (six axes including text-transform).
2. Remove the now-duplicate scoped `.eyebrow` styles from `src/app/Home.svelte`, `src/editor/docs/Docs.svelte`, `src/demo/Section.svelte`, and `src/demo/sections/Section*.svelte`; their markup keeps `class="eyebrow"` and inherits the global class. Match previous rendering; note any intentional deltas.
3. `src/editor/docs/Docs.svelte` `.prose h1`–`h4`: re-point at the heading bundles (keep the `.prose`-specific margins/anchors).
4. Confirm no editor-font-isolation regressions.

Verification: `npm test`, `npm run check`, `npm run check:editor-font-isolation`, `npm run check:docs-content`, `npm run build`.

---

## Out of scope (explicitly)

- Releasing/tagging (user-triggered CI).
- Lists adopting `body-md`, `heading-xs`, `display-lg`, `numeric` styles, editable line-height: all deferred decisions in the design doc.
- Any consumer-repo work; consumers migrate via `npx live-tokens migrate` when they upgrade.
