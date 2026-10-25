# Theme checks

Plan of 2026-10-25, awaiting approval. Each decision below carries a
recommendation. The user approves, changes, or cuts each one before Wave 1
starts.

The library ships nine themes: `default` and eight presets. Two checks
measure their accessibility today. The editor's contrast pair check finds
17 to 30 failing pairs in every theme, and nothing outside the editor runs
it. The Playwright component suite repeats axe's contrast rule and the
non-text checks under each preset on every Verify run. It costs 10 to 14
minutes a run and finds no issue of its own.

The plan moves the cheap check into CI and makes the slow one run only
when its inputs change. Each shipped theme gets a committed record of its
known pair failures. A new failure fails Verify, and each fix shrinks the
record. The axe repeat stores its results per theme under a fingerprint of
its inputs and replays them while the fingerprint holds. An audit of the
recorded failures then goes to the user, and the approved fixes land last.

## Ground truth

Measured on main at `9b85caf`, the v0.98.2 release.

1. **The axe repeat is most of Verify's contract run.** The 0.98.2 Verify
   run took 23.0 minutes for 321 contract tests.
   `src/testing/component-a11y.contract.ts`, 29 tests, took 13.7 of them;
   the other 292 tests took 9.2. The last green run before the
   accessibility work, at `0feec0e`, took 8.9 minutes for 292 tests.
2. **The repeat runs only in this repository.** `playwright.config.ts:7`
   sets `LIVE_TOKENS_A11Y_THEMES=all`. The suite reads it at
   `component-a11y.contract.ts:271` and walks `PRESETS` (line 24) at lines
   303 to 321. Each preset pass reruns axe's `color-contrast` and the focus
   indicator and boundary scans over every view. A consumer run scans its
   open theme once.
3. **The repeat finds no issue of its own.** A local run of the suite with
   the repeat on found 7 issues, all under `default`: focus indicator
   contrast in SlidePager and VideoFrame, and SIA-R65 in Input and Slider.
   The presets add 20 results to check by eye, 19 under sunset and 1 under
   halloween.
4. **The pair check runs only in the editor.** `AccessibilityTab.svelte:69`
   calls `contrastFailures(allContrastPairs(), createDomResolver())`. No
   test or CI step calls it outside its unit test. `createDomResolver`
   (`src/editor/core/palettes/resolveColor.ts:24`) reads the live document,
   so the check needs a browser with the editor loaded.
5. **Every shipped theme fails pairs.** Of the 236 registered pairs, a
   measurement on 2026-10-25 found these below their floor.
   `scratch/contrast-presets.mjs` holds the working script. It opens the
   components route, previews each theme through the Theme Picker, and
   makes the call above.

   | Theme | Failing pairs |
   |---|---|
   | default | 20 |
   | autumn | 18 |
   | halloween | 30 |
   | midnight-study, ocean, royal-velvet, sketchy, spring-meadow, sunset | 17 each |

   14 pairs fail under all nine themes, so component defaults cause them:
   Slider's fills, thumbs, and hover thumbs, TabBar's default and hover
   borders at 1.00:1, Toggle's thumb, SectionDivider's `sm` hairline, and
   SlidePager's hover icon. Progress Bar's fill and Slider's thumb fail
   in seven more themes. Halloween adds 16 of its own, muted text near
   4.0:1 and hairlines near 2.4:1. Default adds 6, hover text on Button,
   MenuSelect, and InlineEditActions, and TabBar's selected border at
   2.99:1.
6. **A pair's identity needs its backdrop.** SlidePager's hover icon and
   Slider's hover thumbs each declare two pairs with one foreground and no
   `context`. Only `backdrop` tells them apart
   (`src/editor/core/palettes/contrastPairs.ts:5`).
7. **The suite already records results and compares them.** `compareTrees`
   (`component-a11y.contract.ts:196`) writes `__aria__/<id>.yml` when the
   file is missing or `LIVE_TOKENS_UPDATE_ARIA=1`, and only where
   `ARIA_WRITABLE` (line 53) holds, which excludes `node_modules`.
   Otherwise it compares and reports each change.
8. **Theme previews leave the data tree alone.** The measurement in item 5
   previewed every theme and left `git status` clean.
   `src/testing/isolation.ts:34` resets the session pointers in the suite's
   isolated copy, so its first pass scans `default`.
9. **The suite's inputs change in about a third of commits.** Of the 164
   commits since v0.97.0, 50 touch the inputs D4 lists. That release was
   itself mostly accessibility work.
10. **Verify has a time ceiling.** Publish waits 40 minutes on Verify
    (`.github/workflows/publish.yml:67`). The repository's contract run
    allows 30 (`playwright.config.ts:17`).

## Decisions

**D1. A spec checks every shipped theme's pairs on each Verify run.**
`tests/e2e/theme-contrast.spec.ts` previews each of the nine themes and
measures every registered pair in the editor, the way the Accessibility
view does. It joins `npm run test:e2e` as `test:e2e:theme-contrast`.
*Recommended.* The check takes seconds a theme, so it needs no caching.

**D2. Each theme's known failures live in a committed record.**
`tests/e2e/theme-contrast/<slug>.json` lists the theme's failing pairs,
sorted, each with component, foreground, backdrop, context, role, ratio, and
floor. The spec fails on a failure missing from the record, and on a
recorded failure that now passes, so the record always states the truth.
`npm run record:theme-contrast` rewrites the records. *Recommended.* A
record that kept fixed pairs would let them regress unseen.

**D3. A pair's key is component, foreground, backdrop, and context.**
Ratios travel in the record for reading. A recorded pair whose ratio drops
further still matches. *Recommended.* Matching on ratio would fail Verify
on rounding moves in the colour engine.

**D4. The axe repeat runs only when its inputs change.** Each preset pass
stores its results with a fingerprint: a hash over the preset's theme
file, the shared inputs below, and the installed versions of `axe-core`,
`@axe-core/playwright`, the Alfa packages, and `@playwright/test`.

- `src/system/**`
- `src/editor/component-editor/**`
- `src/live-tokens/data/component-configs/**`
- `src/testing/component-a11y.contract.ts` and `src/testing/support/**`

When a component's record holds a matching fingerprint for a preset, the
suite replays the recorded results under that preset's label and skips the
pass. Otherwise it runs the pass and, where the tree is writable, rewrites
the record. *Recommended.* The list covers every file that styles a
component, its preview, or its scan. It leaves out the editor shell outside
`component-editor/`, because the suite scans only the preview stage.
Tracing each component's own imports would cut more reruns, and it would
miss a component that renders another one, as Dialog renders Button.

**D5. Records sit beside the recorded trees and stay out of the package.**
`src/testing/contracts/__a11y-themes__/<id>.json`, one file per
component, keyed by preset. The `files` list in `package.json` excludes
the directory. *Recommended.* Only this repository's run reads them.

**D6. Local runs refresh the records, and release checks them.** A local
run that executes a preset pass writes its record, the way `compareTrees`
writes a missing tree. `scripts/check-a11y-theme-records.mjs` recomputes
every fingerprint without a browser and fails on a stale one. It joins
`prepublishOnly`, beside `check:skill-atlas`. *Recommended.* A stale record
costs one slow Verify run and blocks nothing until release. A check in
`npm run check` would make every component edit wait on a three-minute
local sweep before its push.

**D7. The audit comes before any fix.** Wave 3 lists every recorded
failure in `temp/theme-contrast-audit.md` with a proposed repair. The user
marks each row Fix, Accept, or Defer. *Recommended.* Some failures may be
wrong floors: a TabBar border at 1.00:1 is invisible by design, and WCAG
1.4.11 needs boundary contrast only where the boundary identifies the
control.

- **Fix** remaps the property to an existing token that passes, in the
  component default or the theme file.
- **Accept** corrects the pair's declaration in the editor module: a
  different floor, an `inactive` flag, or a removed pair.
- **Defer** leaves the failure in its record.

## Invariants

1. A consumer run changes in nothing. With `LIVE_TOKENS_A11Y_THEMES`
   unset, the suite reads and writes no theme record, and no consumer
   command gains a rule or a finding.
2. A replayed preset pass reports the same findings, with the same view
   labels, that the run which wrote the record reported.
3. A record is written only where the tree is writable (Ground truth
   item 7).
4. No theme token is added. A Fix remaps to an existing token, and a
   component default changes in the component's `.svelte`
   `:global(:root)` block, then syncs to its `default.json`. No
   `tokens.css` primitive changes.
5. Verify stays under Publish's 40-minute wait. The pair spec adds under
   two minutes.
6. Every wave that runs the editor or the suite restores the data tree per
   `CLAUDE.md`, and `node scripts/check-production-is-default.mjs` passes
   afterwards.

## Out of scope

- A pair check in a consumer's `check-component --tests` or `check-page
  --tests`.
- Caching the suite's default-theme pass. It is the per-commit signal.
- Changes to the editor's Accessibility view.
- Fixing the 7 suite issues under `default` (Ground truth item 3). They
  sit in `temp/a11y-testing-report.md`'s open items.

## Running the plan

One orchestrator session runs the plan, one session per wave. Each wave's
session writes the code, runs the wave's Verify commands, fixes what they
report, and returns a summary. Waves 1 to 3 run in series with no stop
between them, and the orchestrator reports once after Wave 3. Wave 3 ends
with the audit table, so the plan stops there for the user. Wave 4 runs
after the user marks every row.

## Wave 1: pair records

- `tests/e2e/theme-contrast.spec.ts`: one test per shipped theme. It opens
  the components route on the suite's dev server and isolated data copy,
  previews the theme through the Theme Picker, and evaluates the
  Accessibility view's call (Ground truth item 4). The theme list comes
  from one exported constant that `component-a11y.contract.ts` also
  imports in place of its `PRESETS`.
- `tests/e2e/theme-contrast/<slug>.json`: the D2 records, written by
  `npm run record:theme-contrast` (`LIVE_TOKENS_RECORD_THEME_CONTRAST=1`).
- A failing test names each new pair, its ratio, and its floor, or each
  recorded pair that now passes, and ends with the record command.
- `package.json`: `test:e2e:theme-contrast`, appended to `test:e2e`.
- Tests: a new failure fails the test, a fixed pair fails it, an unchanged
  theme passes, and the D3 key tells apart two pairs that share a
  foreground.

**Budget.** Verify under 4 minutes.

**Verify.** `npm run test:e2e:theme-contrast`, `npm run check`, and
`npx vitest run` for any unit test the wave adds.

**Done when** all nine records exist, the spec passes against them, and
their counts match Ground truth item 5 or the wave explains each
difference.

## Wave 2: fingerprinted preset passes

- `src/testing/support/a11yThemeRecords.ts`: `themeFingerprint(slug)`
  over D4's inputs, plus record read, write, and replay. The fingerprint
  code has no browser dependency, so the release check shares it.
- `component-a11y.contract.ts`: before each preset pass, read the
  component's record. A matching fingerprint replays the stored results
  into `found` under `<view> under <theme>` and skips
  `previewThemeUncovered`. A mismatch runs the pass as today and writes the
  record where writable.
- `scripts/check-a11y-theme-records.mjs` and `check:a11y-theme-records`,
  added to `prepublishOnly` (D6).
- `package.json` `files`: exclude `__a11y-themes__` (D5).
- Tests: editing a preset's theme file stales only that preset;
  editing a file under `src/system/` stales every preset; a replay
  reproduces the stored findings and labels (Invariant 2); a consumer path
  under `node_modules` never writes.

**Budget.** Verify under 10 minutes, the suite included.

**Verify.** `npx playwright test --project=contract
src/testing/component-a11y.contract.ts` twice: the first run writes every
record, and the second replays them. Then `npm run
check:a11y-theme-records`, `npm run check`, and the wave's unit tests.

**Done when** the second suite run reports the same findings as the first
and takes under a third of its time.

## Wave 3: audit table

- `temp/theme-contrast-audit.md`: every recorded failure, grouped as
  shared by all nine themes, shared by several, or one theme's own. Each row
  gives component, property, backdrop, ratio range, floor, themes, a
  proposed repair, and an empty Decision column (D7).
- Each proposed repair names the existing token it remaps to and that
  token's measured ratio under every affected theme, or states why the
  floor is wrong and cites the WCAG success criterion.
- No product code changes.

**Budget.** No Verify. The wave measures with the Wave 1 spec.

**Done when** every recorded failure has a row with a proposed repair.

## Wave 4: approved repairs

- Apply each row the user marked Fix or Accept (D7).
- Rerun `npm run record:theme-contrast`. Each record shrinks by its fixed
  and accepted rows and keeps its Defer rows.
- Sync each changed component default to its `default.json` with the dev
  server stopped.

**Budget.** Verify under 30 minutes.

**Verify.** `npm run test:e2e:theme-contrast`, the contract run for every
component the wave touched (`check-component <id> --tests`), `npm run
check`, and `node scripts/check-production-is-default.mjs`.

**Done when** each record holds only Defer rows.
