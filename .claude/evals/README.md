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

The four cases give one brief, a `/billing` page, and differ
only in their fixtures. Each seeds the full consumer project, and
`_scaffold/isolate.mjs` closes every copy of the layers the arm runs without,
so each arm reaches only the knowledge its own layers give it, by any route:

- **Skills.** Every fixture deletes the skills the package bundles, the Skill
  Atlas, which embeds each skill's text, and the Testing Loops demo page. The
  plugin under test is the only source.
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

A removed command leaves the usage text too, and running it fails as an
unknown command. An arm without a tool also runs a copy of the skills that
never names it, so it looks like a package that shipped without the tool.
Each copy lives in `_skills/<case>/`: the skill files it changes, and
`skills.json`, which lists the skills and references the case goes without
and the hash of each shipped file a copy was made from.
`scripts/eval.sh` stages the shipped skills, then applies the case's copy
with `scripts/eval-stage-skills.mjs`. A shipped skill edited after its copy
was made stops the stage; carry the edit into the copy, then record the new
hashes with `node scripts/eval-stage-skills.mjs --rehash <case>`. The arm
without the checker drops `live-tokens-check-compliance` and the contract
reference; the arm without the lookup drops `live-tokens-pick-component`,
which reads only the catalogue the lookup prints. A call to a removed tool
still counts as failed in the trace. The README and the editor docs stay in every arm. They
summarise the skills and commands, and a user without the plugin has them
too. Scoring runs on a fresh copy of the project with every layer in place.

A run's sandbox can read its plugin's skills and nothing else on the machine:
a probe on 2026-10-16 found the repository, the home folder, and the
plugin's own `evals` folder all denied. `scripts/eval.sh` therefore stages
the plugin under test in a temporary folder that holds only the
`live-tokens-*` skills, so a repo-only skill such as `evaluate` never reaches
an arm, and copies the results back into `.claude/evals/results/`.

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

Each case measures four things:

- **Accuracy.** The runner's graders check the component each requirement
  takes, that no `MenuSelect` stands in for the calendar, that a new
  component is registered, and the route. Afterwards the full checkers count
  the errors the run left in its page and components.
- **Time.** The agent's session from prompt to final answer, page and
  components included, in seconds, and its cost: the list-price value of its
  tokens, which the subscription covers. Scoring afterwards is not counted.
- **Loops.** The agent's turns, and its `check-page` and `check-component`
  runs, counted from the trace.
- **Behaviour.** The trace also gives each run a timeline: the skills it
  loaded, its lookups, each checker run and the rules it reported, its reads
  of the package's own source in `node_modules`, and the files it wrote. The
  report counts skills loaded and source reads per arm. An arm without the
  lookup or the checker shows how the agent went without: failed calls, or
  more source reads.

The eval sandbox refuses to let a process listen on a local port, so
Playwright and Vite cannot start inside a run, and `--tests` would report
`tests-setup` until the turn cap (a probe on 2026-10-15 confirmed it, and one on 2026-10-16 found that
headless Chromium cannot start either, even with the browser copied into the
run's home; the runner writes the sandbox settings itself and offers no way
to allow it).
Every fixture therefore runs `_scaffold/static-checks.mjs`, which makes
`--tests` run the static checks and say why. The browser rules are scored
afterwards for every arm. The same limit reaches the component contract:
its `theme` case wants a theme saved with the editor, which cannot start. The
first run that wrote a contract, on 2026-10-15, named a theme the project
lacks, and `contract-theme` failed at scoring. The runner caps each run at
200 turns and one hour, its maximums, and the report flags any run that hit
a cap.

Five arms answer the question. The case with neither runs with the runner's
baseline, which gives the unattended model and the skills alone. The other
three run with `--ablation none`, since a no-plugin arm there adds only a
model that may stumble on the commands.

```
npm run eval:billing -- --smoke     # one run of the case with every tool
npm run eval:billing -- --smoke outcome-build-billing-no-cli   # one run of another case, with the plugin
npm run eval:billing -- --runs 3    # all five arms, three runs each
```

`scripts/eval-billing.sh` refuses to start while a Docker container runs,
builds the eval project, runs the cases one at a time with `--keep-temp`,
and keeps each case's result and log in `eval-reports/<time>/`.
It then runs `scripts/eval-check-build.mjs` over the results, which writes
the report to `report/index.html` in that folder and deletes the kept
sandboxes once the report holds its copies. `--reuse` rebuilds a report from
the findings and screenshots saved in its folder, without running the checks.


Each run is a fresh `claude` session given the same prompt file in a freshly
copied project, so no arm sees another's work. The runner seals each kept
workspace read-only and warns against running anything in it, so the script
unseals it and copies the run's `src/`, `tests/`, and checker settings into a
fresh copy of the eval project. There it runs the full checkers with
`--strict --no-fix`, browser tests included. It then serves that copy with
its own Vite dev server and screenshots `/billing` at 1280 and 390 pixels wide, with the
router's overlay hidden. It prints a table of means per arm and writes
`eval-reports/<time>/index.html`: the brief, the means, the calls each arm's
patched CLI blocked with the turns, seconds, and cost they took, the means
with those taken out, then one tab
per run holding every arm side by side, each with its metrics, a screenshot
that a switch sets to desktop or mobile, its behaviour, failed graders,
checker findings by rule, and links to the saved page and component sources. Each
column also lists the components the page renders, the components the run
authored, the tokens it added or changed in `tokens.css`, the custom
properties its page and components declare beyond a new component's own
`--<id>-*` properties and the `--sketch-*` hooks sketch mode prescribes, and
the literal values the checker found. The
screenshots are captured at twice their pixel density and open in a lightbox
whose arrow keys step through the arms of the open run. It names
any rule a run turned off in `live-tokens.config.json`. The report keeps its
own copies of the screenshots, sources, findings, trace, and the run's files
in `workspace/`. Scoring the same result JSON again with `--out` set to the
same report folder works after the sandboxes are gone.
