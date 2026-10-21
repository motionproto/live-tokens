---
name: evaluate
description: "Run and read this repository's billing eval under Harbor. With no argument, one smoke trial of about a quarter of an hour checks that the eval works. With `full`, all seven arms run, five trials for each of the three loop arms and three for the rest, about two hours. With `runs <n>`, every arm runs n trials. Use when the user asks to run the evals, test whether the skills or the CLI help, compare eval arms, or read an eval report. Only for the live-tokens repository."
argument-hint: "[full | runs <n>]"
---

# Evaluate

The eval gives one brief to seven arms and compares what each builds. The
cases live in `.claude/evals/outcome-build-billing*/`, and the
"`outcome-build-billing`: lookup and checker" section of
`.claude/evals/README.md` describes the brief, its traps, the graders, and
the arms. `npm run eval:billing` runs `scripts/eval-harbor.sh`, which runs
each arm as a Harbor job in Docker and writes the report. Every trial is a
fresh Claude Code session in a fresh container, so nothing in this
conversation reaches the arms.

## Before a run

- Confirm `scripts/eval-harbor.sh` exists. Without it this is not the
  live-tokens repository, so stop and say so.
- Run `docker info`. If it fails, ask the user to start Docker Desktop. The
  eval runs its own containers beside any the user has running.
- Run `command -v harbor`. If it prints nothing, ask the user to install
  Harbor with `uv tool install harbor`.
- Run `test -s "${LIVE_TOKENS_EVAL_TOKEN_FILE:-$HOME/.config/live-tokens-eval/oauth-token}"`.
  If it fails, ask the user to run `claude setup-token` and save the token
  it prints in that file. Never read, print, or copy the file; the runner
  reads it into the trial's environment itself.
- The runs use the user's subscription. Never set an API key.

## Choosing the run

The argument is `$ARGUMENTS`.

- **Smoke run**, `npm run eval:billing -- --smoke`: one trial of the arm with
  every tool. Run it when the argument is empty, after any change to the
  cases, the skill copies, the Harbor files, the scorer, or the package, and
  whenever the user has not asked for a full run. After a change that
  touches one arm, `--smoke <arm>` runs that arm once; the arm names are the
  first column of the arms table in `scripts/eval-harbor.sh`.
- **Full run**, `npm run eval:billing`: every arm at its trial count, five
  for the three loop arms and three for the other four, 27 trials. Run it
  when the argument is `full`.
- **Even run**, `npm run eval:billing -- --runs <n>`: every arm, `n` trials
  each. Run it when the argument is `runs <n>`. When the user asks for a
  full run with a number, use this and say how many trials that makes.
- **Chosen arms**, `npm run eval:billing -- --runs <n> <arm>...`: only the
  named arms, `n` trials each. Use it when the user asks to run some arms
  or to firm up one comparison, and say how many trials that makes. The
  report and its rank tests cover the arms that ran.

Before starting, tell the user how long to expect. A trial took 7 to 12
minutes on 2026-10-18, scoring included, and each arm runs three trials at
once. A smoke run takes about a quarter of an hour with the image builds. A
full run takes about two hours: an arm of three trials takes about as long
as one trial, and an arm of five about twice that. A trial can run to an
hour of agent time and half an hour of scoring before Harbor stops it. The
run lasts only as long as this session, and it stalls if the Mac sleeps, so
say both.

Start the command with `run_in_background` and wait for its notification. Do
not poll it.

## Reading the result

The command ends by printing a table of means per arm and the report path,
`eval-reports/<time>/index.html`, or `eval-reports/<time>-smoke/` for a
smoke run. The report opens with Insights: findings the builder derives
from the runs by fixed rules, each linked to the table row or the run panel
that supports it. Give the user the table and the path, then name what
separates the arms:

- **Grader score**: the share of component-choice graders that pass.
- **Checker errors left**: what the full checkers find in the finished page
  and new component, browser tests included. A fresh verifier container
  checks every arm the same way. The static-loop and gate arms ran only the
  static checks while they worked; the gate arm met the browser tests at
  each stop.
- **Generation seconds, turns, generation cost**: the agent's session from
  prompt to final answer, page and components included. Cost is the
  list-price value of the tokens; the subscription covers it. Scoring time is
  left out.
- **Checker runs, lookups**: counted from the trace. Lookups count each
  component and scale looked up, each item of a shell loop included. An arm
  without the tool has none. A checker run counts by its call, and the
  timeline marks its result unread when the agent kept the output out of
  the trace.
- **Failed checker calls, failed lookups**: calls the arm's patched CLI
  blocked. The skills name both tools, so an arm without one tries it and
  spends a turn or two finding it gone. The report's "Blocked calls" table
  gives the turns, seconds, and cost that took, and "Means without blocked
  calls" gives the means with it taken out. Compare arms on that table.
- **Skills loaded, source reads**: the skills the agent invoked, and its reads
  of the package's own source in `node_modules`. Source reads stand in for a
  missing lookup, or for an argument with a checker rule.
- **Gate blocks**: how often the browser gate held the gate arm's run open,
  and the rules behind each block. The gate lets a run end on its fourth
  stop.
- **Rank tests**: for each pair of the three loop arms, and each pair of
  arms one tool or setting separates, an exact Mann-Whitney test on errors
  left, generation seconds, cost, checker runs, and source reads over
  finished runs. Give the p value with the medians.
- **Behaviour**: each run's timeline in the arm's panel. Compare two arms
  with Compare: which skill each loaded first, when it looked components up,
  what the checker reported, and how the agent answered it.
- **New components, new tokens, literal values**: whether the run authored
  the calendar, and what it added outside the design tokens.

Read the Finished column first. The runner caps each trial at 200 turns and
an hour of agent time, and the report flags every run that hit a cap. A
capped run stopped before the agent said it was done, so its numbers measure
the cap. Compare arms only on finished runs, and tell the user when an arm
has none.

Tell an eval fault from an agent fault before drawing conclusions:

- `n/a` in the skills, checker run, and lookup columns means the report
  found no session log for the trial, and the note "the verifier wrote no
  findings.json" means scoring failed. Both are faults in the eval. Read the
  trial's `trial.log` and `verifier/` folder under
  `scratch/harbor/jobs/<time>/<arm>/`.
- "Did not finish" names the exception Harbor recorded for the trial.
- A note that the run changed `brand.json` means the verifier scored it
  against the image's copy of the theme.

Fix eval faults in the case files, the Harbor files in
`.claude/evals/harbor/`, `scripts/eval-harbor.sh`, or
`scripts/eval-check-build.mjs`, then run the smoke run again before a full
run.

## Writing the conclusions

After reading the report, write `conclusions.md` beside its `index.html`
and rebuild the report, which renders the file above the Insights. Number
each conclusion and open it with a bold sentence that states it. Back each
one with the insight or rank test it rests on, linked by the report's own
anchors: `#insight-<head>` for an insight, `#rank-<arm>-<arm>-<measure>` for
a rank test, and `#arm=<arm>&run=<n>` for a run. Where the run confirms or
revises an earlier report, link that report's conclusions with a relative
path. Close with what the run leaves to do next. A rebuild leaves the file
in place.

A change to how the scorer reads traces or lays out the report needs no new
runs. Rebuild a report from its jobs folder in seconds:

```sh
node scripts/eval-check-build.mjs scratch/harbor/jobs/<time> --out eval-reports/<time>
```

## Changing the brief

Every arm gets the brief of `outcome-build-billing/prompt.md`, and the three
other billing cases keep the same brief for plugin-eval runs. Edit all four
`prompt.md` files identically, update the grader notes that quote it, and
update the README section. The runner refuses to start when a case's graders
differ from `outcome-build-billing`'s. Keep the brief in a client's voice: the
catalogue's own wording would let an arm match words instead of using the
lookup.
