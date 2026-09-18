# Skill evals

`check:skills` and `check:skill-atlas` are static gates: they check structure,
never behaviour. Nothing here has ever measured whether these descriptions
fire when they should, or whether following a skill end to end produces
anything.

Eleven cases, seven on triggering and four on outcome:

| Case | Asks |
|---|---|
| `trigger-refine-warmer` | Does "warmer" reach set-colors rather than the editor? |
| `trigger-rounder-mid-build` | Does a geometry request mid-page-build cross to set-geometry? |
| `trigger-type-voice` | Does a type voice reach set-type rather than create-theme? |
| `trigger-confusable-pair` | Does "X or Y" reach the picker rather than the authoring skill? |
| `trigger-single-token` | Does a single-token edit fire **nothing**? |
| `trigger-density-phrasing` | Does "feels cluttered" reach set-geometry at all? |
| `trigger-ambiguous-buttons` | Does an ambiguous request get a question rather than a guess? |
| `outcome-theme-from-request` | Does create-theme route three intents and produce a real theme? |
| `outcome-component-from-brief` | Does create-component reach its gate, run `check-component --strict`, and iterate to exit 0? |
| `outcome-page-from-brief` | Does create-page run `check-page --strict` on the new page and iterate to exit 0? |
| `outcome-pick-component` | Across twelve requirements spanning every family, does the catalogue change which component, variant, and props the model names? |

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

**These cases have never been run.** `claude plugin eval --help` answered on
this account, but a run was refused with "`plugin eval` is currently in early
access" (tried 2026-09-02 on `trigger-confusable-pair`). The suite is authored
against the documented layout (`prompt.md` with frontmatter, plus `graders/*.md`
each carrying a `type:`) and unverified. Expect to fix the case files on the
first real run.

**`outcome-pick-component` was tried on 2026-09-18** with
`claude plugin eval .claude --case outcome-pick-component --trust-plugin
--allow-tools Bash`. The early-access refusal is gone. All 3 runs scored 0.00
and errored instead: this machine's `~/.docker` credential store holds a
symbolic link, the Bash sandbox cannot reliably exclude it, and a
Bash-granting run cannot proceed. The run also reported that no plugin
resolved, so the case ran against baseline Claude Code, not the skills:
`.claude` has no `.claude-plugin/plugin.json`. Both are machine and repository
setup, not the case files; case-file correctness is still unverified.

The two component and page outcome cases each carry a deterministic
`tool_used` grader beside the rubric: the gate counts as closed only if a
`Bash` call ran the checker with `--strict` against the new id or file. The grader
confirms the agent ran the gate; the rubric grades the iteration.
`outcome-pick-component` carries the same kind of grader with a narrower bar:
a `Bash` call has to reach `live-tokens components` at all, since this case
has no checker to run to exit 0.

The three outcome cases above write into the tree. `outcome-theme-from-request`
writes to the live data tree; restore it with the commands in `CLAUDE.md`. The
other two create source files and edit `src/main.ts`, `src/App.svelte`, and
the picker skill; each grader ends with the restore step. Run one at a time
with `--case`, and pass `--allow-tools Bash Write Edit` or the agent cannot
reach the gate. `outcome-pick-component` only reads: its `allowed_tools` omit
Write and Edit, and it needs only `--allow-tools Bash`.
