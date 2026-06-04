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

## Decision

_(fill in: GO or NO-GO, with the bucket table and drift evidence that justifies it.)_
