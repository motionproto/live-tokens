# Skill evals

`check:skills` and `check:skill-atlas` are static gates: they check structure,
never behaviour. Nothing here has ever measured whether these six descriptions
fire when they should, or whether following a skill end to end produces
anything.

Eight cases, seven on triggering and one on outcome:

| Case | Asks |
|---|---|
| `trigger-refine-warmer` | Does "warmer" reach generate-theme rather than the editor? |
| `trigger-rounder-mid-build` | Does a geometry request mid-page-build cross to adjust-geometry? |
| `trigger-type-voice` | Does a type voice reach pair-fonts rather than generate-theme? |
| `trigger-confusable-pair` | Does "X or Y" reach the picker rather than the authoring skill? |
| `trigger-single-token` | Does a single-token edit fire **nothing**? |
| `trigger-density-phrasing` | Does "feels cluttered" reach adjust-geometry at all? |
| `trigger-ambiguous-buttons` | Does an ambiguous request get a question rather than a guess? |
| `outcome-theme-from-brief` | Does following generate-theme produce a real theme? |

Three of these are negatives, and that is the point. A suite of only positive
cases scores an added trigger word as a free win, which is how a description
grows without bound. `trigger-single-token` and `trigger-ambiguous-buttons`
give over-reach a cost; `trigger-rounder-mid-build` and `trigger-type-voice`
put two siblings in contention on purpose.

`trigger-density-phrasing` tests a claim the audit made without measuring:
that the risk here is undertriggering rather than sibling contention. A
failure is a gap in the description, not in the model.

## Running

```
claude plugin eval .claude
```

The runner adds a no-plugin baseline arm on its own, so the score separates
what the skills contribute from what the model would have done anyway.

**These cases have never been run.** `claude plugin eval` is in early access
and refuses on an account without it, so the suite is authored against the
documented layout (`prompt.md` plus `graders/*.md` per case) and unverified.
Expect to fix the case files on the first real run.

`outcome-theme-from-brief` writes to the live data tree. Restore it afterwards
with the commands in `CLAUDE.md`, or run that case alone with `--case`.
