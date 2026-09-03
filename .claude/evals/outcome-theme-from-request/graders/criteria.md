---
type: llm
---

This case grades the outcome, not just the trigger.

PASS requires all of:
- live-tokens-create-theme fires and states one design direction before any file is written.
- Three intents are stated, one per dimension, each an outcome rather than a value.
- live-tokens-set-colors writes `scratch/<slug>-base-colors.json` with all ten base colors and runs `npx live-tokens set-colors` against it, never hand-authored JSON.
- The run exits 0, or exits 1 and the model fixes the named base color and re-runs.
- live-tokens-set-type and live-tokens-set-geometry are both invoked, since the request implies type and geometry.
- The three reports are assembled into one summary.

FAIL when theme JSON is hand-written, when the data tree is edited directly,
when create-theme hands a sibling an OKLCH triple, a font family, or a token
instead of an intent, or when a sibling is skipped without the user having
asked for one dimension alone.

Restore the data tree afterwards; see CLAUDE.md.
