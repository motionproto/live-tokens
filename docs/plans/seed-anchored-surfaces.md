# Seed-anchored surfaces (design note, not yet approved)

Status: proposal for discussion. Nothing here is implemented.

## Problem

A family's base color (the seed) is what the user edits on the Color Wheel and
sees in the swatches. It is their stated intent: "my brand is light pink."
But the derived `--surface-*` tokens take only hue and chroma from the seed —
lightness comes entirely from the Surfaces scale curve
(`computeDerivedOklch`, `paletteDerivation.ts`). A light pink seed therefore
ships dark maroon buttons: Button, Toggle, IconButton, SegmentedControl,
CornerBadge all paint with `--surface-brand`.

The Color Story now previews the seed composition directly (fills are base
colors, tracking the wheel 1:1). That made the story honest to the user's
intent — and moved the divergence to the shipped tokens: what you approve in
the story is not what a page renders.

## Proposal

Anchor the Surfaces lightness ladder to the seed: keep the curve as the
ladder's SHAPE, but offset it so the `default` step lands exactly at the
seed's lightness:

```
offset  = seedL*100 − sampleCurve(lCurve, x_default)
targetL = clamp(sampleCurve(lCurve, x) + offset, 0, 100) / 100
```

- `--surface-<ns>` (default step) ≈ the seed color exactly (hue passes
  through, saturation multiplier is 100% at the default step).
- `lowest…highest` keep their curve-authored spacing relative to the seed.
- Text scale already multiplies seed L — this unifies Surfaces with that
  seed-relative model.

## Consequences

- Every existing theme re-renders: any seed whose L differs from the curve's
  default-step sample shifts its whole surface ladder. Stock themes and both
  consumer sites need a QA pass. Labeled release; no tokens.css migration
  (names unchanged).
- Curve semantics change from absolute ladder to seed-relative shape. Themes
  with hand-tuned Surface curves move.

## Open questions

1. Borders: same anchoring for consistency, or leave absolute?
2. Background/Neutral/Alternate: their seeds are near-neutral; anchoring
   changes page chrome. Exempt neutrals, or accept?
3. Ladder clipping at extreme seeds (L ≈ 0.95): clamp per step, or compress
   the ladder?
4. The palette ramp (`--color-<ns>-100…950`) has its own lightnessCurve and
   also ignores seed L. `--page-bg` comes from that ramp. Anchor it too?
