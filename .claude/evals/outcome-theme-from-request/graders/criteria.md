---
type: llm
---

This case grades the outcome, not just the trigger.

PASS requires all of:
- live-tokens-generate-theme fires.
- A base color file is written to `scratch/<slug>-base-colors.json` with all ten base colors.
- `npx live-tokens generate-theme` is run against that file, not hand-authored JSON.
- The run exits 0, or exits 1 and the model fixes the named base color and re-runs.
- live-tokens-set-fonts and live-tokens-adjust-geometry are both invoked,
  since the request implies type and geometry.

FAIL when theme JSON is hand-written, when the data tree is edited directly,
or when the sibling skills are skipped without the user having asked for
colour alone.

Restore the data tree afterwards; see CLAUDE.md.
