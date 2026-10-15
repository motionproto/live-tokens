---
name: evaluate
description: "Run and read this repository's skill evals. With no argument, one smoke run of up to an hour checks that the eval works. With `runs <n>`, all five arms (unattended, skills only, skills with the lookup, skills with the checker, skills with both) run n times each, one after another, so three runs each take several hours. Use when the user asks to run the evals, test whether the skills or the CLI help, compare eval arms, or read an eval report. Only for the live-tokens repository."
argument-hint: "[runs <n>]"
---

# Evaluate

The eval gives one brief to five arms and compares what each builds. The cases
live in `.claude/evals/outcome-build-billing*/`, and the "`outcome-build-billing`:
lookup and checker" section of `.claude/evals/README.md` describes the brief,
its traps, and the graders. `npm run eval:billing` runs everything and writes
the report. Every run is a fresh session in a fresh copy of the consumer
project, so nothing in this conversation reaches the arms.

## Before a run

- Confirm `scripts/eval-billing.sh` exists. Without it this is not the
  live-tokens repository, so stop and say so.
- Run `docker ps -q`. If it prints anything, ask the user to stop their
  containers. Never stop them yourself. The eval quits Docker Desktop for the
  length of the run and relaunches it afterwards.
- The runs use the user's subscription. Never set an API key.

## Choosing the run

The argument is `$ARGUMENTS`.

- **Smoke run**, `npm run eval:billing -- --smoke`: one run of the case with
  every tool, up to an hour. Run it when the argument is empty, after any
  change to the cases, the fixtures, the scorer, or the package, and whenever
  the user has not asked for a full run.
- **Full run**, `npm run eval:billing -- --runs <n>`: all five arms, `n` runs
  each, up to an hour per run. Run it when the argument is `runs <n>`. When
  the user asks for a full run without a number, confirm `n` and say how many
  runs that makes before starting.

Before starting, tell the user how long to expect. Runs go one after
another, each capped at an hour and 200 turns; a full build has taken about ten minutes.
A smoke run takes up to an hour. A full run of `n` makes `5 × n` runs, so
`runs 3` takes several hours and up to fifteen. Scoring afterwards adds
about ten minutes per run, mostly the browser tests. The run lasts only as long as
this session, and it stalls if the Mac sleeps, so say both.

Start the command with `run_in_background` and wait for its notification. Do
not poll it.

## Reading the result

The command ends by printing a table of means per arm and the report path,
`scratch/eval-billing/<time>/report/index.html`. Give the user the table and
the path, then name what separates the arms:

- **Grader score**: the share of component-choice graders that pass.
- **Checker errors left**: what the full checkers find in the finished page
  and new component, browser tests included. Every arm is checked the same
  way. Inside the eval, `--tests` runs the static checks only, because the
  sandbox cannot start a browser, so the checker arms never saw the browser
  rules while they worked.
- **Generation seconds, turns, generation cost**: the agent's session from
  prompt to final answer, page and components included. Cost is the
  list-price value of the tokens; the subscription covers it. Scoring time is
  not counted.
- **Checker runs, lookup runs**: counted from the trace. In an arm without the
  tool, these are failed attempts.
- **Skills loaded, source reads**: the skills the agent invoked, and its reads
  of the package's own source in `node_modules`. Source reads stand in for a
  missing lookup, or for an argument with a checker rule.
- **Behaviour**: each run's timeline in the report. Compare the arms' paths:
  which skill each loaded first, when it looked components up, what the
  checker reported, and how the agent answered it.
- **New components, new tokens, literal values**: whether the run authored
  the calendar, and what it added outside the design tokens.

Read the Finished column first. The runner caps each run at 200 turns and
one hour, its maximums, and the report flags every run that hit a cap. A
capped run stopped before the agent said it was done, so its numbers measure
the cap. Compare arms only on finished runs, and tell the user when an arm
has none.

Tell an eval fault from an agent fault before drawing conclusions:

- `n/a` in a column, or a "no kept workspace" note, means the scorer found no
  workspace or trace. That is a fault in the eval, not in the arm.
- "Did not finish" means the run hit its turn or time limit.
- A case that "wrote no result" stops the script. Read that case's log in the
  same folder.

Fix eval faults in the case files or `scripts/eval-check-build.mjs`, then run
the smoke run again before a full run.

## Changing the brief

The four cases share one brief. Edit all four `prompt.md` files identically,
update the grader notes that quote it, and update the README section. Keep the
brief in a client's voice: the catalogue's own wording would let an arm match
words instead of using the lookup.
