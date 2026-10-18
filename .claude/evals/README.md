# Skill evals

`check:skills` and `check:skill-atlas` are static gates: they check structure,
never behaviour. Nothing here has ever measured whether these descriptions
fire when they should, or whether following a skill end to end produces
anything.

Sixteen cases, seven on triggering and nine on outcome:

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
| `outcome-build-billing` | A coffee-box billing page that needs eight shipped components and a new one-month calendar: with the lookup and the checker, how accurate, how fast, and how many loops? |
| `outcome-build-billing-no-checker` | The same brief with the lookup only. |
| `outcome-build-billing-no-lookup` | The same brief with the checker only. |
| `outcome-build-billing-no-cli` | The same brief with neither; its no-plugin arm is the unattended model. |
| `outcome-pick-component` | Across twelve requirements, does the catalogue change which component, variant, and props the model names? |
| `outcome-pick-component-no-cli` | The same case without the package's `bin`: what does the picker skill contribute apart from the command it names? |

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
claude plugin eval .claude --no-publish --scaffold --allow-tools Bash
```

`--scaffold` runs each case's `fixture.sh`. Every run starts in an empty
workspace that cannot read this repository, so `_scaffold/project.sh` copies
in the least of the package that `npx live-tokens components` reads: `bin`,
the runtime components, and the registry. A case opts in with a `case.yaml`
that names `fixture.sh`. The two cases that reach the picker have one. The
three outcome cases that write pages, components, and themes need a full
project from the `create` template and have none yet.

`.claude/.claude-plugin/plugin.json` makes `.claude` a plugin named
`live-tokens`, so the runner loads the eight skills and scores them. The
package ships `.claude/skills` only, so the manifest stays in the repository.
Without `--no-publish` the runner uploads its HTML report to claude.ai as a
private artifact. Results land in `.claude/evals/results/`, which git ignores.

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

**The first scored run was on 2026-09-19**, at package 0.82.0 with the
manifest in place: `trigger-confusable-pair`, one run per arm. The plugin
resolved and the picker skill fired. The skill arm scored 0.00 and the
baseline 1.00, and the score measures the case, which has two defects. Each
run starts in an empty directory with no shell, so the picker cannot run
`live-tokens components` and says so; every case that reaches the picker
needs a scaffolded project and `Bash`. The `llm` judge reads only the final
answer, so it passed a baseline that answered from general knowledge, which
the rubric fails; whether a skill fired needs a `tool_used: Skill` grader.
On that date `outcome-pick-component` could not run on this machine: the
`~/.docker` refusal above applies to every case that grants `Bash`.
`npm run eval`, described below, lifted it on 2026-09-20.

**Both defects were fixed the same day.** `trigger-confusable-pair` has the
scaffold, and its second run, without `Bash`, scored 1.00 with the skills and
0.50 without: the picker fired and read the catalogue entries from the seeded
package. Each positive trigger case now has a `skill-fired` grader
(`tool_used: Skill`, `arm: both`, so the baseline scores it and fails it), and
`trigger-single-token` has `no-skill-fired` with `max: 0`. Every trigger
rubric reads the trace (`focus: trace`). The judge still passes a baseline
that reads the component files on its own, so `skill-fired` is the grader
that separates the arms.

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

## Running a case that grants `Bash`

`npm run eval -- --case outcome-pick-component` runs `scripts/eval.sh`, which
wraps `claude plugin eval .claude --no-publish --scaffold --trust-plugin
--allow-tools Bash Write Edit` and passes every other flag through. A case
that builds something copies in a consumer project, so run
`npm run build:eval-project` first; it rebuilds only when the package changed.

The runner refuses a `Bash` grant while `~/.docker` holds a symbolic link, and
Docker Desktop keeps its CLI plugin links there. The conflict is between the
runner and this machine's Docker install; nothing in the package touches
Docker. The script quits Docker Desktop, moves the folders that hold links to
`~/.docker-eval-aside`, runs the eval, and on any exit moves them back and
relaunches Docker Desktop if it was running. It stops before it quits Docker
when a container is running, and it stops when `~/.docker-eval-aside` already
exists, since that means an earlier run did not restore.

## `outcome-pick-component`, 2026-09-20

Package 0.82.0 plus the unreleased `whenToUse` / `whenNotToUse` entry, three
runs per arm, twelve `regex` graders and `check-run`.

| Arm | Score | Rows right | Ran `live-tokens components` | Turns | Seconds |
|---|---|---|---|---|---|
| With the skills | 1.00 | 12 of 12 in all 3 runs | 3 of 3 | 9 to 10 | 42 to 58 |
| Without | 0.62 | 12 of 12 in the 2 runs that finished | 0 of 3 | 15 to 16 | 70 to 72; one run timed out at 300 |

An earlier run the same day graded the twelve answers with one `llm` rubric.
It failed every run in both arms and saved no reason, while a hand reading
found all twelve picks right in all six runs. The case now asks for a fixed
ANSWERS block and matches each row by pattern, so a failure names its row.
The baseline reaches the same picks by reading the component files, where the
entries live; the skills get there through the CLI in fewer turns.

## `outcome-pick-component` with and without the CLI, 2026-09-22

Package 0.87.1, three runs per arm, `npm run eval -- --case 'outcome-pick-component*' -j 2`.
`outcome-pick-component-no-cli` seeds the same project and then removes the
package's `bin` and `node_modules/.bin`, so `npx live-tokens components` fails
with no network to fetch it. The skills are unchanged. It has no `check-run`,
which would fail by construction. The runner's baseline arm on each case
completes a two-by-two.

| Skills | CLI | Rows right | Ran `live-tokens components` | Turns | Seconds | Cost |
|---|---|---|---|---|---|---|
| yes | yes | 12 of 12 in all 3 | 3 of 3 | 9 to 10 | 46 to 76 | $0.41 to $0.46 |
| no | yes | 12 of 12 in all 3 | 2 of 3 | 15 to 17 | 65 to 102 | $0.63 to $0.74 |
| yes | no | 12 of 12 in all 3 | n/a | 14 to 20 | 66 to 84 | $0.73 to $0.91 |
| no | no | 11 of 12 in one run (row 12) | n/a | 17 to 20 | 113 to 169 | $1.02 to $1.14 |

The skill's turn savings come from the command: without it the skill arm takes
as many turns as the baseline. Unlike 2026-09-20, two of three baseline runs
found the CLI themselves. The runner deleted the traces, so what each arm did
after the failed command is unrecorded; pass `--keep-temp` to keep them.

## `outcome-component-from-brief`, 2026-09-20

One run per arm, 90 turns allowed, in the prebuilt consumer project.

| | With the plugin | Without |
|---|---|---|
| Turns, seconds | 63, 569 | 66, 475 |
| Runtime and editor files, `:global(:root)`, registration | pass | pass |
| Entry exported with `whenToUse` and a `whenNotToUse` row | pass | pass |
| A row's `use` names a shipped sibling | `progressbar`, `slider`, `card` | `progressbar`, `slider`, `badge` |
| First `check-component rating --strict` | 0 findings | 0 findings |
| `--tests` | `tests-setup`, which the sandbox causes | the same |

Both arms read the create-component skill. The arm without the plugin found it
in `node_modules/@motion-proto/live-tokens/.claude/skills/`, where the package
ships it, so this case has no arm that works without the skill. Each `when`
the two arms wrote reads correctly after "do not use Rating when", which is
the wording rule the skill gained the same day.

An `llm` grader over the trace asked whether the gate closed. It failed both
runs 3 votes to 0 although each run's first strict check returned no findings,
and the runner saves no reason. It is removed. Nothing now grades the repair
loop itself; the file graders and `check-run` grade what the loop leaves.
A first attempt at 40 turns cut both arms off before they finished.

## `outcome-build-billing`: lookup and checker

The four cases give one brief, a `/billing` page, and one set of graders.
`npm run eval:billing` runs the brief under Harbor as seven arms. Each trial
gets its own Docker container, and a fresh container from one verifier image
scores every arm, so every arm meets one bar whatever it could run itself.
`_scaffold/isolate.mjs` closes every copy of the layers an arm runs without,
so each arm reaches only the knowledge its own layers give it, by any route:

- **Skills.** The base image deletes the skills the package's postinstall
  writes into `.claude`, and `isolate.mjs` deletes the skills the package
  bundles, the Skill Atlas, which embeds each skill's text, and the Testing
  Loops demo page. The skills the arm's image stages are its only source.
- **Lookup.** The `lookup` group removes `components` and `tokens` and blanks
  the catalogue entry in every shipped component, so the reasons to pick or
  reject a component go with the command. Props and variants stay, because
  the code needs them, and so does the project's own `tokens.css`.
- **Checker.** The `checker` group removes `check-page`, `check-component`,
  and `report`, stubs the checks `vite build` runs, makes the checker modules
  refuse to load outside the CLI, deletes the contract suites, and drops the
  `test:design` script. `vitest` and Playwright stay for tests the agent
  writes itself. The rule source in
  `bin/rules/` stays readable, because other commands import it; the
  behaviour timeline shows any read of it.

A removed command leaves the usage text and the package README too, and
running it fails as an unknown command. An arm without a tool also runs a copy
of the skills that never names it, so it looks like a package that shipped
without the tool. Each copy lives in `_skills/<copy>/`: the skill files it
changes, and `skills.json`, which lists the skills and references the copy
goes without and the hash of each shipped file it was made from. The arms
table names each arm's copy. The three cases without a tool keep their
copies under the case's name, and `billing-static-loop` serves the two arms
that keep the checker to its static rules. `scripts/eval-harbor.sh` stages
the shipped skills into each arm's image at `/opt/skills`, then applies the
copy with `scripts/eval-stage-skills.mjs`. A shipped skill edited after its
copy was made stops the stage; carry the edit into the copy, then record the
new hashes with `node scripts/eval-stage-skills.mjs --rehash <copy>`. The
copies without the checker drop `live-tokens-check-compliance` and the
contract reference; the copies without the lookup drop
`live-tokens-pick-component`, which reads only the catalogue the lookup
prints. A call to a removed tool still counts as failed in the trace. The
editor docs stay in every arm. They summarise the skills and commands, and a
user without the plugin has them too.

### Arms

| Arm | Case for graders and copy | `isolate.mjs` groups | Skills | Trials in a full run |
|---|---|---|---|---|
| Unattended | `outcome-build-billing-no-cli` | `lookup checker` | none | 3 |
| Skills only | `outcome-build-billing-no-cli` | `lookup checker` | the case's copy | 3 |
| Skills, lookup | `outcome-build-billing-no-checker` | `checker` | the case's copy | 3 |
| Skills, checker | `outcome-build-billing-no-lookup` | `lookup` | the case's copy | 3 |
| Skills, lookup and checker | `outcome-build-billing` | none | shipped | 5 |
| Skills, lookup and static checker | `outcome-build-billing` | none | `billing-static-loop` | 5 |
| Skills, lookup, static checker and browser gate | `outcome-build-billing` | none | `billing-static-loop` | 5 |

The arms table in `scripts/eval-harbor.sh` defines them. The runner writes
it into each jobs folder as `arms.json`, and the report reads each arm's
name, grants, and order from there.

The last three arms keep every tool and differ in where the browser tests
run. The first runs them whenever the agent passes `--tests`. The static-loop
arm's skill copy runs the checkers without `--tests`, and its image applies
`_scaffold/static-checks.mjs`, so a `--tests` the agent passes anyway runs
the static checks and says so. The gate arm adds a `Stop` hook,
`harbor/browser-gate.mjs`. Each time the agent stops, the hook runs
`check-page` and `check-component` with `--tests` on the run's new page and
components and blocks the stop while either reports an error. On its fourth
stop it lets the run end, so a finding the agent cannot fix ends the run
before the turn cap. Each arm's Claude Code settings file stays outside
`/app`, so the agent never edits its own hooks. These three arms run five
trials each: an exact rank test of three runs against three can reach no p
below 0.1, and five against five reaches 0.008.

### Brief and measures

The brief reads like a client's request and avoids the catalogue's own
wording, so the lookup has to earn its picks. For the lookup, each
requirement has one right component, and the delivery day needs a calendar
of next month that shows each date's weekday. Nothing shipped draws a month
grid, and a `MenuSelect` of dates hides the weekdays. The brief asks for the
calendar as a new component, a one-month day picker, so every run exercises
the component skill and `check-component`. The first smoke run, on
2026-10-15, had no such request and built the calendar from shipped
`Button`s. For the checker, the brief asks for things the rules refuse:
smaller toolbar buttons (`control-size`), four plans side by side
(`hardcoded-columns`), big prices (`raw-text-axis`), the brand gold
(`color-literal`, `page-contrast`), a way to pick every plan
(`multiple-primary`), and a permanent cancel (`danger-without-dialog`).

Each arm is measured on four things:

- **Accuracy.** The graders check the component each requirement takes, that
  no `MenuSelect` stands in for the calendar, that a new component is
  registered, and the route. The full checkers then count the errors the run
  left in its page and components.
- **Time.** The agent's session from prompt to final answer, page and
  components included, in seconds, and its cost: the list-price value of its
  tokens, which the subscription covers. Neither includes the scoring.
- **Loops.** The agent's turns, and its `check-page` and `check-component`
  runs, counted from the trace.
- **Behaviour.** The trace also gives each run a timeline: the skills it
  loaded, its lookups, each checker run and the rules it reported, its reads
  of the package's own source in `node_modules`, and the files it wrote. The
  report counts skills loaded and source reads per arm. An arm without the
  lookup or the checker shows how the agent went without: failed calls, or
  more source reads.

### Containers

Every arm's image derives from `live-tokens-eval-base`
(`harbor/Dockerfile.base`): Playwright's image with its Chromium, a pinned
Claude Code, and the consumer project installed from the packed package.
Inside its container the agent can start Vite and Chromium, so `--tests`
runs the browser tests. The container reaches `api.anthropic.com` alone, so
an `npm install` or a web read fails at once. The runner caps each trial at
200 turns and an hour of agent time, and the report flags any run that hit a
cap.

The component contract's `theme` case previews a saved theme, and the
skill's example names it `brand`. The base image ships
`src/live-tokens/data/themes/brand.json`, a copy of Spring Meadow, whose
palette and geometry both differ from the default. A new component's color
properties move under it through the design tokens they alias, and its
geometry stays on the steps the run built it with. The verifier restores the
image's copy before it scores, and the report flags a run that changed it.

Billing ran under `claude plugin eval` until 2026-10-18. That runner's
sandbox refuses to let a process listen on a local port, and headless
Chromium cannot start in it (probes on 2026-10-15 and 2026-10-16), so no arm
could run the browser tests and the checker arms saw the static rules alone.
The four cases still run there with `npm run eval -- --case <case>`, and
every fixture applies `static-checks.mjs` for that reason.

### Running

A run needs three things:

- **Docker running.** Three trials at once peaked at 3.9 GiB of the 7.7 GiB
  Docker Desktop gave its VM.
- **Harbor**, installed with `uv tool install harbor`. The runner was built
  against Harbor 0.24.0.
- **The token file.** `claude setup-token` prints a subscription token. Save
  it in `~/.config/live-tokens-eval/oauth-token`, or point
  `LIVE_TOKENS_EVAL_TOKEN_FILE` at another file. The runner reads the file
  into Claude Code's environment, so the token never reaches a command line,
  a task file, or the job output. It unsets `ANTHROPIC_API_KEY` and sets
  `HARBOR_TELEMETRY=0`.

```
npm run eval:billing -- --smoke               # one trial of the arm with every tool
npm run eval:billing                          # every arm at its trial count, 27 trials
npm run eval:billing -- --smoke static-loop   # one trial of another arm
npm run eval:billing -- --runs 1              # one trial of every arm
npm run eval:billing -- --prepare             # build the images and write the tasks, run nothing
```

A trial took 7 to 12 minutes on 2026-10-18, about a minute of it scoring,
and a smoke run takes about a quarter of an hour with the image builds. Each
job runs three trials at once, so an arm of three trials takes about as long
as one trial and an arm of five about twice that: a full run takes about two
hours. A trial can run to an hour of agent time and half an hour of scoring
before Harbor stops it. The arms run one after another, and a run stalls if
the Mac sleeps.

The runner builds the eval project, packs the package, builds the base and
verifier images, writes each arm's task in `scratch/harbor/tasks/<arm>/`,
builds the arm's image, and runs one Harbor job per arm into
`scratch/harbor/jobs/<time>/<arm>/`. It ends by writing the report to
`eval-reports/<time>/index.html`, or `eval-reports/<time>-smoke/` for a
smoke run.

### Scoring and the report

Harbor stops the agent's container and starts the verifier from
`live-tokens-eval-verifier`, the base project with every layer in place and
the graders at `/tests`. It uploads the run's `src/`, `tests/`,
`live-tokens.config.json`, and `live-tokens.testing.ts` over the base
project. `harbor/grade.mjs` restores `brand.json`, runs the graders, runs the
full checkers with `--tests --strict --no-fix` on the run's new page and
components, takes the inventory from `report --json`, and screenshots
`/billing` at 1280 and 390 pixels wide. It writes the reward, the findings,
the inventory, and the screenshots to `/logs/verifier/`. The host scores
nothing.

`scripts/eval-check-build.mjs` reads the jobs folder: each trial's
`result.json` for time, cost, and reward, the Claude Code session log for the
trace, and the verifier's files. It prints the means per arm and writes the
report: the brief, the means, the calls each arm's patched CLI blocked with
the turns, seconds, and cost they took, the means with those taken out, each
run's values, rank tests between the three loop arms on errors left,
generation seconds, and cost, and each gate run's blocks with the rules
behind each. A checker run counts by its call; when the agent kept its output
out of the trace, the timeline shows the result as unread.

Below the tables, a run picker and a tab strip show one arm's panel: its
metrics, behaviour, failed graders, checker findings by rule, links to the
saved page and component sources, and its page in a window that scrolls
inside itself, with a desktop and mobile switch. The arrow keys step through
the arms, and the selection survives a reload. Compare splits the panel into
two halves, each with its own arm picker. A click on a page opens it full
size, in a lightbox whose arrow keys step through the arms of the open run.
Each panel also lists the components the page renders, the components the
run authored, the tokens it added or changed in `tokens.css`, the custom
properties its page and components declare beyond a new component's own
`--<id>-*` properties and the `--sketch-*` hooks sketch mode prescribes, and
the literal values the checker found. It names any rule a run turned off in
`live-tokens.config.json`. The report keeps its own copies of the
screenshots, sources, findings, trace, and the run's files in `workspace/`,
so it outlives the jobs folder.

A change to the reader or the layout needs no new runs. Rebuild the report
from the jobs folder, or pass several to pool their trials:

```sh
node scripts/eval-check-build.mjs scratch/harbor/jobs/<time> --out eval-reports/<time>
```

The reports of the plugin-eval runs before 2026-10-18 rebuild from the
findings saved beside them:

```sh
out=eval-reports/<time>
node scripts/eval-check-build.mjs "$out"/*.json --tests --out "$out/report" --reuse
```
