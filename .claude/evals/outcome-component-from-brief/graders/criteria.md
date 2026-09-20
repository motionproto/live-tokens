---
type: llm
focus: trace
---

This grader reads the trace for one thing the file graders cannot see: the
gate closes before the model says it is done.

PASS requires all of:
- `npx live-tokens check-component rating` is run with `--strict`.
- Every run that reports a finding is followed by an edit and another run.
- The last run before the model reports done exits 0, or the only findings
  left are `tests-not-installed` or `tests-setup`, which the sandbox causes.

FAIL when the model reports done with any other finding outstanding, when the
checker is never run, or when a finding is answered with `--off`.

Name the finding and the turn in the explanation when the verdict is FAIL.
