# Semantic Text Styles: a role layer over the type primitives

Status: decided, prepared for execution. Run via `docs/plans/semantic-text-styles.md` (wave plan for sub-agents). This doc is the design rationale.

## Goal

Today typography stops at primitives: family stacks (`--font-display/sans/serif/mono`), the size scale, weights, line heights, letter spacings. Pages consume primitives directly (`site.css` h1 picks `--font-size-4xl` by hand). There is no layer that says "this is what a page title looks like."

This plan adds that layer: named text styles, each a bundle of five tokens that alias primitives. Names follow Cloudscape's typography roles; values are ours. HTML elements get a default style (h1 renders as `heading-xl`) that any instance can override.

## The model

A text style is a bundle of five CSS variables, one per typographic axis, using our standard kind suffixes so the editor's picker inference works unchanged:

```css
--heading-xl-font-family: var(--font-display);
--heading-xl-font-size: var(--font-size-4xl);
--heading-xl-font-weight: var(--font-weight-semibold);
--heading-xl-line-height: var(--line-height-tight);
--heading-xl-letter-spacing: var(--letter-spacing-normal);
```

Values are aliases into the existing scales, never raw values. Editing a style in the editor means re-pointing an alias, exactly like component tokens today. Because sizes alias the scale, the responsive shrink built into `--font-size-2xl` through `-7xl` carries through for free.

Color is deliberately not in the bundle. Text color stays with the `--text-*` role system; the element rules in `site.css` keep their existing `color:` lines. A style describes letterforms, not ink.

This is the same shape as the component-level precedent (`--sectiondivider-lg-eyebrow-font-family`, Badge trait text), promoted to a global layer.

## The definition table

Sizes are extracted from the current `src/app/site.css` rules. Two deliberate default changes (decided 2026-07-20), both grounded in the same principle: the layer disconnects styling from semantics, so shipped defaults should be the conventional, systematic choice, and expressive breaks are per-theme decisions made in the editor.

- Weight: all headings default semibold (h3 was normal).
- Family: two-family default system. Display for h1 through h3, sans for everything else. Serif leaves the defaults entirely but stays a primitive, one picker click away for any style.

Every family, size, weight, and letter-spacing assignment below is a reassignable alias in the editor, exactly like components re-pointing a corner radius. Line-height is the exception; see "The line-height fix" (names below use the renamed scale) and the editor section (locked in v1). h4 has no rule today; its defaults are new.

| Style | Default element | Family | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|---|---|
| `heading-xl` | h1 | display | 4xl (36px) | semibold | tight (1.25) | normal |
| `heading-lg` | h2 | display | 2xl (24px) | semibold | tight (1.25) | normal |
| `heading-md` | h3 | display | xl (20px) | semibold | tight (1.25) | normal |
| `heading-sm` | h4 | sans | lg (18px) | semibold | tight (1.25) | normal |
| `body-md` | p | sans | md (16px) | normal | normal (1.5) | normal |

Cloudscape's names map onto our existing abbreviation vocabulary (xl/lg/md/sm/xs), matching the size scale and component sizing props. One quirk to accept knowingly: the rank suffix names the style's position in its own ramp, not the size token it points to (`heading-sm` resolves to `--font-size-lg`). The alias is visible in the editor table, which keeps the indirection honest.

List items are deliberately not in the table. Today `ul li` uses a raw `line-height: 1.75` and `ol li` uses sans at 1.6, both diverging from `p`. Mapping `li` to `body-md` would be a visual change. Decide separately: either lists adopt `body-md` (and keep any deviation as an explicit element-level override), or they stay element-styled.

## The line-height fix

Decided 2026-07-20. The mobile line-height literals in `site.css` (1.1, 1.15, 1.2) exist because the ratio scale cannot express what large type needs: display-size headings want leading around 1.1, and the scale jumps from 1 straight to 1.25. Once line-height belongs to the style token, raw literals would silently defeat it. Two-part fix:

**1. Rename the line-height scale to descriptive leading vocabulary and add the missing step.** Letter-spacing already names by effect (tighter/tight/normal/wide/wider); line-height joins the same convention:

| New name | Value | Old name |
|---|---|---|
| `--line-height-none` | 1 | xs |
| `--line-height-tighter` | 1.1 | (new) |
| `--line-height-tight` | 1.25 | sm |
| `--line-height-normal` | 1.5 | md |
| `--line-height-loose` | 1.75 | lg |
| `--line-height-looser` | 2 | xl |

The rename is forced by the insertion, not just taste: 1.1 sits between xs (1) and sm (1.25), and no size name fits between them. Descriptive names also read as typography ("tight leading" means something, "md leading" means nothing). Pre-1.0 this is a labeled rename migration plus one additive step through the existing tokensCssMigrations machinery; post-1.0 it becomes a major, so now is the moment. Internal sweep: tokens.css, every `--line-height-*` consumer across components/app/editor, `LINE_HEIGHT_VARS` in `tokenScales.ts`.

Cheap fallback if the rename churn is unwanted: keep xs..xl and add the one off-vocabulary step `--line-height-tighter: 1.1`. Purely additive, but leaves the scale with mixed vocabulary.

**2. Move the responsive tightening into the semantic layer**, mirroring how `--font-size-2xl` and up already shrink at breakpoints inside tokens.css. The style bundle block carries its own breakpoint re-points:

```css
@media (max-width: 768px) {
  :root {
    --heading-xl-line-height: var(--line-height-tighter);
    --heading-lg-line-height: var(--line-height-tighter);
  }
}
```

`site.css` deletes its line-height literals (the margin tweaks in that media query stay). The eyeballed values snap to scale steps: h1 keeps 1.1 exactly, h2 goes 1.15 to 1.1 (about 1px per line at mobile h2 sizes), and h3's 1.2 rounds to its desktop value of 1.25, so its mobile override simply disappears. Verify by eye once rendered.

After this, a style's line-height token is the single source of truth at every viewport: edit `--heading-xl-line-height` in the editor and mobile follows.

Implementation flag: editor-promoted overrides land in `tokens.generated.css` under `:root:root`, which outweighs a `:root` media re-point at any viewport. If a promoted theme overrides a heading line-height, `regenerateTokensCss` must re-emit the breakpoint block, or mobile tightening dies for that consumer. The existing font-size shrink has the same structural exposure; settle both with one mechanism during implementation.

## Element mapping and per-instance override

Two mechanisms, both in `site.css`:

1. Element defaults. The element rules re-point at the bundle:

```css
h1 {
  font-family: var(--heading-xl-font-family);
  font-size: var(--heading-xl-font-size);
  font-weight: var(--heading-xl-font-weight);
  line-height: var(--heading-xl-line-height);
  letter-spacing: var(--heading-xl-letter-spacing);
  color: var(--text-primary);          /* unchanged, outside the bundle */
  margin: 0 0 var(--space-12);         /* layout stays element-level */
}
```

2. Override classes. One utility class per style applies the same bundle to any element, which is the "h4 rendered as heading-md because of this page's layout" case:

```html
<h4 class="heading-md">Still an h4 for the outline, styled one step up</h4>
```

Semantics (document outline, accessibility) come from the tag; appearance comes from the style. Cloudscape gives the same guidance: pick headings by importance, not appearance.

There is a third override tier that falls out of the variable-based design for free: contextual scoping. Because styles are custom properties, a container can re-tune a style for everything inside it without new classes or new styles:

```css
.hero {
  --heading-xl-font-size: var(--font-size-6xl);
}
```

This covers "this page layout runs its headings one step up" as a one-liner, which class-swapping every heading cannot. It should be documented as the intended mechanism for section-level typography, not a trick.

Margins and colors stay as element-level concerns in `site.css`. They are page layout and ink, not letterform identity. The responsive line-height tweaks in the media query move into the token layer; see "The line-height fix".

Because `site.css` is user-owned, the re-pointing ships in the template for new projects; existing consumers opt in by editing their own copy (or keep consuming primitives directly, which keeps working).

## Other styles worth defining

The user's four headings cover the outline. Candidates beyond them, with recommendations:

**Include in v1:**

- `body-sm` (small, captions): sm (14px), sans, normal, line-height normal. Cloudscape's Body S covers descriptions, constraint text, error text. We have nothing for text-below-body today.
- `code` (code, pre): mono, sm, normal, line-height md. `site.css` currently styles neither `code` nor `pre`; the docs surface hand-rolls its own. A real gap.
- `eyebrow`: sans, xs, semibold, letter-spacing wider, plus `--eyebrow-text-transform: uppercase`. This one is our own precedent, not Cloudscape's: an ad-hoc `.eyebrow` class already exists in `Home.svelte`, `Docs.svelte`, and the demos, and SectionDivider carries a full eyebrow token bundle per variant. Promoting it makes the existing class token-driven. (text-transform as a sixth axis exists only where a style needs it; SectionDivider already does this.)

**Defer (define when a page needs them):**

- `heading-xs` (h5): Cloudscape has it; nothing in the app or template uses h5. Cheap to add later, additive.
- `display-lg` (hero titles): Cloudscape's Display L (42px). Our 5xl/6xl/7xl sizes exist but no site surface uses them yet. Worth adding the day the starter grows a hero, together with a light-weight subtitle variant if needed.
- `numeric` (data display): tabular figures (`font-variant-numeric: tabular-nums`) for metrics, tables, and anything with aligned digits. Standard design-system need; add when a data surface exists. Note this needs a sixth axis beyond the five, like eyebrow's text-transform.

**Considered and rejected:**

- Link: color and decoration, not letterforms; already covered by the `a` rule and `--text-brand`.
- Label / key-value: component territory (form components own their label tokens).
- Caption: same thing as `body-sm`, one name is enough.

## Editor integration

New "Text Styles" section in the Typography tab (`VariablesTab.svelte`), between Font Families and the scale tables: a Cloudscape-style definition table, one row per style with a live preview cell (sample text rendered through the bundle) and four alias pickers: family, size, weight, letter-spacing. The pickers already exist (`UIFontFamilySelector`, `UIFontSizeSelector`, `UIFontWeightSelector`, `UILetterSpacingSelector`); `KIND_PATTERNS` resolves them from the suffixes with no changes.

Line-height is locked in v1 (decided 2026-07-20): shown as a read-only value, no picker. Leading is paired to the style's role and size; a free line-height picker is the fastest way to wreck vertical rhythm for little expressive gain. Code-level users can still re-point `--heading-xl-line-height` in CSS (contextual scoping keeps working); the editor just doesn't invite it. Same treatment for eyebrow's `text-transform`: part of the style's identity, not a picker. Unlocking either later is additive.

The per-component "type group" scaffolding (`buildTypeGroupTokens.ts`) is the closest existing machinery, but it lives in the component editor. Expected shape: a small style registry (name, variable prefix, axes, preview text) driving a table component in the global tab, reusing the UI selectors directly.

Write path is the standard one: live edits through `setCssVar` (self + parent iframe fan-out), Save into theme `cssVariables`, Promote into `tokens.generated.css` via `regenerateTokensCss`. Semantic tokens are plain variables aliasing other variables, so the existing pipeline carries them without new persistence machinery.

## Rollout

1. Line-height scale rename plus the `tighter` step (see "The line-height fix"), with a paired labeled rename migration and the internal `--line-height-*` sweep. Lands first so the bundles can reference the new names.
2. Add the token bundles to `src/system/styles/tokens.css` (hand-authored defaults, one block per style plus the breakpoint re-points, after the existing typography scales).
3. Paired additive migration in `vite-plugin/tokensCssMigrations/` (same `ensureScale` pattern as the 2026-05-29 typography-scale migration) so `npx live-tokens migrate` inserts the block into consumer tokens.css. Additive = minor under the token API contract.
4. Re-point `src/app/site.css` element rules at the bundles, delete its mobile line-height literals, and add the override classes; template inherits via `bin/create.mjs`.
5. Editor: Text Styles definition table in the Typography tab.
6. First-party adoption follow-up: docs `.prose` headings and the `.eyebrow` call sites consume the bundles (app surfaces must use tokens).

Steps 1 to 4 are useful without step 5 (the layer works and is hand-editable); step 5 is what makes it a product feature.

## Open decisions

1. **Prefix.** Bare `--heading-xl-*` / `--body-md-*` reads best and collides with nothing today, but a future first-party "Heading" component would want the `--heading-*` namespace. Options: keep bare names and reserve them (recommended; a Heading component would consume these tokens, not mint its own), or prefix everything `--type-*`.
2. **heading-sm family.** Resolved (2026-07-20): sans, under the two-family default system (display for h1 to h3, sans elsewhere).
3. **Where override classes live.** Proposed `site.css` (user-owned, five lines per class, consumers can prune). Alternative: shipped package stylesheet so class definitions update with the package. The tokens are the API either way.
4. **v1 style set.** Proceeding with the proposed set: four headings + body-md + body-sm + code + eyebrow. Trim during review if any feel premature.
5. **Responsive line-height.** Resolved (2026-07-20): see "The line-height fix". Scale renamed with a `tighter` (1.1) step added; responsive re-points live in the semantic layer in tokens.css; `site.css` literals deleted.

## Side finding

`FONT_SIZE_VARS` in `src/editor/ui/sections/tokenScales.ts` stops at `--font-size-6xl`; tokens.css defines and responsively overrides `-7xl`. The editor's Font Sizes table silently omits it. Unrelated one-line fix.
