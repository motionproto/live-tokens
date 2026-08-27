This case grades the outcome, not just the trigger.

PASS requires all of:
- live-tokens-generate-theme fires.
- A brief is written to `scratch/<slug>-brief.json` with all ten seeds.
- `npx live-tokens generate-theme` is run against that file, not hand-authored JSON.
- The run exits 0, or exits 1 and the model fixes the named seed and re-runs.
- live-tokens-pair-fonts and live-tokens-adjust-geometry are both invoked,
  since the brief implies type and geometry.

FAIL when theme JSON is hand-written, when the data tree is edited directly,
or when the sibling skills are skipped without the user having asked for
colour alone.

Restore the data tree afterwards; see CLAUDE.md.
