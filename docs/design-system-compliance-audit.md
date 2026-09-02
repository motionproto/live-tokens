# Design-system compliance audit, 2026-09-02

Results for the agenda in `design-system-compliance-briefing.md`. Each item
below was measured, not read: probes against both checkers, the shipped
catalogue, the `create` template, a packed tarball, and the
`live-tokens-online` consumer.

## Findings

| # | Goal | Finding | Outcome |
| --- | --- | --- | --- |
| 1 | G1 | `check-page` reported a `var(--x, #fff)` fallback as a colour literal. 33 of the consumer's 39 errors were this. | Fixed. Colour and dimension rules both read the value with fallbacks stripped. |
| 2 | G1 | The declaration parser read `--heading-2xl: 1.875rem` as the property `xl`, and discovered the consumer's `tokens.css` as a page. | Fixed. Property names are read from their start; the resolved tokens.css and the generated token files are never pages. |
| 3 | G1 | Inline `style="color:#fff"` and `style:color="#fff"` were invisible. | Fixed. Both are read as declaration lists under the same rules. |
| 4 | G1, G2 | Named colours were invisible to both checkers. `check-component` only knew hex, so `rgb()` and `oklch()` defaults passed. | Fixed. One `cssValues.mjs` answers "is this a literal" for both. |
| 5 | G1 | A page could pass a prop a component does not declare, or a variant outside its union, and nothing said so. | Added `unknown-prop` and `unknown-prop-value`. Every shipped component declares `interface Props` and none spreads a rest object, so the prop set is exact. Tags with a spread are skipped. |
| 6 | G2 | `default-not-token` was a warning. SideNavigation's two rem widths were the only catalogue breakage. | Promoted to error. The widths now read `calc(var(--space-64) * 4)` and `var(--space-48)`; the eight presets carry the new alias in derived key order. |
| 7 | False negatives | `check-component` and `tokenVocabulary` each had their own `:global(:root)` extractor, one truncating at the first `}`. | One brace-balanced extractor, shared. |
| 8 | False negatives | The `intrinsics` exemption needed the closing `];` on its own line. | Fixed. |
| 9 | G4 | The loop was instructed, never enforced. | `check-component` with no id checks every authored component. The template's `npm run build` runs `check:design` first. `check:smoke-create` now proves both checkers run from the tarball. Two outcome evals carry a deterministic `tool_used` grader. |
| 10 | Fixture | Nothing proved a rule could still fire. | Mutation tables: a clean component with 16 one-line breaks, a clean page with 13, each mapped to the rule that must catch it. |

## Second pass: structure and semantics

Three questions from the follow-up assessment, each answered by a census of
the catalogue before any rule was written.

- **Kind mismatch: no rule.** 38 defaults read a token from a family other
  than the one their suffix names. Most are deliberate: a `-divider` reads
  `--border-*`, a `-border` reads `--color-transparent`, Toggle's thumb reads
  `--text-primary`. The picker's kinds are coarser than the token families, so
  a rule built on `KIND_RULES` would report the catalogue's own semantics as
  errors. The right family is a design judgement the checker cannot make.
- **Disabled is terminal: `disabled-is-terminal` (error).** A token naming
  `disabled` with `hover`, `focus`, `selected`, `on`, `active`, or `checked`
  describes a state that never paints. No shipped token does; the skill's two
  absolute rules are now enforced from the name alone. The other state-model
  rule, disabled after a part, is not name-checkable because a part and a
  variant look the same in a token.
- **Editor-to-runtime agreement: `phantom-editor-token` (error).** Every
  token an editor row names, literal or `${variant}` pattern, must be declared
  in the runtime's `:global(:root)`. Per-side padding names resolve to their
  parent. The reverse direction, a declared token no row names, is left
  unchecked: five shipped editors get their hover-tint row from a shared
  helper and SideNavigation's panel widths are deliberately not editable, so
  the finding would be noise.

## Exercise: the Slider

`live-tokens-create-component` was followed end to end for a first-party
Slider with two variants, `single` and `range`, as the one live test of goal
G4 the account allows.

- The picker had nothing that fits, so the recipe applied. Runtime, editor,
  registry entry, sketch rows, picker row, and public-surface test were
  written from the skill and its references, with Toggle, ProgressBar, and
  Badge as the worked examples.
- `check-component slider --strict --json` reported zero findings on the
  first run. The gate was reached and exited 0, but the loop had nothing to
  iterate on, so this is evidence that the skill's rules produce a compliant
  component, not that an agent fixes findings when they appear.
- What the checker could not see and the repo's tests caught: the eight
  presets and two catalogue-size pins. `presetThemes.test.ts` requires every
  preset to carry the new component under its own slug in derived key order,
  and two tests pinned the catalogue at 25. Both are first-party costs the
  skill does not mention, because a consumer never pays them.
- What no static check saw: the editor page, token rows, linked block, and
  sketch mode were not opened in a browser.

## The fix skill, and the consumer as its first test

`live-tokens-fix-findings` is the loop for code that already exists: run
both checkers with `--json`, take the largest group of errors first, apply
that rule's recipe, re-run, stop at exit 0. It carries one recipe per rule
id, with colour mapped by role and geometry by scale, and three refusals:
never silence a rule to pass, never mint a token, never shift the look
without saying so. It is wired into `setup-claude`, the README, and the
Skill Atlas.

Following it on `live-tokens-online` took three rounds, which is the point of
re-running after every rule:

1. The five errors and ten warnings cleared by recipe: the floating reset
   control took `--scrim`, `--text-inverted`, `--border-neutral-faint`, and
   the body-sm text style; `site.css` moved from `main.ts` into the three
   pages; the showcase took the same spacing and sub-grid fixes as this repo.
2. `--scrim` did not exist there. The consumer's vendored `tokens.css`
   predates the rename, and the recipe for a missing contract-family name is
   `migrate --check`, which planned the scrim rename and the tint scale.
   Applied.
3. The rename exposed two inline-code chips reading `--overlay-low`. A wash
   on a surface is a tint, not a scrim, so both took `--tint-low`.

Result: clean under `--strict`, svelte-check clean, `vite build` green. Left
uncommitted in that repo. Two things the test could not do: the installed
package there is 0.68.1, so the checkers ran from this tree's `bin/` and no
`check:design` script was added, and the consumer's own Skill Atlas cannot
show the new skill until it installs the release that carries it.

## What the release gate found

CI runs the Playwright render contract before `npm publish`, and it fails on
`origin/main` for six components: each `--<id>-hover-tint` never repaints.
The tint work landed after the last contract fix and was never run against
it. Two causes, one of them a real editor bug:

- In SegmentedControl, TabBar, MenuSelect, and SideNavigation the tint
  switch never rendered: the row was gated on a state named `hover`, and
  those editors name their hover states `hover option`, `hover tab`,
  `hover item`, and `<Part> / Hover`. A user could not turn the tint on in
  four of the six components that offer it.
- The harness had no step that turns a `role="switch"` Toggle on, so even
  Button's reachable switch stayed off. It now treats a switch as a gate
  control, re-exercises rows the gate reveals, and skips a selector whose
  selections are locked rather than retrying a chip it can never click.

The Slider's first contract run also failed: its thumb was a vendor
pseudo-element the probe cannot read. The thumb is a real element now.

## Consumer reality

`live-tokens-online` before the fixes: 39 errors, 50 warnings. After the checker
fixes: 5 errors, 23 warnings, every error genuine. After the fix skill: clean.

- Four literals in `src/App.svelte`: `#fff` and three `rgba()` overlays.
- `site.css` imported from `main.ts`.

After the geometry rule was narrowed to themed properties, the consumer's warnings fell from 23 to 10.

## Open decisions

- **The 22 warnings are resolved and the repo gate is strict.** Twelve were
  spacing or stroke literals with a token behind them and are tokenized,
  `site.css` included, so the scaffold's copy is clean too. The rest were
  layout sizing (a hero height, a max content width, a `minmax()` floor) and
  a local two-up, which the rule no longer reports: `dimension-literal` now
  fires only on the geometry the theme owns (spacing, stroke, radius, shadow),
  and `hardcoded-columns` from four columns up. The kit's ten-track sub-grid
  reads `calc(var(--columns-count) - 2)`. `check:pages` and the repo's own
  page test run under `--strict`, so a new warning here fails.
- **Two shipped editors fail `--strict`.** `MenuSelectEditor` and
  `SegmentedControlEditor` call a type-group font helper bare across four
  slots (`phantom-link`). The skill tells a new component to pass `--strict`
  while two shipped ones would not. Fixing changes derived group keys and
  saved link trees, so it is a migration, not an edit.
- **The template build gate is a product decision.** A scaffolded app's
  `vite build` now fails on a colour literal in page CSS. The consumer lowers a
  rule in `live-tokens.config.json` if that is wrong for them.
- **`unknown-prop` reports `class` on a component that does not declare it.**
  Badge, Callout, and Toggle drop it at runtime, so the finding is true, and
  it will surprise.
- **The evals are authored, not run.** `claude plugin eval --help` answers,
  but a run is refused as early access on this account. The outcome cases
  write into the tree and need `--allow-tools` once the runner opens.

## Verification

| Command | Result |
| --- | --- |
| `npm test` | 4313 tests, 106 files, green |
| `npm run check` | 678 files, 0 errors |
| `npm run check:pages` | strict, 21 files clean |
| `node bin/cli.mjs check-component` | 25 components, 0 errors, 2 warnings |
| `npm run check:smoke-create` | scaffold runs `check:design` from the tarball and builds |
| `check:component-defaults`, `check:preset-themes`, `check:skills`, `check:skill-atlas`, `check:token-contract`, `check:docs-content`, `check:production-is-default` | all OK |
