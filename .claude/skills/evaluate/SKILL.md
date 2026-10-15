---
name: evaluate
description: Run and read this repository's skill evals, which compare an unattended model, the skills alone, the skills with the component lookup, the skills with the checker, and the skills with both. Use when the user asks to run the evals, test whether the skills or the CLI help, compare eval arms, or read an eval report. Only for the live-tokens repository; it does not apply to a project that installs the package.
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

- **Smoke run**, `npm run eval:billing -- --smoke`: one run of the case with
  every tool, up to an hour. Use it after any change to the cases, the
  fixtures, the scorer, or the package, and whenever the user has not asked
  for a full run.
- **Full run**, `npm run eval:billing -- --runs <n>`: all five arms, `n` runs
  each, up to an hour per run. Confirm `n` with the user and say how many runs
  that makes before starting.

Start the command with `run_in_background` and wait for its notification. Do
not poll it.

## Reading the result

The command ends by printing a table of means per arm and the report path,
`scratch/eval-billing/<time>/report/index.html`. Give the user the table and
the path, then name what separates the arms:

- **Grader score**: the share of component-choice graders that pass.
- **Checker errors left**: what the full checkers find in the finished page
  and new component. Every arm is checked the same way.
- **Seconds, turns, cost**: time and loops.
- **Checker runs, lookup runs**: counted from the trace. In an arm without the
  tool, these are failed attempts.
- **New components, new tokens, literal values**: whether the run authored
  the calendar, and what it added outside the design tokens.

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
