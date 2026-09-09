# Sketch consolidation

Sketch mode draws from `PART_SPECS`, a hand-kept list of 57 rows naming about
65 selectors in `src/editor/core/sketch/sketchLayer.ts`. A consumer's component
never appears in it, so it is drawn only through the four reserved opt-in
classes the layer already provides. Those classes are the system-wide
transformation. This plan moves the shipped components onto them and leaves
`PART_SPECS` holding only what a class cannot express.

Three units, each ending green. Budget the whole plan at about two hours. If a
unit runs past its own budget, stop and report rather than pressing on.

## What the rows actually are

Measured against the current file, not estimated:

| Shape | Rows | Disposition |
|---|---|---|
| `sel` only | 25 | A reserved class replaces the row outright |
| `sel` plus `stem` | 30 (includes the 25) | A class replaces it where the component's tokens already read `--{stem}-surface` and `--{stem}-border` |
| Carries a structural flag | 12 | Stays. `positioned`, `clips`, `unmasked` and `strokeless` are DOM facts no token expresses |
| Overrides `fill` or `stroke` | 21 | Mostly stays, see below |

**Correcting an earlier estimate.** This plan was opened on the claim that the
list could fall from 57 rows to about 12 by conforming token names. The
inventory does not support that. Most of the 21 colour overrides are not naming
violations: they draw an element whose fill and stroke come from *different*
stems. `.card-header` fills from `--card-default-header-surface` and strokes
from `--card-default-border`. `.panel` fills from `--panel-stage-surface` and
strokes from `--panel-frame-border`. A single `stem` cannot say that, and
renaming to force it would change what the tokens mean.

Exactly one row is a genuine naming violation: `.radio-dot` reads
`--radiobutton-default-dot-fill` and `--radiobutton-default-dot-border-color`
where the convention is `-surface` and `-border`.

**So the honest target is 57 rows down to about 27**, by deleting the
class-replaceable rows. The remainder is 12 flag rows plus the cross-stem
colour rows, which are load-bearing.

## Wave 1 — the reserved classes replace the plain rows

Add the matching reserved class to each shipped component whose row carries
only `sel`, or `sel` plus a `stem` its tokens already satisfy, then delete the
row. `references/sketch-mode.md` documents which class suits which shape:
`sketch-surface` for a box, `sketch-container` for a large box that should tilt
less, `sketch-chip` for a small one, `sketch-rule` for a line.

Check each candidate's tokens before deleting its row. A row whose `stem` does
not resolve to real `-surface` and `-border` tokens keeps the row.

**Verify.** `npm run test:e2e:contract` green for all 26. Every component's
`contract-sketch` obligation already asserts its painted parts by fill and
stroke, so a component that stops being drawn, or is drawn from the wrong
token, fails immediately. That suite is the guardrail that makes this safe to
do quickly.

## Wave 2 — support a two-stem row, then collapse the cross-stem overrides

Give `PartSpec` a way to name a fill stem and a stroke stem separately, so
`.card-header` reads as `{ sel, fillStem: 'card-default-header', strokeStem:
'card-default' }` rather than two literal `var(...)` strings. This is a
readability change with no behaviour change, so the contract suite must stay
green with no contract edits at all.

Leave a row explicit where it names a shadow, a radius, or a hatch alongside
its colours, since those already have their own fields.

**Verify.** `npm run test:e2e:contract` green, and `git diff` on
`src/testing/contracts/` empty. A contract edit here means behaviour changed.

## Wave 3 — RadioButton's dot follows the naming convention

Rename `--radiobutton-{state}-dot-fill` to `-surface` and
`--radiobutton-{state}-dot-border-color` to `-border`, then replace the
explicit row with `stem: 'radiobutton-default-dot'`.

**These are public token names, so this needs a migration**, per
`docs/plans/` precedent and the project's token-contract rule. Add one under
`src/editor/core/themes/migrations/`, dated, renaming the aliases in any theme
or component config that carries them. Nine shipped themes plus
`component-configs/radiobutton/default.json` hold these names.

**Verify.** `npm run test:e2e:contract`, `npm test`, `check:preset-themes`,
`check:component-defaults`, and a load of each shipped theme with the tabbar
regression test's shape: the renamed alias survives the migration at its
theme value.

## Test changes this plan needs

Small, and mostly deletions.

- `src/testing/contracts/*.ts`: no change in waves 1 and 2. The `sketch`
  expectations name tokens, not rows, so a component drawn through a class
  asserts exactly as it did through a row. Wave 3 edits `radiobutton.ts` for
  the renamed tokens.
- `src/editor/core/sketch/sketchLayer.test.ts`: holds hardcoded selector lists
  (`UNMASKED` and the size bands). Deleting rows changes those strings, so
  update the expectations in the same commit. The suite already caught this
  once when ImageLightbox's rows landed.
- `src/editor/core/sketch/sketchPartTokens.test.ts`: the gate holding a row to
  colours the component itself assigns. Fewer rows means fewer cases, and a
  component drawn through a class is out of its scope. Confirm it still covers
  every remaining row rather than quietly shrinking to nothing.
- `scripts/lib/componentGate.mjs`: already asserts that Beacon, a consumer
  component with `sketch-surface`, is drawn. That case becomes the same path
  the shipped components take, which is the point of the plan. No edit.

## What this buys

A consumer's component and a shipped one are drawn by the same mechanism, so
`live-tokens-create-component`'s Sketch instructions describe one path instead
of "add a class, unless you are first-party, in which case add a row". The 12
flag rows stay as the honest exception: a DOM fact needs a declaration.
