# Default theme: hand-tuned curves audit

Status: done. All four proposals applied. What shipped is recorded at the end;
the audit below is what the file looked like beforehand.

The shipped `default.json` carries curves that were dragged by hand in the editor
and saved. Every family differs from the code defaults on at least six curves.
Two of those curves are structurally broken, not merely custom.

## What is actually on disk

283 derived vars come out of 10 families. Each family has a palette L/S pair plus
Surfaces/Borders/Text L/S pairs: 80 curves in total, 26 of them carrying values no
one chose deliberately.

### Defects, not preferences

| Curve | Fault |
|---|---|
| `Canvas palette.L` | control points cross: seg 1 runs `86.67 → 54.51` |
| `Brand palette.L` | control points cross: seg 1 runs `55.00 → 54.51` |
| `Success Text.S` | non-monotone, overshoots its own endpoint by 5.45 |

The two crossings share a cause. Both palette L curves end with a hand-dragged
`inDx: -45.49158094126201` on the x=100 anchor, a handle reaching back nearly
half the curve. When an interior anchor lands to the right of x≈54.5, the
endpoint's handle overruns it and the segment stops being monotone in x.
`sampleCurve` binary-searches on x, so past that point it is searching an
unordered axis.

Canvas hits it because its base placement sits at x=80. Brand hits it because of
the legacy x=40 anchor, whose own `outDx: 15` reaches to 55.

`Success Text.S` overshoots on its own: three anchors with dragged handles that
carry the curve above its endpoints.

### Float noise

26 of 80 curves hold values like `-13.415374991989074`, `23.120259446385028`,
`-37.749916095522494`. These are pointer positions, not decisions. The same
constants repeat verbatim across families, so they were dragged once and copied.

### Interior anchors

| Family | Curve | x | Origin |
|---|---|---|---|
| Brand | `palette.L`, `palette.S` | 40 | legacy base placement, flat ±15 handles |
| Canvas | `palette.L`, `palette.S` | 80 | base placement, inserted at load |
| Special, Success, Info, Danger | `Text.L` | 25 | hand-dragged |
| Success, Danger | `Text.S` | 26 | hand-dragged |

Brand's is worth calling out. The tangent fix does not reach it:
`adoptLegacyBaseAnchor` records the placement but leaves the anchor as written,
so Brand still ships the flat ±15 handles and the plateau they create. Canvas
gets the new tangent because its migration path calls `syncBaseAnchor`.

## What each option costs

Measured by re-deriving all 283 vars.

| Option | Vars changed |
|---|---|
| Strip every curve to the code defaults | 257 / 283 |
| Keep the y values, re-derive every handle as a tangent | 115 / 283 |
| Fix only the three defects | ~12 |

Option 2 is large because re-deriving handles on a two-anchor curve gives a
straight line, and most of these are two-anchor curves. The shipped S-curves push
the mid and dark steps darker than a linear ramp; removing them lifts them
visibly (`--color-brand-800` `#5c0033` → `#86004d`).

So "make them smooth" and "make them linear" are the same operation here. Smooth
is only a distinct idea at a join, and only Brand, Canvas, Special, Success, Info
and Danger have joins at all.

## Proposals

**A. Fix the three defects, ship nothing else.** Shorten the `-45.49` endpoint
handles so they cannot overrun an interior anchor, and pull `Success Text.S`
back inside its endpoints. ~12 vars move. This is the only part that is
unambiguously a bug fix.

**B. Round the float noise to 2 decimals.** Costs nothing visually (sub-LSB) and
makes the file readable. Pairs with A.

**C. Re-author the palette L curve as one shared, named shape.** Eight families
carry the identical hand-dragged S-curve. If that shape is intended, it belongs
in code as a named default next to `DEFAULT_PALETTE_LIGHTNESS`, with round
numbers, and the theme file should not repeat it ten times. If it is not
intended, this is the moment to drop it.

**D. Drop Brand's legacy x=40 anchor** and let `syncBaseAnchor` re-place it with
a tangent. Removes the plateau. Moves the Brand mid-steps.

My recommendation: A + B now, since they are corrections rather than redesigns.
C is the real question and deserves its own decision, because it is where the
default theme's character actually lives. D follows C.

## What shipped

All 80 curves are now the straight interpolation between their endpoints:
handles on the secant at a third of the span, every value at 2 decimals. The
endpoint y values are untouched, so each family keeps its own designed range.
No float noise, no control-point crossings, no hand-dragged interior anchors.

The 18 interior anchors that remain are all base-color placements, one per
family per curve, each recorded in `anchorPlacement`. Those are a feature, not
a tuning: they pin the picked color into its own ramp.

Placements were pinned to the steps they historically held. Left to itself the
placement pass moves five of them a step, because the base L maps to a different
nearest step once the ramp is linear — Brand would have slid from 500 to 400.
Which step holds the brand color is a product decision, not a consequence of
tidying handles, so the old steps were written into the file explicitly.

`setCurveAnchor` now scales the neighbours' facing handles by the share of the
gap each one keeps, the same rule de Casteljau uses, and `liftCurveAnchor`
scales them back. Without it a base color dark enough to place near x=100 walks
straight into the crossing this audit found, whatever the file says. A freshly
derived anchor also gives up handle length to whatever room its neighbours
leave — only the new anchor yields, since a stored handle is someone's edit.

135 of 283 derived vars moved. Canvas moved most (28 vars): its base sits at
step 850, where the old curve's dragged tail was doing the most work.

## Not covered

- Whether the default theme should be regenerated wholesale from a light-first
  scheme. See `light-first-theming.md`.
- Per-step overrides: there are none in `default.json`, so nothing to strip.

## Follow-up: the straightened endpoints still bent

The straight-interpolation pass above scaled each endpoint's *existing*
handle down to fit the new gap once a base-color anchor was inserted, rather
than giving the endpoint a tangent aimed at where the anchor actually landed.
An endpoint's handle still pointed along the secant of the *whole* curve, so
whenever the anchor's y wasn't on that straight line (the usual case — that's
the point of pinning it), the segment leaving the endpoint bent to catch up,
reading as a plateau then a kink (visible on Brand: white through 400 nearly
flat, then bending hard around 500).

Fixed in `setCurveAnchor`: a curve's first-ever placement (`smooth = true`,
only reachable when nothing has had a chance to edit it) now gives every
anchor — endpoints included — a tangent computed jointly with its real
neighbour. Re-placements (hue moves after the first) still use the original
scale-and-preserve path, so hand edits made in between are never discarded.
Since the fresh reshape isn't algebraically invertible, `anchorPlacement`
gained `priorLightnessEndpoints` / `priorSaturationEndpoints` — the untouched
originals, captured once and carried forward — so clearing the anchor still
restores the pristine curve exactly.

All 10 families in `default.json` were regenerated through this path,
preserving each family's endpoint y-range and anchor step (same product
decision as before), fixing only the tangents.
