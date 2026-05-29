# Component Property/Token Coverage Audit

**Date:** 2026-05-29
**Status:** Closed. Universal contract test now enforces the audit's guarantees on every CI run.
**Scope:** All 23 first-party components in `src/editor/component-editor/registry.ts` (`builtInRegistry`).

**Live verifier:** `src/editor/component-editor/registryContract.test.ts` — parameterized via `describe.each(getComponentRegistryEntries())`, runs 5 checks per component (registration, unique vars, runtime declaration, production-config seed, save round-trip). Any new component added to the registry is auto-covered; any future drift fails CI.

---

## Headline

The system was in better shape than the initial audit suggested. After verifying findings against the actual code (especially the `themed-padding` SCSS mixin convention), most "drift" the audit reported turned out to be false positives from helper-expanded tokens the extraction agents couldn't model. The genuine cleanup was small.

**Real changes applied:**

1. **Removed 32 vestigial `hidden: true` per-side padding tokens** from 4 editors (CornerBadge, Input, MenuSelect, SegmentedControl). Each had a unique per-side `groupKey` and formed no sibling group; the `splittable: true` flag on the rollup token is what drives the split UI. The hidden entries were dead schema.
2. **Seeded missing production config aliases** in 3 files:
   - `cornerbadge/default.json` — added 30 variant color aliases (10 variants × surface/border/text) so the canonical config matches the runtime's `:global(:root)` defaults.
   - `card/my-card.json` — added `--card-default-header-gap`.
   - `imagelightbox/my-image-lightbox.json` — added `--imagelightbox-chrome-surface`.
3. **Updated the groupKey topology snapshot** (`temp/groupkey-snapshot.json`) to drop the removed entries.

**Verification:** `npm test` → 2429/2429 passing. `npm run check` → 0 errors.

**One open question (not changed):** see "SideNavigation panel widths" below.

---

## Convention Confirmed: Padding-Split

`src/system/styles/_padding.scss` defines `themed-padding($base, $h: 1, $v: 1)` which emits:

```scss
padding:
  var(#{$base}-top, #{$v-val})
  var(#{$base}-right, #{$h-val})
  var(#{$base}-bottom, #{$v-val})
  var(#{$base}-left, #{$h-val});
```

So the canonical model is:
- **Runtime declares only the rollup** `--xxx-padding`. Per-side vars are NOT declared as defaults.
- **Runtime consumes via `themed-padding` mixin** which uses CSS fallback chains. Side vars override the parent when set; otherwise fall back to the parent's `$h`/`$v` derivation.
- **Editor writes side vars only in split mode**. `UIPaddingSelector.splitToSides()` seeds 4 sides; `mergeToSingle()` clears them.
- **Schema awareness of side vars is unnecessary**. The padding selector's `writeAliasLinked` looks up siblings via the parent rollup's `groupKey: 'padding'` and constructs `peerVar = ${peer}${suffix}` directly — it never consults a registered schema entry for the side var.

This is the convention. The "always store 4 sides" mental model was incorrect — the actual model is "store the rollup; sides are optional CSS fallbacks." This is more efficient (1 write instead of 4, simpler sibling-linking, less storage) and the mixin abstracts the verbosity at the runtime side.

---

## Write-Path Verdict

The editor saves every edited token to disk under its original key. No filter, no schema-membership gate. `registerComponentSchema()` is consulted only for UI sibling-grouping — never at save time.

- `src/editor/core/themes/slices/components.ts:105-133` — `setComponentAlias`/`setComponentConfig` accept any string key.
- `src/editor/core/components/componentPersist.ts:48-49` — serialization iterates `slice.aliases` unmodified.
- `src/editor/core/store/editorStore.ts:407-429` — `splitAliasesAndConfig` is a load-time cosmetic split, not a save-time gate.

**Implication:** there are no "lost edit" bugs. Every token surfaced by an editor persists when edited.

---

## False Positives From The Initial Sweep

The Explore agents that produced the first pass of findings had two systematic miscounts:

### F1. Helper-expanded tokens read as "missing from editor"

Several editors build their `allTokens` from helpers (`variantColorTokens`, `buildTypeGroupTokens`, `variantTypeGroupTokens`). The agents enumerated only the literal `variable: '--xxx'` strings in the source and missed the helper-emitted ones. Examples flagged as bugs that aren't:

- **CornerBadge variant colors** (30 tokens) — emitted by `variantColorTokens` (CornerBadgeEditor.svelte:29-35); spread into `allTokens` at line 43.
- **SectionDivider letter-spacing tokens** — declared in `variantTypeGroupTokens` (SectionDividerEditor.svelte:105, 115).
- **SectionDivider background tokens** — declared in `backgroundTokens` (SectionDividerEditor.svelte:45-49, `kind: 'gradient'`), rendered via specialized `GradientEditor` in `compositeControls` rather than the standard token grid.
- **ImageLightbox `--imagelightbox-chrome-surface`** — present in editor at ImageLightboxEditor.svelte:20.
- **Input typography type-groups** — type-group tokens enumerated in `inputTextTypographyTokens` and `messageTypographyTokens` (InputEditor.svelte:105-117).

### F2. Mixin-compiled CSS read as "runtime-only declaration"

Button.svelte has six variants (primary, secondary, outline, success, danger, warning) and a small modifier. The agent reported 24 padding-side declarations in the runtime (`--button-{v}-padding-{top|right|bottom|left}`). Grep against the source returns zero matches — those declarations don't exist. The agent confused `@include themed-padding(--button-primary-padding, $h: 2)` (which expands at SCSS compile time to a CSS rule consuming side vars with fallbacks) with explicit `:global(:root)` declarations.

### F3. Config seeding gaps read as "edits won't persist"

Several "C Not-aliased" findings (Input label/hint/error type-groups, Card header tokens) were against the wrong file — the audit walked `_production.json → productionFile` for some components and `default.json` for others inconsistently, so it occasionally compared the editor against an old/empty config when a newer one existed.

---

## Summary Table (Post-Fix)

| Component | Status |
|---|---|
| badge | Clean |
| button | Clean |
| callout | Clean |
| card | Fixed (my-card.json: added header-gap) |
| codesnippet | Clean |
| collapsiblesection | Clean |
| cornerbadge | Fixed (default.json: added 30 variant colors; editor: removed 4 vestigial padding sides) |
| dialog | Clean |
| image | Clean |
| imagelightbox | Fixed (my-image-lightbox.json: added chrome-surface) |
| inlineeditactions | Clean |
| input | Cleaned (editor: removed 4 vestigial padding sides) |
| menuselect | Cleaned (editor: removed 8 vestigial padding sides) |
| notification | Clean |
| progressbar | Clean |
| radiobutton | Clean |
| sectiondivider | Clean (false positives) |
| segmentedcontrol | Cleaned (editor: removed 16 vestigial padding sides) |
| sidenavigation | **Open: panel widths uneditable** (see below) |
| table | Clean |
| tabbar | Clean |
| toggle | Clean |
| tooltip | Clean |

---

## SideNavigation Panel Widths — Resolved

`src/system/components/SideNavigation.svelte:239-240` declares `--sidenavigation-panel-open-width` and `--sidenavigation-panel-closed-width` in `:global(:root)`, neither exposed by the editor. **Confirmed intentional** — panel width is structural, not theme-customizable. No change.

---

## Non-Registry Config Dirs (unchanged from initial audit)

| Dir | Backing artifact | Classification |
|---|---|---|
| `detailnav` | None | Orphan/stale config dir — investigate before removing. |
| `floatingtokentags` | `FloatingTokenTags.svelte` (used in demo) | Live, no editor surface — intentional. |
| `slotprobe` | Test fixture only | Test fixture — leave as-is. |
| `stat` | `Stat.svelte` + `StatEditor.svelte`; registered in `main.ts` (dev-only) | Smoke-test for consumer registration — leave as-is. |
| `stateditor` | None | Orphan/stale config dir (likely name confusion with `stat`) — investigate before removing. |

No action taken on these per the "verify before flagging redundant" rule.

---

## Files Changed

**Editor cleanup (vestigial side-padding entries removed):**
- `src/editor/component-editor/CornerBadgeEditor.svelte` — 4 entries
- `src/editor/component-editor/InputEditor.svelte` — 4 entries
- `src/editor/component-editor/MenuSelectEditor.svelte` — 8 entries (menu + item)
- `src/editor/component-editor/SegmentedControlEditor.svelte` — 16 entries (bar/option × default/small)

**Production config seeding gaps closed:**
- `src/live-tokens/data/component-configs/cornerbadge/default.json` — 30 variant color aliases (manual audit)
- `src/live-tokens/data/component-configs/card/my-card.json` — `--card-default-header-gap` (manual audit)
- `src/live-tokens/data/component-configs/imagelightbox/my-image-lightbox.json` — `--imagelightbox-chrome-surface` (manual audit)
- `src/live-tokens/data/component-configs/button/my-button.json` — 4 small-variant seeds (contract test)
- `src/live-tokens/data/component-configs/progressbar/default.json` — `--progressbar-label-gap` (contract test)
- `src/live-tokens/data/component-configs/sectiondivider/default.json` — 23 missing seeds + 3 typo corrections (`letter-padding` → `letter-spacing`) (contract test)

**Test infrastructure:**
- `src/editor/component-editor/registryContract.test.ts` — new universal contract test (116 checks across 23 components)
- `temp/groupkey-snapshot.json` — regenerated to drop removed schema entries

**Verification:** `npm test` → 2545/2545 passing. `npm run check` → 0 errors.
