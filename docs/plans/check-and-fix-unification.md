# Check and fix in one loop

Plan of 2026-09-14. Wave 1 is done. Nothing else below is applied.

The checkers now fix what they can on every run. `check-page` and
`check-component` apply every `auto` repair, check again, and report the fixes
next to the findings that remain. That makes fix-findings mostly a copy of the
checker. This plan splits the checkers into rule modules by concern, audits the
release scripts for rules they duplicate, puts repair guidance on every finding,
gives each skill one loop around one command, and deletes fix-findings.

## Ground truth

Measured against the tree on 2026-09-14.

**Landed in `d1a92e6`.** Checking fixes by default, and `--no-fix` reports
without editing.

- `bin/cli.mjs`: `applyStaticFixes`, `formatFixes`, and the `fix` option on
  `reportChecks`. `--fix` is gone, and `--tests` runs after the fixes land.
- `bin/lib/findings.mjs`: `parseCheckFlags` reads `--no-fix`, and `toJson`
  emits `fix: { applied, skipped }`.
- `bin/fixers.test.ts`: covers default fixing, `--no-fix`, and fixes before
  `--tests`.
- `package.json` `check:pages` and `template/package.json` `check:design` pass
  `--no-fix`.
- The skills, the atlas tree `fix-findings.ts`, `CHANGELOG.md`,
  `docs/compliance-loop.html`, and `src/demo/TestingLoops.svelte` describe
  the new behaviour.

**Unreleased, so free to change.** `CHANGELOG.md` lists both the `fix` slug on
each finding and the old `--fix` under Unreleased. No consumer depends on
either.

**The checkers' shape.**

| File | Lines | Largest function |
|---|---|---|
| `bin/check-component.mjs` | 846 | `checkComponent`, lines 518–801, about 20 rules in one pass |
| `bin/check-page.mjs` | 765 | `checkFile`, lines 518–729 |
| `bin/contractRunner.mjs` | 1210 | not split by this plan |

- **Shared helpers.** Detection already goes through `bin/lib/`:
  `hasColorLiteral`, `hasDimensionLiteral` and `stripVarFallbacks` in
  `cssValues.mjs`, `resolveGeometryLiteral` in `geometry.mjs`, and
  `deepImportRepair` and `scaleTokens` in `catalogue.mjs`.
- **Duplicates.** `DEEP_IMPORT_PATTERNS` is defined twice with identical text
  (`check-component.mjs` line 168, `check-page.mjs` line 64). `color-literal`,
  `dimension-literal`, `deep-import`, `tests-not-installed`, `tests-setup` and
  `tests-incomplete` sit in both rule tables. Their severity and repair level
  match in both; only the `fix` slug differs.

**Importers the refactor must keep working.**

| Importer | Names |
|---|---|
| `bin/cli.mjs` | `COMPONENT_RULES`, `checkComponent`, `discoverComponents`, `formatReport`, `PAGE_RULES`, `checkPages`, `discoverPages` |
| `bin/lib/report.mjs` | `COMPONENT_RULES`, `checkComponent`, `discoverComponents`, `COMPONENT_IMPORT`, `PAGE_RULES`, `checkPages`, `discoverPages` |
| `bin/contractRunner.mjs` | `discoverComponents`, `resolveComponentPaths` |
| `src/testing/registry.contract.ts` | `discoverComponents` |
| `bin/*.test.ts`, `bin/lib/pageRoutes.test.ts` | the names above, plus `COMPONENT_RULE_FIX`, `PAGE_RULE_FIX`, `checkComponentDefaults` and `NOT_PAGES` |

**Three layers named check.** Only the first two ship.

| Layer | Items |
|---|---|
| Skill | `live-tokens-check-compliance` |
| CLI commands | `check-page`, `check-component` |
| Release scripts in `package.json` | 19 `check:*` scripts, such as `check:token-contract`, `check:component-defaults` and `check:skills` |

**What fix-findings owns today**, from
`.claude/skills/live-tokens-fix-findings/SKILL.md`:

| Content | Lines | Used by |
|---|---|---|
| Migration step: `migrate --check`, then `migrate` | 12 | whole-project repair |
| Run, read, group, fix, rerun loop | 13–24 | whole-project repair, and create-page and create-component through their Verify steps |
| Reply format | 25–29 | whole-project repair |
| `check:design` build script setup | 33 | whole-project repair |
| Scope rules: no new tokens, config for a lowered severity, name the shift | 35–39 | every repair |
| Color by role table | 41–55 | `color-literal`, `page-contrast`, `config-token` |
| Geometry by scale table | 57–69 | `dimension-literal`, `config-token` |
| One row per rule, plus one row per `fix:` slug | 71–114 | every finding |

**Who points at fix-findings.**

- **Skills:** check-compliance at lines 3, 8, 20, 40 and 49; create-page at
  line 168; create-component at line 229.
- **Atlas:** `skillTrees.ts` at lines 10 and 22, `trees/check-compliance.ts`
  at line 107, `trees/create-page.ts` at line 215, and all of
  `trees/fix-findings.ts`.
- **CLI:** `bin/setup-claude.mjs` at line 32 (`SAMPLE_PROMPTS`) and a comment
  in `bin/check-component.mjs` at line 73.
- **Docs:** `README.md` at line 429, `RELEASING.md` at line 130,
  `src/demo/sections/SectionClaude.svelte` at line 17,
  `docs/compliance-loop.html`, and `src/demo/TestingLoops.svelte`.
- **Rule tables:** `PAGE_RULE_FIX` and `COMPONENT_RULE_FIX` map each rule to
  a slug. `bin/check-page.test.ts` at line 639 and `bin/check-component.test.ts`
  at line 1545 pin the slug set.

**Consumer copies.** `setup-claude` prunes any skill directory a release no
longer ships (`bin/setup-claude.mjs` at lines 15 and 76), so a consumer's copy
of fix-findings goes away on their next `npx live-tokens setup-claude`.

## Target model

- **Rule modules.** Each rule lives once, in a module for its concern under
  `bin/rules/`. The module holds the rule's definition, detection, patch and
  guidance. `check-page` and `check-component` assemble the modules they need.
- **The checkers.** They run the fixes and return two lists: the fixes they
  applied, and the findings left. Each remaining finding carries its own
  guidance.
- **The release scripts.** Each one either calls the CLI or checks a fact about
  the library that no user project has. None reimplements a rule.
- **create-page and create-component.** Each runs one loop around one command:
  `check-page <file> --tests --strict --json` or
  `check-component <id> --tests --strict --json`. The skill makes each
  remaining repair from the finding's guidance and runs the command again
  until it exits 0.
- **check-compliance.** It becomes the whole-project check-and-fix skill. It
  reads the report, runs the migrations, runs both checkers on the project,
  makes the remaining repairs, applies the warnings policy, sets up
  `check:design`, and replies.
- **fix-findings.** Deleted.

## Decisions

**1. Where repair guidance lives. Decided 2026-09-14: in the rule modules.**
Each rule definition gains a `guidance` string after the refactor, and every
finding carries it in `--json`. The `fix` slug field and the `*_RULE_FIX` maps
are removed. Nothing goes into the current 846-line file ahead of the split.

**2. Whether check-compliance edits files. Decided 2026-09-14: yes.**
Every check skill fixes what it checks. check-compliance absorbs the
whole-project loop and drops "Edits no file". Its description gains "Use when
the user asks to fix the project".

## Invariants

1. **A plain check edits only what a finding names.** `bin/fixers.test.ts`
   invariant 5 stays green.
2. **`--no-fix` edits nothing.** Every build and CI caller keeps passing it:
   `check:pages`, the template's `check:design`, and the `check:design`
   script check-compliance writes.
3. **Every rule carries guidance** from Wave 4 on. A test fails when any rule
   lacks a non-empty `guidance`.
4. **No new tokens.** `tokens.css` changes only through `npx live-tokens migrate`.
5. **Skills stay in sync.** After any `SKILL.md` or `references/*.md` edit,
   run `npm run sync:skill-atlas` and `npm run sync:skill-sources`.
   `check:skills`, `check:skill-atlas`, and `check:skill-sources` pass at the
   end of every wave.
6. **Guidance strings follow the writing rules:** active voice, no em dashes,
   and no pairing a statement with its rejected opposite.
   `npm run check:cli-strings` passes.
7. **The data tree is untouched.** A wave that runs the editor or `--tests`
   restores `src/live-tokens/data` per `CLAUDE.md`.
8. **The engine loads lazily.** No module under `bin/rules/` imports
   `dist-plugin` at module top. `bin/engineLoadsLazily.test.ts` stays green.

## Out of scope

- Flipping `--no-fix` into the default, or letting `report` edit files.
- Splitting `bin/contractRunner.mjs`.
- Renaming the `check:*` release scripts. `CLAUDE.md`, CI and `prepublishOnly`
  name them.
- Hand-editing `skillSources.generated.ts`.
- Running `check-component --tests` with no id. Test one id at a time.
- The "Review by eye" step in create-page. The note in
  `src/demo/TestingLoops.svelte` holds that open question.
- Releasing. `CHANGELOG.md` entries stay under Unreleased.

## Agents and workflow runs

Each wave runs in three steps: execute, verify, review. The waves run in order
in one working tree. Waves 5 to 8 all regenerate `skillSources.generated.ts`,
so no two waves run at once and no agent uses worktree isolation.

| Wave | Execute | Verify | Review | Gate |
|---|---|---|---|---|
| 1 Default fixing | Done in `d1a92e6` | | | |
| 2 Rules split into modules | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 3 Release script audit | `census` inventories the 19 scripts, then `wave-executor` writes the table | none, since no code changes | `wave-reviewer` checks each row against its script | **the user** approves the dispositions |
| 3b Approved script changes | `wave-executor` | `test-verifier` | `wave-reviewer` | runs after `/check-fix-all`, once the user marks the Approved column |
| 4 Guidance on every finding | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 5 Create skills run one loop | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 6 check-compliance checks and fixes | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 7 fix-findings deleted | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 8a Skill Atlas cards | `visual-qa` reads the rendered cards, then `wave-executor` fixes the trees | `test-verifier` | `wave-reviewer` | automatic |
| 8b Testing loops page | `svelte:svelte-file-editor` | `test-verifier` runs the page check | `wave-reviewer` | automatic |

**Saved workflows.** `.claude/workflows/` holds the runs as slash commands.

- `check-fix-wave.js` runs one wave: execute, verify, review, and the fix
  rounds below. It passes each agent name above as `agentType`. Run one wave
  on its own with `/check-fix-wave 4`.
- `check-fix-all.js` calls it for Waves 2 through 8b in order, after a
  preflight that stops on an unclean working tree. It stops at the first wave
  that stops.

**Ledger.** Every executor commits with the subject prefix `Check-fix W<n>:`,
such as `Check-fix W2:`. `git log --grep "Check-fix W"` is the record the
reviewer reads to find a wave's diff.

**Control flow for one wave.**

1. **Execute.** The executor returns `{ units: [{ hash, subject }], gates:
   "pass" | "fail", oddities: [], resumePoint }`. When `gates` is `"fail"`,
   the run stops and reports `resumePoint`.
2. **Verify.** `test-verifier` runs the wave's Verify commands and returns
   `{ pass, failures: [] }`. A failure goes back to the executor once as its
   fix scope, then verify runs again. A second failure stops the run.
3. **Review.** `wave-reviewer` receives the executor's `oddities` and returns
   `{ verdict: "APPROVE" | "BLOCK", findings: [{ severity, file, line,
   invariant }] }`. A BLOCK goes back to the executor once with the findings
   as its fix scope, then verify and review run again. A second BLOCK stops
   the run. The reviewer blocks when an oddity needs the user.

**The run.** `/check-fix-all` runs Waves 2 through 8b in one workflow. A
workflow cannot pause for input, and no later wave depends on the user's
approval of the Wave 3 audit, so Wave 3b runs afterwards with
`/check-fix-wave 3b`.

- The preflight stops the run when `git status --short` prints anything. An
  editor session writes into `src/live-tokens/data`, so commit or restore that
  first.
- A stopped run names its wave. Resume in any session with
  `/check-fix-all from <wave>`, such as `/check-fix-all from 5`.
- The run schedules about 26 agents before fix rounds, which shows the
  advisory Large workflow notice.
- `visual-qa` starts the dev server and opens Chrome in Wave 8a. Launching the
  run authorizes that.

## Wave 1: default fixing, committed

Done in `d1a92e6` on 2026-09-14. `npx vitest run bin scripts/lib`,
`check:skills`, `check:cli-strings`, `check:skill-atlas`, and
`check:skill-sources` passed before the commit.

## Wave 2: rules split into modules by concern

A pure refactor. No finding, fix, message, order or exit code changes.

1. **Capture a baseline first.** Write these to `scratch/rules-baseline/`:
   - `node bin/cli.mjs check-page --no-fix --json`
   - `node bin/cli.mjs check-component --no-fix --json`
   - `node bin/cli.mjs report --json`
   - `JSON.stringify` of `PAGE_RULES` and `COMPONENT_RULES`, key order
     included
2. **Create one module per concern under `bin/rules/`:**

   | Module | Rules |
   |---|---|
   | `tokens.mjs` | `unknown-token`, `unknown-token-ref`, `color-literal`, `dimension-literal`, `raw-text-axis`, `default-not-token`, `config-token`, `unread-token` |
   | `componentUse.mjs` | `unknown-component`, `unknown-prop`, `unknown-prop-value`, `control-size`, `native-control`, `property-override`, `multiple-primary`, `danger-without-dialog` |
   | `importsAndRoutes.mjs` | `deep-import`, `reserved-route`, `site-css-in-main`, `missing-source` |
   | `componentStructure.mjs` | `invalid-id`, `missing-file`, `missing-root-block`, `no-tokens`, `missing-description`, `state-after-property`, `disabled-is-terminal`, `unknown-suffix`, `phantom-editor-token`, `missing-component-const`, `missing-all-tokens`, `missing-registration`, `phantom-link` |
   | `testRuns.mjs` | `tests-*`, `contract-*`, `page-*` definitions only; detection stays in `contractRunner.mjs` |

3. **Move each rule's detection and patch code** into its module, as a
   function that takes the file context and the `add` or `record` callback it
   already uses.
4. **Define `DEEP_IMPORT_PATTERNS` once**, in `importsAndRoutes.mjs`.
5. **Rebuild the rule tables.** `check-page.mjs` and `check-component.mjs`
   assemble `PAGE_RULES` and `COMPONENT_RULES` from the modules, in the
   baseline's key order. The `fix` slugs stay as they are until Wave 4.
6. **Shrink the two big functions.** `checkComponent` and `checkFile` become
   passes that build the file context and call each module in the order the
   rules ran before.
7. **Keep every export in the importer table** at its current path.

**Reserved for review.**
- **Finding order.** A module called in a different order changes it, and
  report and text output show that.
- **Shared state.** Any rule that read state another rule set earlier in the
  same pass. The reviewer checks each such dependency survived the move.

**Verify.**
- `npx vitest run bin scripts/lib` passes, and
  `git diff --stat -- 'bin/*.test.ts' 'bin/lib/*.test.ts'` is empty.
- Rerun the four baseline commands and `diff` each against
  `scratch/rules-baseline/`. Every diff is empty.
- `npm run check:cli-strings` passes.

**Done when**
- `grep -c "DEEP_IMPORT_PATTERNS = " bin/*.mjs bin/rules/*.mjs` totals 1
- `checkComponent` and `checkFile` are each under 80 lines
- no file under `bin/rules/` exceeds 300 lines

## Wave 3: release script audit

An audit only. It changes no code.

1. Read each of the 19 `check:*` scripts in `package.json`.
2. Add a Release script audit section to this plan. It holds a table with one
   row per script:
   - what it checks
   - whether a rule module already covers the same fact
   - a proposed disposition: keep (a fact about the library only), call the
     CLI, or delete the duplicate logic
   - an Approved column, left blank for the user
3. Read `check:component-defaults` against `default-not-token` and
   `config-token`, and `check:no-style-imports` against `deep-import`, first.
   They are the likeliest overlaps.

**Reserved for the user.** Every disposition other than keep. The user marks
the Approved column. No script changes until then.

**Done when** the table has 19 rows and each row cites the script file and,
for an overlap, the rule module.

## Wave 3b: approved release script changes

Runs only after the user approves the Release script audit table, and only
for rows whose disposition is other than keep.

1. Apply each row marked in the Approved column whose disposition is other
   than keep. A script that now calls the CLI passes `--no-fix`. When the
   Approved column is blank, stop and report that the table awaits approval.
2. Mark each applied row in the table.
3. Update the gates definition list in `src/demo/TestingLoops.svelte` for each
   script this wave changes.

**Verify.** `npx vitest run bin scripts/lib`, then each changed script by its
npm name.

**Done when** every approved row is marked applied.

## Wave 4: guidance on every finding

1. Add `guidance` to each rule definition in `bin/rules/*.mjs`. Write it from
   that rule's row in fix-findings lines 73–112. Fold the Color by role and
   Geometry by scale tables into the guidance of `color-literal`,
   `dimension-literal`, `page-contrast`, and `config-token`. Fold each `fix:`
   slug row into the rules that carry that slug.
2. Give the `tests-*` and `contract-*` rules guidance too, from lines 106–107
   and 114.
3. Where a rule appears in both tables, merge its two definitions into one,
   now that only the slug told them apart.
4. Have `applySeverity` attach `guidance` to each finding, and drop `fix`.
   Delete `fixMap`, `PAGE_RULE_FIX`, and `COMPONENT_RULE_FIX`.
5. Replace the two slug tests with one test per rule table: every rule has
   non-empty guidance.
6. Update `bin/lib/report.mjs` wherever it prints or passes through `fix`.
7. Update the Unreleased `CHANGELOG.md` entry: findings carry `guidance`.

**Reserved for review.** Guidance that loses a table row's meaning while
compressing it. The reviewer compares each rule's guidance against its
fix-findings row.

**Done when** `git grep -n "RULE_FIX\|fixMap" -- bin scripts` prints nothing,
and `node bin/cli.mjs check-page --no-fix --json` on a page with a
`color-literal` shows `guidance` on the finding.

## Wave 5: create-page and create-component run one loop

1. Rewrite the create-page Verify paragraph (line 168):
   - Run `npx live-tokens check-page <file> --tests --strict --json`. It
     applies the `auto` repairs and returns the fixes and the findings left.
   - Make each remaining repair from its `guidance`, and run the command
     again until it exits 0.
   - Keep `--off` and `--no-fix` named, since `check:skills` requires it.
2. Rewrite create-component Verify step 1 (line 229) the same way around
   `check-component <id> --tests --strict --json`. Keep the Svelte check and
   the build that follow it.
3. Remove every mention of check-compliance and fix-findings from both Verify
   sections. Update both skills' descriptions where they name check-compliance
   as their verification step.
4. Re-point the atlas trees `create-page.ts` and `create-component.ts`: one
   loop node, with the edge labels "findings" and "exit 0". Run both syncs.

**Verify.** `check:skills`, `check:skill-atlas`, `check:skill-sources`. Wave 8a
reads the rendered cards.

**Done when** `grep -n "fix-findings\|check-compliance" .claude/skills/live-tokens-create-page/SKILL.md .claude/skills/live-tokens-create-component/SKILL.md`
prints nothing.

## Wave 6: check-compliance checks and fixes the project

1. Move into check-compliance's workflow:
   - the migration step (fix-findings line 12)
   - the loop: run both checkers, read, group, repair from guidance, rerun
   - the warnings policy (lines 23–24)
   - the `check:design` setup (line 33), still with `--no-fix`
   - the scope rules (lines 37–39)
   - the reply format (lines 25–29)
2. Keep the report as its first step. It is the whole-project picture: pending
   migrations, component facts, and usage.
3. Drop "Edits no file" and every hand-off to fix-findings. Update the
   description:
   - it checks and fixes the project
   - "Use when the user asks to fix the project" joins the triggers
   - create-page and create-component no longer call it
4. Stay under the 250-line ceiling `check:skills` enforces.
5. Rebuild `trees/check-compliance.ts` for the new workflow, and run both
   syncs.
6. Update `SAMPLE_PROMPTS` in `bin/setup-claude.mjs` for check-compliance.

**Reserved for review.** check-compliance's description triggers. A request
to fix the project has to reach it once fix-findings is gone.

**Done when** `grep -n "fix-findings" .claude/skills/live-tokens-check-compliance/SKILL.md`
prints nothing, and `check:skills` passes.

## Wave 7: fix-findings deleted

1. Delete `.claude/skills/live-tokens-fix-findings/` and
   `src/editor/skill-atlas/trees/fix-findings.ts`. Remove its entry from
   `skillTrees.ts` and from `SAMPLE_PROMPTS`.
2. Update every remaining reference in the Ground truth list:
   - the comment in `bin/check-component.mjs`, or its successor module
   - `README.md`: delete the section, and turn "nine skills" into eight
   - `RELEASING.md`
   - `SectionClaude.svelte`
   - `docs/compliance-loop.html`
3. Add a CHANGELOG Unreleased entry under Removed. fix-findings is gone,
   check-compliance fixes the project, and `setup-claude` prunes the old copy.
4. Run both syncs.

**Verify.**
- `npx vitest run bin scripts/lib src/editor/skill-atlas`
- `npm run check:skills`, `check:skill-atlas`, `check:skill-sources`, and
  `check:cli-strings`
- `node scripts/check-production-is-default.mjs`

**Done when** `git grep -n "fix-findings"` matches only `CHANGELOG.md` and
`docs/plans/`.

## Wave 8a: Skill Atlas cards

Read every rendered Skill Atlas card for create-page, create-component, and
check-compliance at `/live-tokens/docs`. A title and its chips can each pass
the checks and still contradict each other. Fix any title, chip, or edge label
that no longer matches its skill, then run both syncs. Restore
`src/live-tokens/data` afterwards.

**Verify.** `npm run check:skill-atlas` and `npx vitest run src/editor/skill-atlas`.

**Done when** `visual-qa` reports no card whose title, chips, or edge labels
contradict its skill.

## Wave 8b: Testing loops page

1. Update `src/demo/TestingLoops.svelte`:
   - "nine skills" becomes eight
   - the Check skills card
   - Figure 2 and walkthrough steps 4 and 6: one loop around one command
   - Figure 3: the fix slug becomes guidance, and `COMPONENT_RULE_FIX ·
     PAGE_RULE_FIX` becomes the guidance test
   - the gates definition list
2. Run `node bin/cli.mjs check-page src/demo/TestingLoops.svelte --strict --no-fix`.

**Done when** `grep -n "fix-findings\|fix slug\|RULE_FIX" src/demo/TestingLoops.svelte`
prints nothing and the page check exits 0.
