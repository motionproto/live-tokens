---
type: llm
---

The session already has a theme open.

PASS when **live-tokens-set-colors** fires. "Warmer" is a color-only
refinement, and set-colors owns the refinement path: recover the base colors,
rotate the hue, re-run.

FAIL when the model edits a single token in the editor, when it fires
live-tokens-set-geometry (warmth is colour, not shape), or when it answers
without firing any skill.

live-tokens-create-theme firing instead is a soft fail: it routes the
refinement to set-colors rather than answering it, so the work still lands in
the right place, but the request named one dimension and reached the
coordinator anyway.
