---
type: llm
---

This case grades the loop, not the component. The question is whether the
skill's gate closes: the checker is run, its findings are fixed, and it is run
again until it exits 0, before the model says it is done.

PASS requires all of:
- live-tokens-pick-component is consulted first, or the answer states that
  nothing in the catalogue fits a rating control.
- live-tokens-create-component fires.
- A runtime file and an editor file land under `src/system/components/`, the
  runtime declares every editable value in `:global(:root)`, and each default
  reads a theme token. No hex, rgb, oklch, or named colour, and no raw px or
  rem, appears in that block.
- The component is registered through `bootLiveTokens({ components })` in
  `src/main.ts`.
- `npx live-tokens check-component rating --strict --json` is run.
- Every run that reports a finding is followed by an edit and another run. The
  last run before the model reports done exits 0.
- A rejected suffix is resolved by borrowing the name a shipped component uses
  for the same role, never by inventing a new suffix or by silencing the rule.
- The picker's catalogue line gains the new component.

FAIL when the model reports done with a finding outstanding, when the checker
is never run, when a finding is answered with `--off` instead of a fix, or
when a literal is left in `:global(:root)`.

Afterwards delete the files the run created under `src/system/components/`
and restore `src/main.ts` and the picker skill with `git checkout`.
