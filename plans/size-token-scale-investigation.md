# Investigation: does the system need a size-token scale?

Charter for a fresh session. Decide — with evidence — whether to add a sizing
(dimension) token scale, or whether the current literals are fine. **Do not mint
tokens for symmetry.** The output of this work is this doc, updated with findings
and a go/no-go recommendation, before any code changes.

## Why this exists

The `image-lightbox-gallery-portal` review surfaced control-size literals with no
token to map to. The system has `--space-*` (spacing) and `--icon-size-*` only —
**no sizing scale**. Spacing governs gaps *between* things (padding/margin/gap);
sizing governs the *extent* of a thing (a box's width/height). Reusing `--space-*`
for a control's dimensions conflates the two; they drift apart over time.

Known literals so far (not exhaustive — that's the audit):
- `ImageLightbox.svelte`: close + nav `2.75rem` (44px, min touch target), zoom
  buttons `2.5rem`, toolbar label `min-width: 3.5ch`.
- `Dialog.svelte`: close `2.25rem`, `width: 500px` default.

The `2.25` / `2.5` / `2.75rem` cluster is the smell: three control hit-areas at
three values. Intentional, or drift? That's the crux.

## Constraints (do not violate)

- `[[feedback_no_new_tokens]]` — be conservative; new `--surface/--text/--color`
  theme tokens are off-limits. A *sizing* scale is a new primitive category, so it
  needs an explicit, justified decision, not a reflex.
- `[[feedback_scale_changes_need_migration]]` — adding/removing a `tokens.css`
  primitive must ship a paired migration in `vite-plugin/tokensCssMigrations`.
  A new `--size-*` scale is additive (no migration needed to *add*), but any change
  to existing primitives is not.
- `[[feedback_no_fallbacks_or_redundant_tests]]` — correct by construction; no
  speculative tokens "in case".
- `[[feedback_concrete_before_architecture]]` — walk the instances first; only then
  decide on the system-level generalization.

## Method

1. **Collect.** Grep every width/height/min-/max- literal in `rem`/`px`/`ch`/`em`
   across `src/system/`, `src/editor/`, `src/app/` (components + chrome). Capture
   file:line, the property, and the value. Exclude `1px` hairlines, `0`, focus-ring
   `2px`, and `%`/`vw`/`vh` (those are structural geometry, leave them literal).
2. **Bucket** each hit:
   - control hit-area (button/icon-button/toggle square or min-height)
   - media/avatar/thumbnail fixed dimension
   - component min/max extent (dialog/menu/tooltip width, text measure)
   - genuine one-off structural geometry (leave literal)
3. **Measure drift.** Within each bucket, list the distinct values. A bucket with
   one or two values is fine as literals; a bucket with a spread of near-but-not-equal
   values (the 2.25/2.5/2.75 case) is the evidence a scale would fix.
4. **Distinguish editor/app chrome from shipped components.** `[[feedback_app_surfaces_use_tokens]]`
   already asks first-party chrome to tokenize design values; shipped components
   declare their own `--component-*` tokens. A size scale, if warranted, should serve
   both — confirm which surfaces actually carry the recurrence.

## Go / no-go bar

Recommend a scale ONLY if BOTH hold:
- **Recurrence:** the same conceptual size (esp. control hit-area) appears in 3+
  components, AND
- **Drift it would fix:** those occurrences are inconsistent today in a way that is
  accidental, not intentional.

If only one holds, recommend leaving literals (and note the 44px a11y floor as a
documented convention, not a token).

## If GO — design questions to answer in this doc before coding

- **Shape:** numeric (`--size-9` = 36px … `--size-11` = 44px, on a 4px grid) vs
  semantic (`--size-control-sm/md/lg`). Numeric mirrors `--space-*`; semantic reads
  better at call sites. Pick one and justify.
- **The 44px problem:** the touch-target floor is *off* the 4px grid (40 → 44 → 48).
  A numeric grid scale can't express 44 cleanly — does that push toward a semantic
  `--size-control-md: 2.75rem`? This is the same wall the lightbox hit.
- **Theme vs component:** is this a global primitive in `tokens.css`, or per-component
  `--imagelightbox-chrome-size`? Global only if the audit proves cross-component reuse.
- **Editor exposure:** does any of this need to be editor-tunable (a picker), or is it
  a fixed primitive? If tunable, route through the existing token machinery; if fixed,
  keep it out of `allTokens` (cf. `--imagelightbox-tile-object-fit`).
- **Migration:** additive `--size-*` needs none; confirm. Document the rollout (pilot
  on ImageLightbox + Dialog control sizes first).

## Findings

Audit run across `src/system/components/` (shipped), `src/editor/` and `src/app/`
(chrome) for every width/height/min-/max- literal in rem/px/ch/em.

### Bucket A — control hit-area (square icon-buttons, explicit `width == height`)

| Value | px | Component | Element | Site |
| --- | --- | --- | --- | --- |
| 2.25rem | 36 | Dialog | close | `Dialog.svelte:290` |
| 2.5rem | 40 | ImageLightbox | zoom in / out | `ImageLightbox.svelte:905` |
| 2.75rem | 44 | ImageLightbox | close, prev, next | `ImageLightbox.svelte:816,831` |

This is the cluster the lightbox review flagged. Two facts kill it as scale evidence:

1. **Recurrence is 2 shipped components, not 3+.** Only Dialog and ImageLightbox
   express a control as a fixed `rem` square. Every *other* interactive control
   (Button, Input, Toggle, SegmentedControl, MenuSelect, TabBar, Badge) derives its
   height from `padding-block + font-size × line-height`, and deliberately varies it
   per size-variant (≈1.75rem small → 2.5rem default). They have no square hit-area to
   unify with.
2. **The 2.25/2.5/2.75 spread is intentional, not drift.** 2.75rem (44px) is the touch
   -target floor, used for the lightbox's *primary* nav (close/prev/next). 2.5rem (40px)
   is the *secondary* zoom toolbar. 2.25rem (36px) is a desktop-only modal close where
   touch is not a concern. That is a deliberate primary/secondary/desktop hierarchy, not
   three accidental near-values.

Even the editor's own shared square button (`UISquareButton.svelte:73`) is padding
-driven (`--ui-font-size-md` + `--ui-space-*`), not a fixed `rem` square. So across the
*entire* codebase the only fixed-`rem` control squares are these two components.

### Bucket B — component extent (width / max-width)

**Runtime components are fluid by design.** Card, Panel, MenuSelect, Tooltip,
Notification, Callout, CollapsibleSection, CodeSnippet set no fixed extent — they flow
to `100%` / `max-content` / the container. The only fixed runtime extents are:
- `Dialog.svelte:45` — `width: 500px` default, already **prop-overridable**. One value.
- `SideNavigation.svelte:252` — `16rem` / `3rem`, already **locally tokenized** and
  override-able.

The 24/26/28/32/34/46rem "cluster" lives entirely in **editor preview wrappers**
(`CardEditor`, `PanelEditor`, `InputEditor`, `NotificationEditor`, `ProgressBarEditor`,
`SectionDividerEditor`, `CodeSnippetEditor`). These frame the demo stage; they are
chrome, independent per component, and not a product API. Tokenizing them would unify
nothing a consumer can see.

### Re: applying sizes to Card / Dialog width / Panel width (the added question)

This **conflicts with the existing design** rather than aligning with it:
- **Card and Panel have no width on purpose** — they are fluid containers the consumer
  sizes via layout. A `--size-*` width scale would impose a fixed extent where
  fluid-to-container is the intended contract; that is a regression, and it is
  "minting tokens for symmetry," which the charter and `[[feedback_no_new_tokens]]`
  forbid.
- **Dialog width is a single value** already exposed as a prop. One value is a literal,
  not a scale.

### Incidental: a dead `--size-*` scale already exists

`tokens.css:419–425` defines `--size-icon-sm … --size-icon-4xl` (7 vars). **Zero code
references them** (the live icon scale is `--icon-size-*`, 55 uses). It is a prior
"size" namespace minted for symmetry and never consumed — the exact anti-pattern this
charter guards against, already sitting in the file.

## Decision: NO-GO

Do **not** add a global `--size-*` sizing/extent scale. Both halves of the go/no-go bar
fail:

- **Recurrence** — the only recurring fixed-size pattern (square control hit-area) spans
  2 components, below the 3+ bar; container widths are deliberately fluid, so there is
  no recurring extent to scale at all.
- **Drift it would fix** — the 2.25/2.5/2.75 values are an intentional
  primary/secondary/desktop hierarchy, not accidental drift. There is no drift to fix.

### Instead (surgical, no new primitive)

1. **Document the 44px touch-target floor as a convention, not a token.** Add a one-line
   comment at the lightbox close/nav rules naming `2.75rem` as the min touch target.
   This is the brief's own fallback when only the a11y floor recurs.
2. **Leave the control squares as local literals.** If they ever need to move together,
   promote to *per-component* vars (`--imagelightbox-chrome-size`, `--dialog-close-size`)
   — local, editor-tunable if desired — never a global primitive. Do not unify Dialog's
   36px with the lightbox's 44px; they answer different needs.
3. **Delete the dead `--size-icon-*` scale** (`tokens.css:419–425`). It is unused and
   confusable with `--icon-size-*`. Removal is a `tokens.css` primitive change, so per
   `[[feedback_scale_changes_need_migration]]` it must ship a paired migration in
   `vite-plugin/tokensCssMigrations` — though the migration is a no-op for consumers
   since nothing references the tokens. (Separate, optional cleanup; not blocking.)
