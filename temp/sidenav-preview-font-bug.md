# Investigation: SideNavigation title renders the wrong font in the editor preview

## The bug

In the live-tokens editor's **component preview** (the `/components` route /
component-editor canvas), the **SideNavigation** title ("Title") renders in a
**sans** font. On the **real page** it renders correctly in **Arvo**
(`--font-display`, a slab serif) — e.g. the `/docs` page's sidebar shows
"Live Tokens" in Arvo. So the **preview is wrong; the shipped component and the
real page are correct.** Do NOT change the component default.

## Confirmed facts (already verified — don't re-litigate)

- The title font is supposed to be `--font-display`. Both the component default
  and the on-disk config agree:
  - `src/system/components/SideNavigation.svelte` `:global(:root)`:
    `--sidenavigation-title-default-label-font-family: var(--font-display)`
    (also `-hover-` and `-active-`).
  - `src/live-tokens/data/component-configs/sidenavigation/default.json`:
    `"--sidenavigation-title-default-label-font-family": "--font-display"`.
  - `_active.json` and `_production.json` both point to `default`. In the editor,
    **Adopt is disabled** → editor state == production == default. So this is
    NOT an un-adopted edit.
- `--font-display: "Arvo", serif` is defined in `src/system/styles/tokens.css`
  and `tokens.generated.css`, and Arvo loads via `@import` in
  `src/system/styles/fonts.css` (imported app-wide in `main.ts`). The editor
  runs as an iframe embedding the app, and `core/fonts/fontLoader.ts` also
  injects font sources into the iframe — so Arvo is available in both contexts.
- **Other components' font-family tokens render correctly in the preview.**
  SectionDivider's title (`--sectiondivider-<v>-title-font-family:
  var(--font-display)`) shows Arvo in its own preview. So the bug is specific to
  SideNavigation's title.
- Both components use a `--_` indirection for the font, so indirection alone is
  not the cause:
  - SideNavigation: `.sn-title { --_label-family:
    var(--sidenavigation-title-default-label-font-family); }` then
    `.sn-title-label { font-family: var(--_label-family); }`.
  - SectionDivider: similar `--_divider-title-font-family: var(--sectiondivider-…)`.
- Note `var(--font-display)` has **no inline fallback**. If `--font-display`
  (or the component token) resolves to empty in the preview, `font-family`
  becomes invalid and **inherits** the editor chrome font (sans,
  `--ui-font-sans`). That matches the observed sans rendering.

## Leading hypothesis

The editor's **live-preview resolution** writes a resolved value for
SideNavigation's title font-family that is **empty/unresolved**, shadowing the
component's correct `:global(:root)` default. The most suspicious difference vs
SectionDivider is the **token name shape**: SideNavigation uses
`--sidenavigation-title-<state>-label-font-family` (part → state → **element
"label"** → prop), whereas working components use `…-<variant/part>-<prop>`
without an element segment after the state. A resolver/parser that assumes the
slot is the segment immediately before the prop may mis-handle the extra
`label` segment.

## Where to look

- `src/editor/core/store/editorRenderer.ts` — `deriveCssVars(state)`: how
  component vars are turned into the applied CSS-var map for the preview.
- `src/editor/core/themes/slices/components.ts` — `componentsToVars`, and
  `typographySlotOf` (parses the slot off a typography var name; note it slices
  the segment before the suffix, which for `…-default-label-font-family` yields
  `label` — check whether anything keys off this for resolution/application).
- `src/editor/core/store/cssVarRef.ts` — `refToCss` (how a `{kind:'token',
  name:'--font-display'}` alias becomes `var(--font-display)` vs a resolved
  stack). Confirm SideNav's title alias produces a valid value.
- `src/editor/component-editor/SideNavigationEditor.svelte` — title typography
  is registered via `titleTypographyTokens` (groupKey `title-label-font-family`)
  AND referenced by `titleStateTypeGroups`. Check the preview isn't applying a
  blank/placeholder for these.
- Compare against `src/editor/component-editor/SectionDividerEditor.svelte`
  (works) to isolate the difference.

## Recommended first step (reproduce + localize)

`npm run dev`, open `/components` → Side Navigation. In devtools, inspect the
preview's `.sn-title-label`:
- computed `font-family` (expect: falling back to sans),
- resolved value of `--sidenavigation-title-default-label-font-family` and
  `--font-display` **within the preview container**,
- compare the same vars on the `/docs` sidebar (where it's correct).

This tells you whether the component token is being set to empty in the preview
(resolution bug) or `--font-display` itself is missing there (font-context bug).

## Verify the fix

In `/components`, the Side Navigation preview title should render Arvo, matching
the `/docs` sidebar. Run `npm run check` (expect 0 errors; 2 pre-existing
a11y warnings in `UIRelinkConfirmDialog.svelte` / `UITokenSelector.svelte` are
unrelated).

## Context (recent, unrelated work)

The current branch has uncommitted edits to the docs (`docs/*.md`,
`src/app/docs/*`) and a tab rename in `SideNavigationEditor.svelte` — none of
that touches this bug. There is also an unrelated uncommitted change in
`src/editor/overlay/LiveEditorOverlay.svelte` (the user's own in-progress work);
leave it alone.
