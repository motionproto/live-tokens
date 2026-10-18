# Billing arms under Harbor

Plan of 2026-10-17. The user approved D1 to D16 on 2026-10-17. D11 to D14
are the recommendations for the former open questions 3 to 6, and D15 and D16
answer the last two. No question stays open.

The billing eval compares five arms on one brief. Today they run under
`claude plugin eval`, whose sandbox refuses a local port and Chromium, so no
arm can run the browser tests and the checker arms see the static rules
alone. A Harbor trial on 2026-10-17 ran the arm with every tool in a Docker
container, where the agent ran `--tests` and acted on the browser findings.
This plan brings the other four arms to Harbor, adds an arm that iterates on
the static checks alone, scores every arm in a fresh container, and moves the
report onto Harbor's output.

The added arm answers whether the browser tests belong in the agent's loop.
In the trial the seven `--tests` calls took 155 s of the agent's 705 s, from
14 to 54 s each, and a static call took under a second. They also caught a
`contract-render` and a `page-overflow` the agent then fixed. The verifier
runs the browser tests on every arm's result, so the pair of arms measures
what the in-loop browser tests buy in quality against what they cost in
time.

## Ground truth

Measured on local main at `e67665c` with the uncommitted eval work of
2026-10-16 and 2026-10-17 in the tree, against Harbor 0.24.0.

1. **The trial worked.** `bash scripts/eval-harbor.sh 1` ran one trial of the
   arm with skills, lookup, and checker
   (`scratch/harbor/jobs/2026-10-17__02-39-39/`): signed in with the
   subscription token, finished with no exception in 11 min 46 s of agent
   time and $2.94 list price, scored 11 of 11 graders, and left one checker
   error. The agent ran the checkers ten times with `--tests` and fixed a
   `contract-render` and a `page-overflow` that only the browser shows.
2. **The token stays out of the output.** `CLAUDE_FORCE_OAUTH=1` with
   `CLAUDE_CODE_OAUTH_TOKEN` signs Claude Code in with the subscription
   (`agents/installed/claude_code.py:1770-1811`). A scan of
   `scratch/harbor/` and the run log found no copy of the token.
   `HARBOR_TELEMETRY=0` stops the PostHog events (`telemetry.py:40,480`).
3. **A task names the arm's skills.** `[environment].skills_dir` is a path
   inside the container whose contents the agent copies into Claude's skills
   folder (`models/task/config.py:456`, `claude_code.py:1688-1699`). An arm
   without skills omits the field.
4. **Harbor can score in a fresh container.**
   `[verifier].environment_mode = "separate"` stops the agent's container,
   then starts the verifier from `[verifier.environment]`, or a fresh copy of
   `[environment]` when none is given, and uploads the task's declared
   `artifacts` into it (`trial/single_step.py:36-53`, `trial/trial.py:898-937`).
5. **Isolation breaks scoring in place.** `isolate.mjs checker` stubs
   `check-page`, `check-component`, and `report`, and deletes the contract
   suites (`_scaffold/isolate.mjs`, `closeChecker`). The trial's verifier,
   `.claude/evals/harbor/grade.mjs`, calls all three in the agent's container,
   so it can score only the arm that keeps the checker.
6. **The arms differ in two layers.** The fixtures pass `isolate.mjs` its
   groups: none for `outcome-build-billing`, `checker` for `-no-checker`,
   `lookup` for `-no-lookup`, `lookup checker` for `-no-cli`. Each ablated case
   has a skill copy in `.claude/evals/_skills/<case>/`, which
   `scripts/eval-stage-skills.mjs` applies and checks against the shipped
   hashes.
7. **`static-checks.mjs` turns `--tests` into the static checks.** Plugin eval
   applies it because its sandbox cannot start a browser. The trial ran
   without it, and only the static-loop arm below needs it under Harbor.
8. **The report reads the plugin-eval layout.** `scripts/eval-check-build.mjs`
   reads the runner's result JSON and `--keep-temp` sandboxes, scores each run
   on the host, and parses stream-json traces. Harbor keeps each trial's
   Claude session at `agent/sessions/projects/-app/<id>.jsonl`, and the same
   parser reads it. It marked nine of the trial's ten checker runs "result not
   read", because the agent wrote the JSON to `/tmp` and printed a summary.
9. **The theme contract fails for want of a saved theme.** The trial's last
   error is `contract-theme`: "the Theme Picker has no theme "brand"". The
   agent passed `--off=contract-theme` to reach exit 0. The evals README
   records the same failure under plugin eval.
10. **The agent had the internet.** `[environment]` defaults to
    `network_mode = public` (`config.py:70`). Under plugin eval the run had no
    route out, and npm's registry was refused.

## Arms

| Arm | Case for graders and copy | `isolate.mjs` groups | Skills | Settings |
|---|---|---|---|---|
| Skills, lookup and checker | `outcome-build-billing` | none | shipped | base |
| Skills, lookup | `outcome-build-billing-no-checker` | `checker` | copy for the case | base |
| Skills, checker | `outcome-build-billing-no-lookup` | `lookup` | copy for the case | base |
| Skills only | `outcome-build-billing-no-cli` | `lookup checker` | copy for the case | base |
| Unattended | `outcome-build-billing-no-cli` | `lookup checker` | none | base |
| Skills, lookup and static checker | `outcome-build-billing` | none | copy without `--tests` | base |
| Skills, lookup, static checker and browser gate | `outcome-build-billing` | none | copy without `--tests` | base and the `Stop` hook |

Every arm gets the same brief, the shared `prompt.md` of the billing cases.
Every arm also gets its own Claude settings file. The base file is empty
today; the gate arm's file adds its hook.

The last arm keeps every tool and differs from the first in one thing: its
skill copy tells the agent to run `check-page` and `check-component` without
`--tests`, and its image applies `static-checks.mjs`, so a `--tests` the agent
passes anyway runs the static checks and says so.

The browser-gate arm runs the static-loop arm's copy and image and adds a
`Stop` hook. `Stop` fires each time the agent finishes responding, and in a
one-prompt run that is when it believes the work is done. The hook runs
`check-page` and `check-component` with `--tests` and without `--off` on the
run's new page and components. When either reports an error, it answers
`{"decision": "block", "reason": <the findings>}`, so the agent keeps working
and the hook runs again at its next stop. After three blocks it lets the run
end, so a finding the agent cannot fix, such as `contract-theme`, ends the run
instead of holding it to the turn cap. The three loop arms then compare the
browser tests at the agent's checkpoints, never, and once at each stop.

## Decisions

- **D1. One table makes every task.** `scripts/eval-harbor.sh` holds the arms
  table above and writes one task per arm under `scratch/harbor/tasks/<arm>/`.
  No arm has hand-written files.
- **D2. Every arm scores in a fresh container.** Each task sets
  `environment_mode = "separate"` with
  `docker_image = "live-tokens-eval-verifier"`: the base image, the project as
  installed with every layer in place, plus the graders at `/tests`. Harbor
  uploads no tests into a verifier that names its own image
  (`models/task/verifier_mode.py:103-108`, `trial/trial.py:949`), and the
  graders cannot sit in the base image every arm derives from. The same rule
  scores the arm that keeps the checker, so all seven meet one bar.
- **D3. The run's own files are the artifacts.** The task declares
  `/app/src`, `/app/tests`, `/app/live-tokens.config.json`, and
  `/app/live-tokens.testing.ts`, the files `eval-check-build.mjs` carries into
  its fresh project today (`RUN_FILES`). Harbor uploads each one into the
  verifier at its own path, over the base project, before the verifier grades
  (`trial/artifact_handler.py:169-212`).
- **D4. The verifier does all the scoring.** `grade.mjs` runs the graders, the
  full checkers with `--tests`, the inventory from `report --json`, and the
  two screenshots, and writes them to `/logs/verifier/`. The host does no
  scoring.
- **D5. The report reads Harbor's job folder.** `eval-check-build.mjs` gains a
  reader for a job folder: per trial, `result.json` for time, cost, and
  reward, the session log for the trace, and the verifier's files for
  findings, inventory, and screenshots. The plugin-eval reader stays for the
  saved reports.
- **D6. A checker run counts by its call.** The trace parser counts a checker
  call that was not blocked as a run whether or not its output is in the
  trace, and shows its result as unread. Errors left come from the verifier,
  so no column depends on what the agent printed.
- **D7. Skill copies key on the arm.** The static-loop arm shares its case
  with the first arm, so its copy lives in
  `.claude/evals/_skills/billing-static-loop/`, and `eval-stage-skills.mjs`
  takes the copy's name from the arms table. The three existing copies keep
  their case names.
- **D8. `eval:billing` moves to Harbor once the smoke passes.** The npm script
  calls `eval-harbor.sh`. The other cases in `.claude/evals/` stay on
  `claude plugin eval`.
- **D9. Each arm runs as its own Harbor job with its own settings file.**
  `eval-harbor.sh` writes `scratch/harbor/tasks/<arm>/settings.json` from the
  arms table and passes it to that arm's job as the Claude Code agent's
  settings, which Harbor uploads as Claude's `--settings` layer
  (`claude_code.py:399-409`). The file stays outside `/app`, so the agent
  never edits its own hooks.
- **D10. The report shows one arm at a time, or two side by side.** Seven
  arms do not fit across a screen. Below the tables, a run picker and an arm
  tab strip select one arm's panel: its metrics, behaviour, findings, and its
  page in a fixed-height window that scrolls inside itself, with the
  desktop and mobile switch. A Compare switch splits the panel into two
  halves, each with its own arm picker, so two arms of one run sit side by
  side, such as the arm with checkpoint browser tests against the gate arm.
  The arrow keys step through the arms, and the selection survives a reload.
  A click on a page still opens it full size.
- **D11. An arm's trials run three at once.** Every job passes `-n 3`, so the
  arms share one load and stay comparable. Wave 2 times one three-trial job
  against the single trials before the first full run relies on it.
- **D12. Five runs for the loop arms, three for the rest.** The three loop
  arms run five trials each and the other four run three, 27 in all. The
  report lists each arm's per-run values and, for each pair of loop arms, a
  Mann-Whitney rank test on errors left, generation seconds, and cost.
- **D13. The browser gate blocks at most three times.** On its fourth stop the
  hook lets the run end. The report shows each gate run's block count and the
  rules behind each block.
- **D14. The copies and the package drop every remaining tool mention.**
  `isolate.mjs` cuts the README's passages on a removed command, the way it
  cuts the usage text. The copies without the lookup drop the pick-component
  mention in `references/interaction-sources.md`. The copy for the arm with
  neither tool drops the `danger-without-dialog` line from Verify: spelling
  the rule out would hand that arm the answer to the `uses-dialog` grader. The
  arms with a tool keep the line, since the lookup prints the constraint and
  the checker enforces it.
- **D15. Every arm gets one fixed theme, `brand`.** The base image ships
  `src/live-tokens/data/themes/brand.json`, a copy of one shipped theme whose
  palette and geometry both differ from the default. The run tests the new
  component's adherence to the theme: its color properties move under brand
  through the design tokens they alias, and its geometry stays on the steps
  it was built with, since a theme assigns geometry only to the components it
  holds a block for. The name and the color-property example both match
  `references/contract-tests.md`. The run uses the theme and leaves it alone:
  the verifier puts the image's copy back before it scores, and the report
  flags a run that changed it.
- **D16. The agent's container reaches the Anthropic API alone**, through
  `[environment].allowed_hosts`. A run that tries `npm install` or a web read
  fails at once, as it did under plugin eval. Wave 2's first trial confirms
  that Claude Code signs in and finishes; any other host it needs joins the
  list.

## Waves

## Wave 1: seven tasks and the separate verifier

- Extend `eval-harbor.sh` to take an arm list (default all seven), build the
  base image once, and write each task from the arms table: the arm's
  Dockerfile (`FROM live-tokens-eval-base`, run `isolate.mjs <groups>`, copy
  the staged skills to `/opt/skills`), `task.toml` with `skills_dir` per D1,
  the separate verifier per D2, and the artifacts per D3.
- Move `grade.mjs` to score per D4 the artifacts Harbor put into `/app`.
- Write the static-loop copy per D7: `create-page` and `create-component`
  with `--tests` and the browser-only sentences of their Verify sections
  removed, and the `contract-tests.md` lines that call `--tests`.
- Write each arm's settings file per D9, and the browser-gate hook,
  `.claude/evals/harbor/browser-gate.mjs`, which the gate arm's file names.
  The hook keeps its block count in `/tmp`, outside the files the verifier
  collects.
- Apply D14: the README cut in `isolate.mjs`, the
  `interaction-sources.md` copies for the no-lookup and neither cases, and
  the Verify line in the neither copy, then rehash the copies.
- Set the gate's limit per D13.
- Add `brand.json` to the base image per D15, choosing the shipped theme by
  diffing each one against the default; set `allowed_hosts` per D16.
- `--prepare` builds all seven images.

Verify: `--prepare` builds seven images. In the gate arm's container, the
hook blocks on a page with a known browser-only defect, passes a clean one,
and lets the run end on its fourth stop. In each closed arm's image, the
package README names no command the arm lacks. In each image, `npx live-tokens
components` and `check-page` succeed or fail as the arm's groups say,
`/opt/skills` holds the staged copy (or is absent for the unattended arm),
and `node_modules/@motion-proto/live-tokens/.claude` is gone. Running the
verifier image on the trial's saved files reproduces 11 of 11 graders, and
`contract-theme` finds the `brand` theme in the Theme Picker. A run that edits
`brand.json` is scored against the image's copy and flagged.

## Wave 2: smoke of every arm

- One trial of each arm, run one after another.
- One job of the arm with every tool at three trials and `-n 3`, timed against
  its single trials, per D11.

Verify: seven trials finish with no exception under the host limit of D16,
each verifier writes a reward,
findings, inventory, and two screenshots, and the token scan of
`scratch/harbor/` finds nothing.

Result of 2026-10-18 at `5af0322`. `scratch/harbor/jobs/2026-10-18T15-33-23/`
holds one trial of each arm. All seven finished with no exception under
`allowed_hosts = ["api.anthropic.com"]`, and Claude Code needed no other
host. Each verifier ran in separate mode and wrote `reward.json`,
`findings.json`, `inventory.json`, `desktop.png`, and `mobile.png`. No run
turned a rule off or changed `brand.json`. No agent tried npm or a web read,
so the refusal went untested. Costs are list price.

| Arm | Agent s | Cost | Graders | Errors left |
|---|---|---|---|---|
| skills-lookup-checker | 669 | $2.61 | 11/11 | 0 |
| skills-lookup | 470 | $2.05 | 11/11 | 9 |
| skills-checker | 635 | $2.39 | 11/11 | 0 |
| skills-only | 350 | $2.10 | 10/11, `uses-radiobutton` failed | 12 |
| unattended | 546 | $3.42 | 11/11 | 4 |
| static-loop | 441 | $2.04 | 11/11 | 2 |
| browser-gate | 506 | $2.34 | 11/11 | 0 |

The gate blocked once, on two `page-overflow` errors from `check-page` and
two `contract-render` errors from `check-component`, and passed at the next
stop.

Every trial's `artifacts/manifest.json` marks `/app/live-tokens.config.json`
as `failed`, because the base project has no such file. The job-folder
reader treats that entry as absent, as `grade.mjs` does.

`scratch/harbor/jobs/2026-10-18T16-45-07/` holds the D11 job: three trials of
the arm with every tool at `-n 3`. The job took 661 s of wall time against
734 s for the single trial above. Its agent times were 445, 587, and 603 s
against 669 s, and its `--tests` calls took 15 to 56 s each against 13 to
84 s alone. The containers peaked at 3.9 GiB of Docker's 7.7 GiB. All three
trials scored 11 of 11 with no errors left, so three at once slowed no trial.

The token scan of `scratch/harbor/` found no copy.

## Wave 3: the report

- Add the job-folder reader per D5 and the parser change per D6. The report
  keeps its tables: means per arm, blocked calls, and means without blocked
  calls.
- Replace the side-by-side columns with the arm panel and Compare per D10.
- Add the per-run values and the rank tests per D12, and the gate's block
  counts per D13.

Verify: the report built from Wave 2's jobs opens on one arm's panel, the arm
tabs and the arrow keys step through all seven, Compare shows any two arms of
a run side by side, the page window scrolls inside itself at desktop and
mobile width, and the means match a hand count from the seven `result.json`
files.

Result of 2026-10-18 at `4f6538b`. `node scripts/eval-check-build.mjs` read
both Wave 2 jobs, `2026-10-18T15-33-23/` and `2026-10-18T16-45-07/`, and the
report opened on the Unattended panel. A Playwright pass found that the seven
tabs and the arrow keys reach every arm and wrap, Compare shows all 49 ordered
pairs of run 1 side by side, and the run picker moves both halves. The page
window scrolled under the wheel while the page held still, at desktop and
mobile view and on a 390 px screen. The run, the arms, Compare, and the view
survived a reload. Each arm's agent seconds, cost, grader score, and errors
left match a hand count from `result.json`, for the seven smoke trials alone
and for all ten.

A Claude Code session log repeats tool calls in `api-request-blob` entries,
which double-counted lookups, checker runs, and skills until the parser
skipped them. On the saved plugin-eval report of 2026-10-16, blocked status
read from the arm's grants gives the same tables as the old reading of the
output.

## Wave 4: switch-over and docs

- Make the arms table in `eval-harbor.sh` the only one, per D1: the runner
  writes it into each job folder, and `eval-check-build.mjs` reads each arm's
  name and grants from there in place of its own `HARBOR_ARMS` list.
- Point `eval:billing` at `eval-harbor.sh` per D8, with `--smoke` and a full
  run that takes the run counts from D12 and the concurrency from D11.
- Rewrite the billing sections of `.claude/evals/README.md`, the `evaluate`
  skill, and the eval paragraph in `CLAUDE.md`: Harbor, Docker running, the
  token file, and the time per run.

Verify: `npm run eval:billing -- --smoke` runs the arm with every tool end to
end and writes the report.

## Invariants

- Each arm reaches only the layers its row grants: `isolate.mjs` closes the
  package, the staged skills are the arm's only skills, and its settings file
  is the only one it loads.
- Every arm gets the same brief, word for word.
- Every arm is scored by one verifier image with the same commands.
- The token is read from its file into the environment and never reaches a
  command line, a task file, or the job output.
- `HARBOR_TELEMETRY=0` on every run.
- No shipped skill or package file changes for the eval's sake.
- The plugin-eval cases outside billing run as they do today.
