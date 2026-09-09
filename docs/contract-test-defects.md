# Defects the contract tests exposed

Building the shipped component validation suite
([plan](plans/shipped-component-tests.md)) surfaced faults nothing else was
watching for. Each entry below was measured against running code during a wave
review, not inferred from reading. None is fixed. The plan deliberately kept
its waves to their stated scope and recorded these instead.

Severity is about consequence to a user of the package, so a test-side defect
that hides a real failure ranks above a product defect a user can see and work
around.

## P1. Data corruption

### Theme-embedded component configs re-migrate from version 0

Every theme preview and every theme apply re-runs all 27 component migrations
over already-current data.

`src/editor/core/preview/themePreview.ts:52` and `:56` pass
`config.schemaVersion`, a per-config field that no longer exists by then:
`vite-plugin/themes/normalizeTheme.ts:179` destructures it away
(`const { schemaVersion: _entryStamp, … } = config`) on every read.
`ComponentConfig.schemaVersion` is optional, so the read typechecks, yields
`undefined`, and `toComponentSlice`'s `schemaVersion: number = 0` parameter
default (`src/editor/core/store/editorStore.ts:270`) turns it into a full
replay. `editorStore.ts:338` repeats the same defaulting as `?? 0`.

The design intent is explicit and the code contradicts it.
`src/editor/core/themes/themeTypes.ts:281-285` documents
`componentSchemaVersion` as the theme-level stamp, "one field for all of them",
and states that an embedded config's own `schemaVersion` "is ignored and
stripped". So the correct stamp is on the theme and the readers reach for the
one that was deliberately removed.

Measured:

```
migrateComponentConfig('tabbar', halloween…aliases, undefined, 27)
  → '--tabbar-default-indicator-width': '--border-width-4'   // the theme's own value
migrateComponentConfig('tabbar', …, 0)
  → '--tabbar-default-indicator-width': '--border-width-2'   // clobbered
```

Today the visible cost is four tabbar tokens in every theme, because the pair
`2026-05-29-tabbar-indicator-thickness-to-per-state-width` and
`2026-09-07-stroke-role-renames` is not idempotent: the first re-adds the token
at its `--border-width-2` fallback and the second renames it over the theme's
value. The exposure is the defect class. Any future non-idempotent migration
silently rewrites every theme on load.

**Fix:** pass `theme.componentSchemaVersion` and
`defaults.componentSchemaVersion` at both call sites.

**Found by:** the Wave 2b theme-projection obligation, chasing why halloween's
declared indicator width never reached the root.

## P2. Test infrastructure that can hide a failure

### `assertNoSketchPaint` misreads icon fonts and ignores `pseudo`

`src/testing/support/contractHarness.ts:795-810` treats any `::before`
`content` other than `'none'` as drawn, so a Font Awesome `<i>` always reads as
drawn whatever Sketch mode is doing. It also evaluates `::before` on the host
element even for a part declared with `pseudo: 'after'`.

This is a false-pass condition inside a shipped assertion. It surfaced only
because InlineEditActions happens to use icon glyphs. Fix it before more
sketch-inapplicable contracts land.

### `contract-preview` conflates two obligations

States and interaction share one rule id, so a component with no interactive
role reads `passed` whenever its states obligation passes, and the inapplicable
reason is dropped by `COVERAGE_PRIORITY` in `bin/contractRunner.mjs`.

### A `flaky` test reads as a clean pass

No signal reaches findings or coverage, while CI sets `retries: 2`
(`src/testing/playwright.ts`). A test that fails then passes is indistinguishable
from one that always passed.

### The Vitest side handles only an all-failed collection

`bin/contractRunner.mjs:675` guards on
`collectionFailures.length === files.length`. With two files, one passing and
one failing at module load, the failure is dropped and reconciliation stays
quiet. Unreachable through `check-component --tests` today, because the
generated config leaves `include` unset and matches exactly one file.

**Fix:** emit one `tests-incomplete` per failed file, and set `explained` only
when every file failed.

### The runner's settings scrape reads comments

`bin/contractRunner.mjs:152-160` scrapes `dataDir:` and `viteConfig:` out of
the settings file's source text. Measured across eleven shapes: a commented
`dataDir:` line wins over a real value below it, and a comment alone invents a
setting. A template literal, a computed value, or an imported value is silently
ignored.

A wrong `viteConfig` guess fails loudly, because the generated config statically
imports it. A wrong `dataDir` guess is loud only when the guessed tree is
absent. When the fallback tree exists, the run validates a tree the project
never named.

**Fix:** strip `//` and `/* */` before scraping, and emit `tests-setup` when
the key appears with no string literal.

### A test stages a fixture theme inside the tracked data tree

`vite-plugin/themeFileApi.fallback.test.ts:279` writes
`src/live-tokens/data/themes/package-fixture-theme.json`.
`src/editor/core/themes/themeComponentRoundTrip.test.ts:41-47` filters it out
with a comment naming the concurrency.

That patches the reader for a writer-side defect, so the exposure stays open
for the next reader anyone adds, and a run killed mid-suite leaves an untracked
JSON inside the shipped themes directory where `check:preset-themes` and the
packaging checks look. Predates this work.

**Fix:** point the fallback suite's package data directory at a temp copy.

### The repo's `--tests` prefers the compiled copy

`check-component --tests` resolves `src/testing-js/` whenever it exists, so an
edit to `src/testing/*` without `npm run build:testing` silently tests the old
code.

## P3. Product defects a user can see

### The sticky preview band covers the property controls

`src/editor/component-editor/scaffolding/VariantGroup.svelte` gives
`.tabs-preview` `position: sticky` with no `max-height`. Measured band heights
at a 1280x720 viewport: SideNavigation 697px, Image 631px, Card 621px,
ImageLightbox 580px, CornerBadge 559px, Notification 542px, Table 515px, Input
497px, Button 360px. At 720px the controls below are unreachable at every
scroll position for the tallest of these.

This is a usability defect for any 13-inch laptop. Wave 1 raised the contract
project's viewport to 1280x900 to clear it, a number tuned to today's tallest
preview.

**Fix:** a `max-height` with `overflow: auto` on `.tabs-preview`, or a scroll
container for the property panel. Repair the CSS rather than raising the
viewport again.

### Card's hover gate is invisible in the editor

`src/system/components/Card.svelte:154-155` is the only rule reading
`--card-hover-border-enabled` and `--card-hover-shadow-enabled`. `:159-161`
paints `.card.force-hover` from the unconditional tokens by design. So the
editor's hover preview shows the on state while the global "Use hover" gate is
off.

Related: those two gate tokens had no test coverage anywhere until Wave 2b
pinned them through a real pointer hover.

### Sketch mode cannot draw any component outside `PART_SPECS`

`src/editor/core/sketch/sketchLayer.ts:110` `PART_SPECS` is a fixed list of
hardcoded selectors, resolved at module scope into `PART_SELECTORS`,
`FLOW_PARTS`, and `STROKE_PARTS`. A runtime-registered component can never
appear in it.

So **no consumer-authored component is ever drawn in Sketch mode**, and every
consumer component's `contract-sketch` is permanently `inapplicable`. Three
shipped components sit in the same gap: `imagelightbox`, `radiobutton`, and
`inlineeditactions`.

Coverage still completes, because inapplicable is not disabled and does not
block exit 0, and the contracts' stated reasons are accurate. The product gap
is what matters: this is the first thing a consumer hits after shipping a
component of their own, and `live-tokens-create-component`'s manual
verification line about Sketch mode is unsatisfiable for them.

**Found by:** the Wave 5a consumer gate, on a custom component authored in a
fixture project.

### `check-component <shipped-id>` reports two spurious findings in a consumer

`resolveComponentPaths` (`bin/check-component.mjs:121-132`) looks only under
`<root>/src/system/components` and `EDITOR_DIRS`, with no package fallback.
`checkComponent` (`:363-372`) then records two `missing-file` findings and
returns before any other rule runs.

In a consumer, `npx live-tokens check-component toggle --tests` exits 1 with
two spurious findings while all eight contract rules pass. Reproduced in the
Wave 5a gate and again by its reviewer.

Second consequence: `artifactForContractRule` uses the same resolver, so any
`contract-render`, `contract-preview`, `contract-sketch`, or `contract-listed`
failure on a shipped id in a consumer names a file that does not exist there.

Not a release blocker, because no shipped skill or template script tells a
consumer to name a shipped id: `template/package.json:11` and
`live-tokens-fix-findings/SKILL.md:18` both use the batch form, which discovers
only the consumer's own components.

**Fix:** fall back to `PKG_ROOT` when the id is in `builtInIds` and the
consumer path is absent. `check-component.mjs:26` already imports both.
Invariant 3 does not block this: it pins output for the 26 shipped components
and the `check-component.test.ts` fixtures, those files exist in this repo so
the fallback never fires here, and no fixture asserts `missing-file` (they use
`'widget'`).

**Found by:** the Wave 5a consumer gate.

### CollapsibleSection's header carries no interactive role

`src/system/components/CollapsibleSection.svelte:71-72` is a `<div onclick>`
behind three `svelte-ignore a11y_*` directives. The component is functionally
interactive, so its contract marks interaction inapplicable for a reason that
is itself the defect.

## Design follow-up

### The rule-to-fix mapping is duplicated in two skills

`live-tokens-create-component/SKILL.md` and `live-tokens-fix-findings/SKILL.md`
each carry a table mapping every rule id to the section that fixes it, and both
now list the same six `contract-*` rules. Adding or renaming a rule means
hand-editing two documents, nothing enforces that the tables agree with each
other, and nothing checks either against the rule ids `bin/contractRunner.mjs`
actually emits.

A finding already carries `rule`, `file`, `line`, and a message. Emitting a
stable fix-key alongside it, from one registry in the runner, would let each
skill map that key once instead of enumerating every rule. One source, no
drift, and no skill edit when a rule changes.

The counter-argument is that the mapping's target is a section heading inside a
particular skill document, so part of it is navigation rather than test
metadata. That argues for a stable key each skill resolves once, rather than
for two hand-maintained tables.

**Raised by:** the user, reviewing Wave 5b's skill edits. A skill should know
what to call and nothing about how the testing works.

### `check:skills` cannot tell a filename from a skill name

`scripts/lib/skillChecks.mjs`'s sibling-skill-reference rule matches
`\b(live-tokens-[a-z-]+)\b`, so the legitimate filename
`src/live-tokens-components.ts` reads as a reference to a skill named
`live-tokens-components`. Wave 5b worked around it by renaming the documented
example file to `src/registerComponents.ts`.

Two consequences. The package's own name prefix is unusable in any documented
filename, and the acceptance gate now writes `src/live-tokens-components.ts`
in its fixture (`scripts/lib/componentGate.mjs:92,100,111,413`) while the docs
say `src/registerComponents.ts`. Both are internally consistent, so nothing
fails, but the gate proves an equivalent setup rather than the documented one.

**Fix:** exclude matches carrying a path separator or a file extension, then
realign the gate fixture with the documented filename.

**Found by:** Wave 5b, hitting the collision while adding `--tests` to the
skills.

## P4. Cosmetic

- `runContractTests` mutates `process.env` instead of building a child env.
  Nothing reads the stale value today.
- `context.suiteFile` comes back as a dangling relative path. It stays in
  diagnostic context and never reaches a finding's `file` or `line`.
