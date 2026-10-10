# Contrast checker

Plan of 2026-10-09, revised 2026-10-10 to run unattended. The audit is
`temp/contrast-checker-audit.md`, and the per-pair evidence is
`temp/contrast-checker-inventory.md`. The user approved the audit's decisions
1 to 3 on 2026-10-09. Decisions 4 and 5 are proposed defaults this plan
follows, and decision 6 stays open.

Every color row in a component editor whose variable paints a foreground
shows the WCAG contrast ratio between that color and the layers behind it.
The value always shows. A pair below its floor turns amber and gains an
exclamation mark. Clicking the value opens a popover that names the rule and
links to the success criterion. No row moves: the readout sits beside the
foreground's own color row, wherever the editor already puts it.

## Unattended run

`/plan-all contrast` runs Waves 0 to 6 with nobody watching.

- **Worktree.** Wave 0 creates the worktree `../live-tokens-contrast`, beside
  the repository, on the branch `contrast-checker` from the repository's
  `HEAD`. Every later agent works only there. The repository's own checkout
  keeps the user's uncommitted work, and no agent writes to it.
- **Run log.** The `## Run log` section at the end of this file, in the
  worktree's copy, records the baseline, every judgment call, every deferred
  question and the final summary. The user reads it on return.
- **Review rules.** Each wave's **Review rule** settles that wave's judgment
  calls. The executor applies the rule, records the call in the Run log, and
  commits the log with the unit. When no rule decides, the executor takes the
  option that changes the least and records it under Deferred. The reviewer
  checks each call against its rule and blocks only for a defect: a broken
  invariant, a failing gate, a misapplied rule, or code that contradicts this
  plan.
- **Baseline.** Wave 0 runs the gates the waves use and records each failure
  that predates the run. A verify step ignores those failures.
- **Retries.** Each wave gets two fix rounds. After the first failure the
  executor escalates to Fable.
- **Browser.** Wave 5 runs Playwright headless. Its dev server takes a free
  port and an isolated copy of the data tree, so it never meets a server the
  user runs.
- **End state.** The branch stays unmerged. Wave 6 writes the summary.

## Ground truth

- `src/editor/core/palettes/contrast.ts` exports `contrastRatio`, `AA_BODY`
  (4.5) and `AA_LARGE` (3).
- `src/testing/support/pageHarness.ts:277-279` holds `LARGE_TEXT_PX`,
  `LARGE_BOLD_PX` and `BOLD`, and `aaFloor` (`:298`) applies them. Its
  `observeContrast` (`:590`) resolves colors through a 1×1 canvas in `copy`
  mode and composites a translucent foreground with `over`.
- `RegistryEntry` (`src/editor/component-editor/registry.ts`) carries
  `schema` (the editor's `allTokens`) and optional `intrinsics`.
  `registerComponent()` takes the same shape minus `origin`.
- `registry.ts` imports every editor, and every editor imports
  `UIPaletteSelector` through `TokenLayout` or `TypeEditor`. A palette
  selector that imported `registry.ts` would close an import cycle.
- Type-group colors reach `allTokens` through `buildTypeGroupColorTokens`, so
  a check over the schema covers TypeEditor color rows.
- `UIPaletteSelector` renders through `UITokenSelector`, which spans columns 2
  and 3 of a row. Its `triggerMeta` snippet renders the value name in column 3
  (`.ui-ts-meta-text`).
- `src/editor/ui/UIInfoPopover.svelte` renders a fixed info-icon button and a
  titled popover that closes on Escape and on an outside click.
- `--ui-highlight` (`#ffac28`, `src/editor/styles/ui-editor.css:51`) is the
  editor's amber.
- `cssVarSync` writes component aliases to `:root` of the editor document and
  of its parent, so the editor document resolves every component variable.
- Vitest runs in `node`. A test file opts into `happy-dom` with a docblock.
- `playwright.config.ts` builds on `createPlaywrightConfig`
  (`src/testing/playwright.ts`). Its web server probes for a free port, never
  reuses a running server, and points the dev server at an isolated data
  copy. The `chromium` project runs `tests/e2e/*.spec.ts`.
  `openComponentsEditor` (`src/testing/support/editor.ts:17`) opens the
  components editor.

## Invariants

1. **Grouping stays.** No token moves between sections, panels or parts.
   `TokenLayout`'s sort and `StateBlock`'s section split stay as they are.
2. **The readout is read-only.** It never writes the store, an alias or a CSS
   variable.
3. **One contrast definition.** `contrastRatio`, the floors and the large-text
   constants live in `contrast.ts`. `pageHarness.ts` and the editor import
   them.
4. **Measurement is pure.** `measurePair` takes a resolver. Only
   `resolveColor.ts` touches the DOM.
5. **Declarations follow the runtime.** A pair's backdrop lists the layers the
   runtime CSS paints behind the foreground, top first, per the inventory.
6. **The editor stays greyscale** apart from the amber mark on a failing pair.
   Styles use `--ui-*` tokens only. `check:editor-font-isolation` passes.
7. **Copy follows the writing rules:** active voice, no em dashes, and no
   statement paired with its rejected opposite. This covers UI strings,
   comments, `CHANGELOG.md`, docs and skill text.
8. **The data tree is untouched.** A wave that runs the editor restores
   `src/live-tokens/data` as `CLAUDE.md` describes, and
   `node scripts/check-production-is-default.mjs` passes.
9. **The engine loads lazily.** `bin/engineLoadsLazily.test.ts` stays green.
10. **Skills stay in sync.** After any `SKILL.md` edit, run
    `npm run sync:skill-atlas` and `npm run sync:skill-sources`.
11. **Public additions land under `### Added`** in a
    `## Unreleased` section of `CHANGELOG.md`.
12. **The run stays in its worktree.** No agent writes to the repository's own
    checkout. Wave 6 compares that checkout's `git status --short` with the
    snapshot Wave 0 took.

## Out of scope

- The preview backdrop (audit decision 6).
- Hard-coded colors (audit finding 5).
- Reordering rows, including the split ImageLightbox chrome rows (finding 6).
- Responsive type: sizes are measured as the editor computes them.
- A default-theme test, and a `check-component` rule for `contrastPairs`.
  Wave 5 writes a report of the failing defaults and changes none.
- Pairs across components, such as a Button in a Dialog footer.
- The motionproto-site gradient bug on hover surfaces.
- Merging the branch, and releasing.

## Agents and workflow runs

| Wave | Execute | Verify | Review | Gate |
|---|---|---|---|---|
| 0 Setup | `wave-executor` | none | none | automatic |
| 1 Measurement core | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 2 Declarations | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 3 Readout | `svelte:svelte-file-editor` | `test-verifier` | `wave-reviewer` | automatic |
| 4 Skill and docs | `wave-executor` | `test-verifier` | `wave-reviewer` on Sonnet | automatic |
| 5 Browser check | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 6 Report | `wave-executor` | none | none | automatic |

**Saved workflows.** `contrast` is an entry in the `PLANS` tables of
`.claude/workflows/plan-wave.js` and `plan-all.js`, with `root`,
`unattended`, `fixRounds` and `escalateModel` set.

| Command | Runs | Then |
|---|---|---|
| `/plan-all contrast` | Waves 0 to 6 | Read the Run log in `../live-tokens-contrast/docs/plans/contrast-checker.md` |
| `/plan-all contrast from <wave>` | Resumes a stopped run | The worktree and its commits carry over |

**Ledger.** Every executor commits with the subject prefix `Contrast W<n>:`.
`git log --grep "Contrast W"` in the worktree is the record the reviewer
reads.

## Wave 0: setup

This wave starts in the repository's own checkout and ends in the worktree.

1. Record `git status --short` and `git rev-parse HEAD` of the repository's
   checkout.
2. When `../live-tokens-contrast` is absent, run
   `git worktree add ../live-tokens-contrast -b contrast-checker HEAD` from
   the repository root. When it exists on `contrast-checker`, reuse it. When
   it exists on any other branch, stop with gates `fail`.
3. Copy these files from the repository's checkout into the worktree when the
   worktree lacks them or holds an older copy: this plan, both
   `temp/contrast-checker-*.md` files, `.claude/workflows/plan-wave.js` and
   `.claude/workflows/plan-all.js`. Commit them with the subject
   `Contrast W0: plan, audit and inventory`.
4. Run `npm ci` in the worktree.
5. Run the baseline gates in the worktree: `npx vitest run src/editor bin`,
   `npm run check`, `npm run check:editor-font-isolation`,
   `npm run check:skills`, `npm run check:skill-atlas`,
   `npm run check:skill-sources`, `npm run check:docs-content`. Write each
   failure's decisive line under `### Baseline` in the Run log, with the
   snapshot from step 1. Commit with the subject
   `Contrast W0: baseline`.

**Done when** the worktree is on `contrast-checker`, `node_modules` exists in
it, and its Run log holds the Baseline.

## Wave 1: measurement core

1. In `contrast.ts`, add `LARGE_TEXT_PX = 24`, `LARGE_BOLD_PX = 18.66`,
   `BOLD = 700` and `isLargeText(px, weight)`. `pageHarness.ts` imports them,
   and `aaFloor` calls `isLargeText`. Delete the harness's local copies.
2. Add `CONTRAST_RULES` to `contrast.ts`, keyed by role:
   - `text`: criterion `1.4.3`, name `Contrast (Minimum)`, level AA, floor
     `AA_BODY`, large floor `AA_LARGE`, url
     `https://www.w3.org/TR/WCAG22/#contrast-minimum`.
   - `non-text`: criterion `1.4.11`, name `Non-text Contrast`, level AA,
     floor 3, url `https://www.w3.org/TR/WCAG22/#non-text-contrast`.

   Export `floorFor(role, large)`.
3. Create `src/editor/core/palettes/contrastPairs.ts` with:
   - `ContrastPair`, as the audit's Proposal 1 defines it. `--page-bg` never
     appears in `backdrop`; it always sits under the last layer.
   - `Rgba`, and `over(front, back)`.
   - `Resolver`: `color(name)` returns one `Rgba` for a solid value and one
     per stop for a gradient. `fontPx(name)` and `fontWeight(name)` return
     numbers.
   - `measurePair(pair, resolver)`. It composites bottom-up: `--page-bg`,
     then the backdrop layers from last to first, then the foreground. Every
     combination of gradient stops gets measured, and the worst ratio wins.
     It returns `{ pair, ratio, floor, large, passes }`. An inactive pair
     always passes.
   - `closestToFailing(measures)`, the measure with the lowest ratio over its
     floor.
4. Create `src/editor/core/palettes/resolveColor.ts` with
   `createDomResolver(doc = document)`. A hidden probe element reads each
   color through `color: var(<name>)` and paints it through a 1×1 canvas in
   `copy` mode, as `observeContrast` does. When the variable's computed value
   is a gradient function, `gradientStops(value)` splits its arguments at
   top-level commas, drops the direction and position arguments, and the
   probe resolves each stop color. `fontPx` and `fontWeight` read the probe's
   computed `font-size` and `font-weight`. Export `gradientStops` for tests.
5. Tests:
   - `contrast.test.ts`: `isLargeText` at 24/400 (large), 23.9/400 (not
     large), 18.66/700 (large) and 18.66/600 (not large), and `floorFor` for
     each role.
   - `contrastPairs.test.ts`, with a stub resolver: opaque on opaque, a
     translucent foreground, a translucent backdrop over the page, an empty
     backdrop measured against the page, a gradient layer reporting its worst
     stop, an inactive pair below its floor that passes, the 3:1 non-text
     floor, the large-text floor, and `closestToFailing`.
   - `resolveColor.test.ts` covers `gradientStops` in `node`: a `color-mix()`
     stop, stops with positions, a direction argument, and a radial gradient.
     Wave 5 covers the DOM path.

**Review rule.** `aaFloor` returns the same floor for every size and weight
before and after the move. Any difference is a defect.

**Verify.** `npx vitest run src/editor/core/palettes`, `npm run check`,
`npm run build:testing`.

**Done when** both test files pass, `pageHarness.ts` imports the large-text
constants, and `grep -rn "LARGE_TEXT_PX = " src/testing` prints nothing.

## Wave 2: declarations

1. Create `src/editor/core/components/contrastPairRegistry.ts` with
   `registerContrastPairs(id, pairs)`, `getContrastPairs(id, variable)` and
   `allContrastPairs()`. `getContrastPairs` returns every pair whose
   foreground is `variable`. `allContrastPairs` returns every registered pair
   with its component id. The palette selector reads this module, which keeps
   it out of the `registry.ts` import cycle.
2. `RegistryEntry` gains `contrastPairs?: ContrastPair[]`. Each editor with a
   foreground exports `contrastPairs` from `<script module>`. `registry.ts`
   wires each export into its entry, the way it wires `intrinsics`, and
   registers every entry's pairs through `registerContrastPairs`.
   `registerComponent()` registers a custom entry's pairs the same way.
3. Declare the pairs for the 24 editors that have foregrounds, from
   `temp/contrast-checker-inventory.md`. Build variants with each editor's
   own per-variant functions. Rules:
   - `backdrop` takes the inventory's "backdrop var (runtime truth)" column,
     top layer first, without `--page-bg`.
   - When the runtime paints a tint gate as a `background-image` layer on a
     hover rule, the gate variable (such as `--button-hover-tint-enabled`)
     sits above the hover surface.
   - Colors with the `-icon` suffix and the foregrounds the inventory marks
     `mark` take role `non-text`.
   - Text pairs name `fontSize` and `fontWeight` from the inventory's
     size+weight column. When a foreground renders at two sizes, name the
     smaller.
   - A disabled state's pairs are `inactive`.
   - A foreground over several backdrops gets one pair per backdrop, each
     with a `context`.
   - An element that inherits its color, such as Button's `<i>` or Badge's
     `.icon`, gets no pair of its own.
   - Hard-coded and unexposed foregrounds get no pair. A layer owned by
     another component, such as SideNavigation's child CollapsibleSection
     surface, stays out of the stack.

   Commit in batches of at most eight editors.
4. Create `src/editor/component-editor/contrastContract.test.ts`. For every
   registry entry, it asserts:
   - Every schema token of kind `text-color` is the foreground of at least
     one pair.
   - Every foreground and backdrop variable is in the schema or is an
     intrinsic's variable.
   - Every text pair names `fontSize`.
   - No two pairs share foreground, backdrop and context.

**Review rule.** The runtime CSS decides every pair. When it disagrees with
the inventory, the CSS wins and the Run log records the difference. The
inventory's multi-backdrop cases resolve this way:

- Notification `-text`: one pair for the dismiss icon on the header surface
  (non-text), one for the body text on the page (text).
- Input placeholder: one pair per state surface it paints on (default,
  focused, disabled), the disabled one `inactive`.
- ImageLightbox `chrome-icon`: one non-text pair on the chrome surface, and
  one text pair for the counter on the chrome surface with `fontSize`
  `--font-size-xs`.
- SlidePager counter: one pair on the page (`inline`) and one on the scrim
  surface (`zoomed`).
- Slider thumb: one pair on the fill and one on the track.
- SegmentedControl and MenuSelect states with a transparent own surface: the
  own surface first, then the bar or menu surface.

**Verify.** `npx vitest run src/editor/component-editor`, `npm run check`.

**Done when** the contract test passes for every registry entry and
`grep -c "contrastPairs" src/editor/component-editor/registry.ts` reports at
least 24.

## Wave 3: readout

1. `UIInfoPopover` gains an optional `trigger` snippet, rendered inside its
   button in place of the info icon. Existing callers keep the icon.
2. Create `src/editor/ui/contrastReadout.ts` with pure helpers:
   - `formatRatio(ratio)` returns two decimals, truncated, such as `4.49:1`.
     Truncation keeps a failing value from displaying as its floor.
   - `readoutState(measures)` returns the label, the state (`pass`, `fail`
     or `inactive`), and an `aria-label` such as "Contrast 2.90:1, below
     4.5:1".
   - `ruleSentence(measure)` returns the rule the pair tracks, such as
     "WCAG 2.2 success criterion 1.4.11, Non-text Contrast (AA): 3:1 against
     the colors behind it." The text rule adds "or 3:1 for large text (24px,
     or 18.66px bold)". An inactive pair adds "Disabled controls are exempt."
3. Create `src/editor/ui/UIContrastReadout.svelte` with props `component` and
   `variable`. It reads `getContrastPairs`, measures each pair with
   `createDomResolver` and `measurePair`, and shows `closestToFailing`. It
   recomputes after each `$editorState` change, one animation frame later so
   the CSS variables have landed, and after a theme load. Its root carries
   `data-contrast-state` (`pass`, `fail` or `inactive`) and
   `data-contrast-ratio` for tests.
   - **Passing:** the value in `--ui-text-secondary`.
   - **Failing:** an exclamation mark and the value in `--ui-highlight`.
   - **Inactive:** the value in `--ui-text-tertiary`, never amber.
   - The value and the mark are the `UIInfoPopover` trigger. The popover,
     titled "Contrast", lists each pair: its `context` when present, the rule
     sentence, the measured ratio, the backdrop variables in mono over "page
     background", and a link "Success criterion <n>" to the rule's url, opened
     in a new tab with `rel="noopener"`.
4. `UITokenSelector` gains a snippet rendered after the meta text in column
   3. The value name truncates before the readout does. `UIPaletteSelector`
   renders `UIContrastReadout` in that snippet when `component` is set and
   `getContrastPairs` returns at least one pair.
5. `CHANGELOG.md` `## Unreleased` `### Added`: the contrast readout, and the
   `contrastPairs` field on editor modules and on `registerComponent()`.
6. `contrastReadout.test.ts` covers `formatRatio` at 4.499 and 7, a pass, a
   fail, an inactive pair below its floor, several pairs on one foreground,
   and both rule sentences.

**Review rule.** Under `TokenLayout`'s 380px container query the readout
wraps onto its own line under the selector. It never overlaps the value name
and never widens the panel.

**Verify.** `npx vitest run src/editor`, `npm run check`,
`npm run check:editor-font-isolation`.

**Done when** `UIPaletteSelector` renders `UIContrastReadout` for a pair's
foreground and `contrastReadout.test.ts` passes.

## Wave 4: skill and docs

1. `.claude/skills/live-tokens-create-component/SKILL.md` gains one step in
   the editor-file section: export `contrastPairs`, one pair per foreground
   and backdrop, with the layers behind the foreground listed top first, the
   role, and the font size for text. Then run `npm run sync:skill-atlas` and
   `npm run sync:skill-sources`.
2. `src/editor/docs/content/editing-tokens.md` gains a "Contrast readout"
   section: the value, the amber mark, the popover, the disabled exemption,
   and the page background under every stack. Then run `npm run sync:docs`.

**Review rule.** Each skill sentence states what `contrastContract.test.ts`
enforces, and nothing it contradicts.

**Verify.** `npm run check:skills`, `npm run check:skill-atlas`,
`npm run check:skill-sources`, `npm run check:docs-content`,
`npm run check:cli-strings`.

**Done when** `grep -n "contrastPairs" .claude/skills/live-tokens-create-component/SKILL.md`
finds the step and the five gates pass.

## Wave 5: browser check

1. Create `tests/e2e/contrast-readout.spec.ts` for the `chromium` project.
   Each test opens the components editor with `openComponentsEditor` and
   attaches a screenshot of what it checks with `testInfo.attach`:
   - Button primary's default text color row shows a readout in state
     `pass`. Its ratio matches, to 0.01, a ratio the test computes in the
     page from the two resolved colors with its own canvas read.
   - Choosing White for Button primary's default surface turns that readout
     to state `fail`, amber, with an exclamation mark.
   - Clicking the readout opens a popover that names 1.4.3 and links to
     `https://www.w3.org/TR/WCAG22/#contrast-minimum`.
   - Button primary's disabled text color shows state `inactive`.
   - A Toggle thumb readout's popover names 1.4.11.
   - Notification's body color popover lists two pairs.
2. Write `temp/contrast-checker-defaults.md` from a one-off Playwright
   script under `scratch/`. The script opens the components editor, imports
   `allContrastPairs`, `measurePair` and `createDomResolver` in the page
   through the dev server, and measures every pair in the shipped default
   theme. The report lists failing active pairs first, with component,
   foreground, backdrop, ratio and floor, then counts the passing pairs.
   Delete the script.

**Review rule.** A failing default goes into the report and stays unchanged.
A test that fails because of a shipped default uses a different pair.

**Verify.** `npx playwright test tests/e2e/contrast-readout.spec.ts --project=chromium`,
`node scripts/check-production-is-default.mjs`,
`git status --short src/live-tokens/data`.

**Done when** the spec passes, `temp/contrast-checker-defaults.md` exists,
and `git status --short src/live-tokens/data` prints nothing.

## Wave 6: report

Write `### Summary` at the top of the Run log:

- Each wave's commits, from `git log --grep "Contrast W" --oneline`.
- The count of judgment calls under Calls, and every Deferred question.
- The count of failing default pairs, pointing to
  `temp/contrast-checker-defaults.md`.
- The repository checkout's `git status --short` against the Wave 0
  snapshot. Any difference is listed as a possible write outside the
  worktree.
- The command to review the branch: `git -C ../live-tokens-contrast log --oneline main..contrast-checker`.

Commit with the subject `Contrast W6: report`.

**Done when** the Run log holds the Summary and the worktree's
`git status --short` prints nothing.

## Run log

### Summary

### Baseline

Snapshot of the repository's checkout, taken 2026-10-10 before the worktree
existed:

- `git rev-parse HEAD`: `ab02b35a6d967605b0a7baa11419d7064fbb4e51` on `main`.
- `git status --short`: empty.

Gates run in the worktree on `contrast-checker` at `ab02b35`, with
`node_modules` from `npm ci` and no `dist-plugin/`. Every gate passes, so no
failure predates the run:

- `npx vitest run src/editor bin`: 97 files, 4349 tests passed.
- `npm run check`: 1321 files, 0 errors, 0 warnings.
- `npm run check:editor-font-isolation`: OK.
- `npm run check:skills`: OK, 8 skills.
- `npm run check:skill-atlas`: OK.
- `npm run check:skill-sources`: current, 8 skills, 20 files.
- `npm run check:docs-content`: current, 8 chapters.

### Calls

- W0 step 3: `HEAD` already tracks the plan, both `temp/contrast-checker-*.md`
  files and both workflow scripts, byte-identical to the checkout, so the
  worktree copied nothing and the `Contrast W0: plan, audit and inventory`
  commit does not exist.
- W1 Review rule: `aaFloor` now returns `isLargeText(...) ? AA_LARGE : AA_BODY`,
  the same expression the local constants formed. A one-off comparison of the
  old and new forms over every size from 0 to 40px in 0.01px steps, the
  thresholds plus and minus 0.01, and 14 weights from 0 to 1000 found no
  difference.
- W2 step 3, editor count: 27 registry entries hold `text-color` tokens, every
  editor except Panel and Image, as the inventory's tables list. The plan's 24
  repeats the audit's count. Step 4's first assertion requires a pair for each,
  so all 27 editors declare pairs.
- W2 step 3, tint gates: the gates are intrinsics the editors already export
  but `registry.ts` never wired. Step 4 admits a backdrop variable only from the
  schema or an intrinsic, so each entry whose pairs name a gate now carries its
  editor's `intrinsics` (Button, IconButton, SegmentedControl, TabBar,
  MenuSelect, SideNavigation). `intrinsicsContract.test.ts` covers and passes
  them. ImageLightbox's `tile-fit` stays unwired because no pair names it.
- W2 Button: the text renders at the variant size and at the shared small size,
  so every Button text pair names `--button-small-text-font-size` and
  `--button-small-text-font-weight`, the smaller size by default (sm against lg).
- W2 Button and IconButton outline `:active`: the CSS repaints with the
  `background` shorthand, which drops the tint layer, and sets no color. A
  pointer press keeps the hover color and a key press or `force-active` keeps
  the default one, so both colors gain a pair on the active surface, with
  contexts `default`, `hover` and `active`.
- W2 InlineEditActions: each `-text` color paints a lone glyph (`fa-check`,
  `fa-times`) and no text, so the CSS makes its pairs `non-text`.
- W2 Notification body: `size="small"` sets `.notification-description` in
  `--font-size-sm`, the smaller of its two sizes, so the body pair names it
  with the variant's weight. The dismiss pair takes the context
  `dismiss button` and the body pair `body`.
- W2 Input: the CSS colors the icon button's glyph with `--input-focused-icon`
  on hover and on `:focus-within` while the field stays unfocused, so that
  color gains a second pair on the default surface (contexts `focused` and
  `icon button`). Each placeholder pair names its state's text size and weight.
- W2 SegmentedControl and MenuSelect: every option sits inside the bar and
  every item inside the menu, so the bar or menu surface closes every state's
  stack, the opaque hover and selected surfaces included. `.segment` hard-codes
  a transparent background, so the default option's stack is the bar alone.
- W2 SegmentedControl text: `.small` rebinds every state's text size to
  `--segmentedcontrol-option-small-text-font-size`, so each text pair names it
  with its own state's weight.
- W2 TabBar indicators: the inventory marks `--tabbar-<state>-border` as a
  `mark` in all four states, so each takes a non-text pair on its tab's stack.
  The default and hover indicators ship transparent and measure 1:1.
- W2 Card: `size="small"` sets the title in `--font-size-md` and the body in
  `--font-size-sm`, the smaller of each one's two sizes, so the pairs name
  those with the Card's own weights.
- W2 Table header: the inventory lists the header surface alone, but `th`
  sits inside `.table-wrapper`, which paints `--table-default-surface`, so the
  CSS puts the wrapper under the header surface.
- W2 Dialog: the inventory lists the header surface and the dialog surface
  alone, but the CSS nests the header and body in `.dialog` and `.dialog` in
  `.dialog-backdrop`, which paints the scrim. The title and close icon stack
  header, dialog and scrim; the body stacks dialog and scrim.
- W2 SlidePager controls: the inventory lists the control surface alone, but
  the zoomed bar sits on `.slidepager-modal`, which paints the scrim. Each
  control color takes an `inline` pair on its surface and a `zoomed` pair on
  its surface over the scrim. The counter follows the Review rule.
- W2 SideNavigation: the title label stacks the label surface, the title state
  and the panel. A pointer on the toggle also hovers `.sn-title`, and a
  selected title has no hover rule, so the default toggle icon takes one pair
  per title state and the hover icon one per hovered and selected title, with
  contexts `title <state>`. The `-indicator` colors are absent from the
  inventory and take no pair.
- W2 Slider: the default, hover and disabled thumbs each take a `fill` pair and
  a `track` pair per the Review rule, the disabled ones `inactive`. The shared
  label and value take one pair each on the page.
- W2 RadioButton: the ring and the hover and selected dot fills are marks on
  the page. The default dot renders at opacity 0 and takes no pair.
- W2 ImageLightbox: per the Review rule, `--imagelightbox-chrome-icon` takes an
  `icons` pair and a `counter` text pair at `--font-size-xs`, both on the chrome
  surface over the scrim, as the inventory's stack runs. The close and gallery
  buttons repaint with `--imagelightbox-chrome-hover-surface` on hover, so a
  third `hovered icons` pair sits on that surface over the scrim.
- W2 VideoLightbox and VideoFrame: a stack drops the footage, which is no
  variable, and keeps the component's layers under it. The VideoLightbox badge
  sits on `--videolightbox-tile-surface`, which `.videolightbox` paints behind
  the poster and the inventory omits; the VideoFrame badge sits on the clip and
  frame surfaces, as the inventory lists. The close button takes `default` and
  `hover` pairs over the scrim.
- W2 step 4, token kind: `rawKind` sends the hidden per-side padding rows
  (`-padding-top` and the rest) to `text-color` by fall-through, so the first
  assertion classifies each schema token by `rawKind(stripSide(variable))`,
  the side-aware reading `matchesKind` already uses.
- W3 Review rule: TokenLayout's 380px query wraps `.ui-ts-meta` and gives the
  value name a full line, so the readout takes a line of its own under it. A
  headless probe of Button's text color row found the readout below the value
  name at variant-group widths of 321 and 381px and beside it at 441px, with no
  horizontal overflow of the token grid or the variant group.
- W3 step 3, popover: a failing pair's measured ratio in the popover carries
  the readout's amber exclamation mark, which Invariant 6 allows on a failing
  pair. Passing and inactive pairs stay grey.
- W3 step 5, Invariant 11: `src/editor/ui/index.ts` exports `UITokenSelector`,
  so its `metaAfter` snippet is a public addition and takes a third
  `### Added` entry. The index exports neither `UIInfoPopover` nor
  `UIContrastReadout`, so the `trigger` snippet and the readout take none.

### Deferred

- W1 step 1: `pageHarness.ts` imports `isLargeText` alone. `aaFloor` was the
  only reader of the large-text constants, so importing `LARGE_TEXT_PX`,
  `LARGE_BOLD_PX` and `BOLD` as well would add unused bindings. The Done-when
  line "imports the large-text constants" reads as met through `isLargeText`;
  the reviewer may prefer the literal import.
- W1 step 3: `closestToFailing` ranks active measures before inactive ones and
  falls back to the inactive ones only when no active pair exists. The step's
  literal "lowest ratio over its floor" would let an inactive pair hide a
  failing active pair on the same foreground, such as Input's placeholder on
  its disabled surface, and the readout would then skip the amber mark this
  plan promises for every pair below its floor. The audit states that an
  inactive pair applies no floor, which supports the ranking. The reviewer may
  prefer the literal reading.
- W2 step 2: `RegisterComponentEntry` gains `contrastPairs` through
  `RegistryEntry`, but the `ContrastPair` type stays out of the public
  `component-editor` index, which exports `Token` and `IntrinsicSpec`. A
  consumer can pass pairs without the type. No step names the export, so the
  wave adds none; Wave 3 or 4 may export it beside `IntrinsicSpec`.
- W3 step 4: `UITokenSelector` wraps the value name and the snippet in
  `.ui-ts-meta` only when `metaAfter` is set. A row without a readout keeps its
  markup, so the four parents that restyle `.ui-ts-meta-text` (GradientEditor,
  ControlBody, VariantGroup, ShadowBackdropControls) see no change. The
  reviewer may prefer one wrapper on every row.
- W3 step 3: a VariantGroup tab reuses one selector across states, so after a
  tab switch the readout shows the previous variable's measure for one frame.
  Hiding the readout until the new measure lands would shift the row for that
  frame instead, so the wave keeps the lag.
- W3 autofixer: `svelte-autofixer` reports missing `{#each}` keys in
  `UIPaletteSelector.svelte` (8) and `TokenLayout.svelte` (2), all on lines the
  wave leaves untouched. A key on TokenLayout's entry loop could remount its
  selectors, so the wave adds none.
- W3 step 5: the changelog names the `contrastPairs` field, and the
  `ContrastPair` type stays out of the public `component-editor` index, as W2
  left it. No Wave 3 step names the export, so Wave 4 or the reviewer may add
  it beside `IntrinsicSpec`.
