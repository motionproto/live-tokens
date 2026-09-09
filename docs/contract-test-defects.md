# Defects the contract tests exposed

Building the shipped component validation suite
([plan](plans/shipped-component-tests.md)) surfaced faults nothing else was
watching for. Each entry below was measured against running code during a wave
review, not inferred from reading. None is fixed. The plan deliberately kept
its waves to their stated scope and recorded these instead.

Severity is about consequence to a user of the package, so a test-side defect
that hides a real failure ranks above a product defect a user can see and work
around.

## P2. Test infrastructure that can hide a failure

### `contract-preview` conflates two obligations

States and interaction share one rule id, so a component with no interactive
role reads `passed` whenever its states obligation passes, and the inapplicable
reason is dropped by `COVERAGE_PRIORITY` in `bin/contractRunner.mjs`.

## P3. Product defects a user can see

### The sticky preview band can still cover a control at 1280x720

`.tabs-preview` now caps its sticky band at `max-height: 50vh` with a
`.preview-stage` scroll wrapper, which fixed the worst of it: image, panel,
card and sidenavigation each pass the contract suite alone at 1280x720, where
before the controls were unreachable at every scroll position.

A full parallel run at that viewport still fails panel's gradient `Solid`
radio with "Clicking the checkbox did not change its state", so the band can
sit over a control at some scroll positions. The `contract` Playwright project
therefore still runs at 1280x900.

**Fix:** find the remaining overlap, then revert the project viewport to the
default. The suite passing at 1280x720 is the proof.

**Found by:** Wave 1, and re-measured when the cap landed.

### Sketch rows cannot be tested for a portalled part

`inlineeditactions` and `imagelightbox` now have `PART_SPECS` rows and their
contracts assert real Sketch paint. `radiobutton` is still undrawn: its dot
lives on `::after`, the same pseudo-element the layer strokes, and the host rule
forces `border-color: transparent` on every drawn part, so the fill has to move
onto a real element in `RadioButton.svelte` first.

Separately, `.image-lightbox-modal` carries `use:portal`, which moves it to
`document.body`. The component editor's preview sets `data-sketch` on its own
local `.sketch-scope` wrapper rather than the document root, so
`[data-sketch] .image-lightbox-overlay` never matches inside that sandbox. The
rows are correct and draw on a real host page, where Sketch mode scopes an
ancestor of `document.body`. Only the overlay and chrome parts are untestable
through the contract suite, so `imagelightbox`'s contract asserts the thumb
alone.

**Fix:** scope `data-sketch` so a portalled node is inside it, in
`VariantGroup.svelte` or `portal.ts`, then add the overlay and chrome parts to
the contract.

**Found by:** adding the Sketch rows.

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
