# Defects the contract tests exposed

Building the shipped component validation suite
([plan](plans/shipped-component-tests.md)) surfaced faults nothing else was
watching for. Each entry below was measured against running code during a wave
review, not inferred from reading.

Fourteen of the seventeen recorded here are fixed, including the theme
re-migration that rewrote a theme's own values on every load, six test-side
defects that could hide a failure, and every product defect a user could see
save the pill overlap below. The three below stayed open because each needs a
change the fixing wave could not reach.

## Open

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

### The overlay's collapsed pill covers the pinned variant strip at 1280 wide

`LiveTokensRouter` mounts `LiveEditorOverlay` on every route, the components
editor included. Its collapsed pill sits at `position: fixed; top: 12px;
right: 12px`, 252 by 44, at `z-index: 2000`. `.tabs-preview` pins the preview
header with its `.variant-tabs` strip at `top: 0`, `z-index: 2`. Once the
band is pinned, any tab under the pill's footprint is unreachable: a click
there opens the overlay. CornerBadge's ten variant tabs reached that
footprint at 1280 wide when `Brand` replaced `Primary` and the strip fit on
one line; its last three tabs sit under the pill.

`selectTab` in `src/testing/component-render.contract.ts` dispatches `click`
on the tab itself. The forced click it replaced landed at the tab's centre
and hit the pill, which left the components route. The tab handlers are
`onclick`, so the dispatched event reaches them, and `force: true` had
already skipped actionability, so the suite proves the same paint. A user at
that width still meets the overlap.

**Fix:** keep the pinned strip clear of the pill's footprint, then restore
`click({ force: true })` in `selectTab`. `check-component cornerbadge
--tests` passing with the forced click is the proof.

**Found by:** Wave 12 of the component terminology plan, when the strip
first fit one line.

### A portalled part cannot be tested for Sketch paint

`.image-lightbox-modal` carries `use:portal`, which moves it to
`document.body`. The component editor's preview sets `data-sketch` on its own
local `.sketch-scope` wrapper rather than the document root, so
`[data-sketch] .image-lightbox-overlay` never matches inside that sandbox. The
rows are correct and draw on a real host page, where Sketch mode scopes an
ancestor of `document.body`. So `imagelightbox`'s contract asserts the thumb
alone, and its overlay and chrome parts stay unasserted.

**Fix:** scope `data-sketch` so a portalled node falls inside it, in
`VariantGroup.svelte` or `portal.ts`, then add the overlay and chrome parts to
the contract.

**Found by:** adding the Sketch rows.

## Cosmetic, unfixed

- `runContractTests` mutates `process.env` instead of building a child env.
  Nothing reads the stale value today.
- `context.suiteFile` comes back as a dangling relative path. It stays in
  diagnostic context and never reaches a finding's `file` or `line`.
