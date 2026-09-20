# The outcome evals run in a real project

Plan of 2026-09-19. Nothing below is applied. It follows from
`component-contract.md`, whose Wave 4 cannot score until an outcome case runs.

Three eval cases ask a skill to build something and then run a checker:
`outcome-page-from-brief`, `outcome-component-from-brief`, and
`outcome-theme-from-request`. `claude plugin eval` starts every run in an
empty workspace that cannot read this repository, so each of them fails before
the skill does any work. This plan gives those cases a full consumer project,
built once and copied into each run, and a place to run them.

## Ground truth

Measured on 2026-09-19, package 0.82.0, Claude Code 2.1.277.

**The workspace.** Each run starts in an empty directory. With `Bash` granted,
commands run under the OS sandbox: writes stay inside the workspace, the home
directory is unreadable, and the network is closed. `npm install` cannot run
during a run. `context.scaffold_script`, named in a `case.yaml`, runs before
the agent, as the user, outside the sandbox, in the workspace, and only under
`--scaffold`.

**The light scaffold.** `.claude/evals/_scaffold/project.sh` copies `bin`, the
runtime components, and the registry into `node_modules`. It serves
`components` and nothing else: no `dist-plugin`, no template, no `svelte`, no
data tree.

**The three cases were written for this repository.** Their rubrics end with
"restore `src/App.svelte` with `git checkout`" and "restore `src/main.ts` and
the picker skill". A run never touches the repository, so those lines are
false. The component case's rubric also expects the picker skill to be edited,
which the catalogue entry replaced.

**What each case needs at run time.**

| Case | Runs | Needs in the workspace |
|---|---|---|
| `outcome-page-from-brief` | `check-page src/pages/Pricing.svelte --strict` | the `create` template, the package, `tokens.css` |
| `outcome-component-from-brief` | `check-component rating --strict` | the same, plus `src/main.ts` and `registerComponents.ts` |
| `outcome-theme-from-request` | `set-colors`, `set-type`, `set-geometry`, `save-theme` | the same, plus `dist-plugin` for the engine, plus the data tree |

`set-type` verifies families against Google Fonts, so the theme case needs the
network or a `WebFetch(domain:fonts.googleapis.com)` grant.

**A project builder exists.** `scripts/smoke-create.sh` packs the tarball, runs
the shipped `live-tokens create <app>`, repoints the dependency at the
tarball, and runs `npm install`. It takes minutes. `scripts/lib/componentGate.mjs`
does the same for the component gate.

**This machine cannot grant `Bash`.** Docker Desktop keeps symbolic links in
`~/.docker`, and the runner refuses a `Bash` grant while they exist. The
refusal is a credential guard and stays in place. `DOCKER_CONFIG` is left
alone.

## Decisions

**1. One project, built once, copied per run.** A scaffold that ran
`npm pack` and `npm install` per run would cost minutes for each of 3 runs in
2 arms across 3 cases. A builder script makes the project once under
`scratch/eval-project/`, and the scaffold copies it into the workspace.

**2. The builder reuses `smoke-create.sh`'s steps.** Both call one shared
function for pack, create, repoint, and install. Two copies of those steps
would drift.

**3. The copy is a real copy.** The sandbox cannot follow a link out of the
workspace, so `node_modules` is copied with `cp -R`, or with `cp -c` clones
where the filesystem supports them.

**4. `Bash`-granting cases run in CI.** A `workflow_dispatch` job on a GitHub
runner has no Docker Desktop. **Decided 2026-09-20:** the job may spend API
credit. The repository secret `ANTHROPIC_API_KEY` carries the key, the name
the CLI reads from its environment. The repository held no secret on that
date, so the user sets it.

## Invariants

1. A case edits nothing in this repository. Every rubric line that tells a
   reader to restore the tree goes.
2. The scaffold never runs the network. Everything it copies exists before
   the run.
3. `scratch/eval-project/` is disposable and git ignores it. The builder
   rebuilds it when `package.json`'s version or the tarball's hash changes.
4. Reports stay local: every documented command carries `--no-publish`.
5. The data tree of this repository is untouched. The theme case writes into
   the copied project's own data tree.

## Out of scope

- Changing `~/.docker` or the runner's credential guard.
- Mocking Google Fonts for `set-type`. The theme case takes a domain grant.
- New cases. This plan makes the three existing ones runnable.
- Scoring Wave 4 of `component-contract.md`. It runs once Wave 3 here lands.

## Wave 1: the project builder

1. Move pack, create, repoint, and install out of `scripts/smoke-create.sh`
   into `scripts/lib/consumerProject.mjs` as one function that returns the
   project directory. `smoke-create.sh` calls it and keeps its assertions.
2. Add `scripts/build-eval-project.mjs`. It builds `dist-plugin` when absent,
   calls the function with `scratch/eval-project/` as the target, and writes
   `scratch/eval-project/.built-from` with the package version and the
   tarball hash. A second call with the same stamp does nothing.
3. Add `npm run build:eval-project`.

**Done when** `npm run build:eval-project` leaves a project in which
`npx live-tokens check-page --strict` exits 0, a second call returns in under
a second, and `npm run check:smoke-create` still passes.

## Wave 2: the full scaffold and the case files

1. Add `.claude/evals/_scaffold/full-project.sh`. It fails with one line
   naming `npm run build:eval-project` when `scratch/eval-project/` is absent,
   and otherwise copies it into the workspace.
2. Give each of the three cases a `case.yaml` and a `fixture.sh` that sources
   it, as the two picker cases do.
3. Rewrite the three rubrics for a consumer project: the paths the `create`
   template uses, no restore lines, and for the component case the catalogue
   entry in place of the picker edit. Each rubric reads the trace.
4. Keep each `check-run` grader. Add `arm: both` where the baseline should
   fail it.
5. Update `.claude/evals/README.md`: the build step, the full command, and
   the theme case's `WebFetch(domain:fonts.googleapis.com)` grant.

**Reserved for review.** Whether a rubric still asks for something only this
repository has.

**Done when** `bash .claude/evals/outcome-page-from-brief/fixture.sh`, run in
an empty directory, yields a project where `npx live-tokens components` lists
26 shipped components, and `claude plugin validate .claude` passes.

## Wave 3: a place to run them

1. Add `.github/workflows/evals.yml`, `workflow_dispatch` only, with inputs
   for the case glob and the run count. It builds the package, runs
   `npm run build:eval-project`, and runs `claude plugin eval .claude
   --no-publish --scaffold --trust-plugin --allow-tools Bash Write Edit`
   with `--max-cost-usd` set from an input.
2. The job reads the key from the `ANTHROPIC_API_KEY` secret and fails in its
   first step, with one line naming the secret, when it is empty.
3. Upload `.claude/evals/results/` as a build artifact.
4. Document the dispatch command in `.claude/evals/README.md`:
   `gh workflow run evals.yml -f cases=<glob> -f runs=<n> -f max_cost_usd=<n>`.

The executor pushes nothing and dispatches nothing.

**Done when** `.github/workflows/evals.yml` parses, triggers on
`workflow_dispatch` alone, and names every input the README documents.

## Wave 4: the first CI run

The main session runs this wave with the user, since it pushes `main` and
spends credit.

1. The user sets the secret: `gh secret set ANTHROPIC_API_KEY`.
2. Push `main`. `verify.yml` runs on the push; no tag moves, so nothing
   publishes.
3. Dispatch `outcome-pick-component` with `runs=3`.
4. Record the scores of both arms in the README's case table, with the date
   and the package version. That row is the score Wave 4 of
   `component-contract.md` waits for.

**Done when** a dispatched run scores `outcome-pick-component` in both arms.

## Run

`/plan-wave` needs an `eval-scaffold` entry in `.claude/workflows/plan-wave.js`
beside `contract`, with the same Sonnet-first models. `/plan-all
eval-scaffold` runs Waves 1 to 3 unattended. Wave 4 runs in the main session.
