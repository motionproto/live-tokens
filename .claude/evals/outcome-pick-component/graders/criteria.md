---
type: llm
---

This case grades whether the catalogue changes what the model chooses across
a spread of requirements, not the prose of the answer. Grade each of the
twelve rows against `graders/expected.md` independently, then decide PASS or
FAIL for the whole run.

PASS requires all of:
- Every row names the expected component id from `expected.md`, or, for rows
  11 and 12, states that nothing shipped fits and names
  live-tokens-create-component.
- Where `expected.md` fixes a variant, the answer's variant matches.
- Row 9 pairs `Dialog` with a `danger`-variant `Button` (or `IconButton`) as
  the confirm action, not a bare danger button on the page.
- No row invents a component the catalogue lacks, or names a prop the
  component's `Props` interface does not declare.

FAIL on any of:
- An invented component or an undeclared prop.
- Row 11 (a multiple selection) answered with `MenuSelect` or any other
  single-selection component.
- Row 9 answered with a danger `Button` alone, with no `Dialog`.
- A row names a component that one of its own `whenNotToUse` rows rules out
  for that requirement (for example `SegmentedControl` for row 3, where the
  content area is meant to swap).

Score the run as the fraction of the twelve rows that pass, and report which
rows failed and why.
