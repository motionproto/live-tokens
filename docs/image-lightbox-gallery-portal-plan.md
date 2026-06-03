# ImageLightbox galleries + portal — pre-merge remediation plan

Branch: `image-lightbox-gallery-portal` (one commit ahead of `main`).
Source: pre-merge review of `ImageLightbox.svelte`, `internal/portal.ts`, `Dialog.svelte`,
`ImageLightboxEditor.svelte`, `scripts/check-overlay-portal.mjs`.

Status of the suite at review time: `npm run check` 0 errors, `npm test` 2720 pass,
`check:overlay-portal` and `check:component-defaults` both pass. None of the new code
is exercised by a test, so the bugs below are read-found, not test-found.

**Merge gate:** B1 must land before merge. S1 and at least the T1 tests should land
with it. The rest may be same-PR or a fast follow, but tick them here either way.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` won't-do (with reason)

---

## Blockers

### [x] B1 — Separate the thumbnail aspect from the modal's current-image aspect
> Done. Split into `coverNaturalAspect` (thumb, written by `onCoverLoad`) and
> `naturalAspect` (modal). Wrapper uses `coverAspect`; `viewportTarget` uses `aspect`
> (falls back to cover ratio). `naturalAspect` reset on close. Guarded by T1.

One shared `naturalAspect` is written by every `<img>` `onload` (inline thumb *and*
each modal layer), so navigating a gallery rewrites the inline thumbnail's
`aspect-ratio` to the current modal image's ratio. The thumb still shows `items[0]`,
so its box and the surrounding page layout are left wrong after a close from any
non-zero index whenever ratios differ — the default case for a real gallery.

- Files: `ImageLightbox.svelte:105-107` (`aspect`), `:363-369` (`onImgLoad`), `:481`
  (wrapper `aspect-ratio`), `:492` (thumb always renders `cover`).
- Fix: maintain two measured aspects. `coverAspect` (written only by the inline
  thumb's `onload`, drives the wrapper `aspect-ratio`) and a current-image aspect
  (drives `viewportTarget`). Prefer per-item `width`/`height` when supplied, fall
  back to the measured value for that specific image.
- Acceptance: in a 2-image gallery with differing ratios, open → next → close leaves
  the inline thumbnail and page layout identical to before opening (no CLS, correct
  box). Covered by T1.

---

## Should-fix

### [x] S1 — Slide direction is inverted vs. the chevron pressed
> Done. `exit = -NAV_SHIFT_PX * dir` so next exits left / enters from right.
> Comment updated. Guarded by T1.

`next()` → `dir=+1` → outgoing exits right, incoming enters from the left, so pressing
the right/next chevron slides content rightward (reads as "back"). Convention: next →
new image enters from the right, old leaves left.

- Files: `ImageLightbox.svelte:318-358` (`goTo`, esp. `:335`), `:360-361` (`next`/`prev`).
- Fix: flip the sign — `exit = -NAV_SHIFT_PX * dir` (or invert `dir` in `next`/`prev`).
  Update the `:318-319` direction comment to match.
- Acceptance: T1 direction assertion + manual eyeball.

### [x] S2 — Pre-load collapse / lost CLS guard; demo no longer exercises explicit dims
With no `width`/`height` and no measured aspect yet, the wrapper has no `aspect-ratio`
and collapses to 0 height, so the absolutely-positioned thumb is invisible/unclickable
until load, then reflows. The demo passes neither dimension, so the "explicit
dimensions, no reflow" path is no longer demoed.

- Files: `ImageLightbox.svelte:478-494`, `:631-642`; `ImageLightboxEditor.svelte:61`.
- Fix: give the wrapper a sensible fallback box while `aspect` is unknown (e.g. a
  default aspect or min-height), and restore `width`/`height` on at least one demo
  image so the no-reflow path stays visible. Consider `loading`/intrinsic size on the
  thumb `<img>`.
- Acceptance: thumb is visible and clickable before the image loads; no full-height
  jump on load for an image with explicit dimensions.

### [x] S3 — `portal` action never moves a node back; reactive `inline` toggle is latent-broken
`moved` only goes `false → true`; `update(false)` is a no-op, so toggling Dialog
`inline: false → true` at runtime strands the backdrop in `<body>`. The file comment
claims disabled "leaves the node where Svelte put it", true only at init.

- Files: `internal/portal.ts:10-28`; consumer `Dialog.svelte:111`.
- Fix (pick one): (a) handle `on === false && moved` by returning the node to its
  original anchor (capture an anchor comment before the first move), or (b) document
  `enabled`/`inline` as init-only and correct the comment.
- Acceptance: a Dialog whose `inline` flips true→false→true ends in flow, correctly
  styled. Covered by T2.

### [x] S4 — Modal a11y gaps vs. a standard dialog
Overlay/stage are `role="presentation"`; no `role="dialog"`/`aria-modal`, no accessible
name, focus never enters the modal or returns to the thumb, no focus trap (modal is at
end of `<body>`, so Tab leaks into the background page), counter is `aria-hidden`.

- Files: `ImageLightbox.svelte:496-526` (overlay/stage), `:446-458` (keydown), `:569`
  (counter); compare `Dialog.svelte:77-89` (focuses primary button).
- Fix: on open, move focus to the close button (or stage); on close, restore focus to
  the thumb; add `role="dialog"` + `aria-modal="true"` + an accessible label to the
  modal; expose position to SR (drop `aria-hidden` on the counter or mirror it in an
  `sr-only`/`aria-live` label). Global Esc/arrow handling already works regardless of
  focus — keep it.
- Acceptance: open → focus is inside the modal; Esc/close returns focus to the thumb;
  axe/manual SR check reports the modal as a labelled dialog with a position readout.

---

## Nits

### [x] N1 — Remove dead `wrapperEl`
No longer read after `closeLightbox` switched to `thumbEl`.
- Files: `ImageLightbox.svelte:70`, `:479`. Drop the `let` and the `bind:this`.

### [-] N2 — Tokenize new chrome sizes (low priority)
New `.image-lightbox-nav` `2.75rem` and counter literals join pre-existing hardcoded
sizes. Not a regression; align with the "tokenize design values" leaning if cheap.
- Files: `ImageLightbox.svelte:762-763`, `:782-798`.

### [x] N3 — Drop dead `stopPropagation` on nav clicks
Nav buttons are siblings of overlay/stage (under the `display:contents` wrapper), so
clicks never bubble to either close handler.
- Files: `ImageLightbox.svelte:551`, `:563`.

### [x] N4 — Empty-alt aria-label
`aria-label="Expand image: ${cover?.alt}"` reads "Expand image: " when alt is empty.
- Files: `ImageLightbox.svelte:489`. Fall back to a generic label when alt is blank.

---

## Approach / guardrail / docs

### [x] A1 — Document `check-overlay-portal` as a file-level tripwire, not a proof
It's coarse: misses `position: fixed` set via JS/inline style or in a child component
and `position : fixed` (space before colon); passes if `use:portal` appears *anywhere*
in the file (comment, unrelated element, or only one of several fixed layers). Runs only
in `prepublishOnly`, not `npm run check`.
- Files: `scripts/check-overlay-portal.mjs` header.
- Fix: add a header note stating it's file-level not element-level so reviewers don't
  over-trust it. Optional: also wire it into `npm run check` so dev sees failures early.

### [x] A2 — CHANGELOG: add the consumer-visible portal surprises
Entry is accurate but omits: DOM events from the backdrop no longer bubble to a
consumer's wrapper; a subtree-scoped CSS-variable theme no longer reaches an overlay
portaled to `<body>` (this project themes via `documentElement`, so fine in practice);
SSR `show=true` renders in-flow on the server and relocates on hydration; `inline` is
init-only (until S3 lands).
- Files: `CHANGELOG.md` (Unreleased).

### [x] A3 — SKILL.md portal note: add the scoped-theme / event-bubbling caveat
The new "Fixed overlays must portal" rule is good; add one line on the two side-effects
so future component authors expect them.
- Files: `.claude/skills/live-tokens-create-component/SKILL.md` (the new bullet).

---

## Tests (none exist for any of this today)

### [x] T1 — Gallery component tests
`src/system/components/__tests__/imageLightboxGallery.test.ts` (happy-dom + a
WAAPI shim, since happy-dom has no `element.animate`). All four points covered;
verified each B1/S1 assertion fails against the unfixed code before landing.
- [x] index/counter advance on next/prev and wrap at the ends.
- [x] close resets `index` to 0.
- [x] **thumbnail aspect is independent of modal index** (guards B1).
- [x] slide direction matches the chevron (guards S1).
- [x] single-image array renders no gallery chrome.

### [x] T2 — Portal action tests
- `enabled=true` appends to `<body>`; `destroy()` removes it.
- `enabled` toggled true→false→true returns the node to flow (guards S3).
- `enabled=false` at init leaves the node in place.

---

## Confirmed-good (no action — recorded so we don't re-litigate)

- `--imagelightbox-tile-object-fit` correctly excluded from `allTokens` / `default.json`;
  `check:component-defaults` reports 0 drift.
- Portal-in-component is the right fix over editing EditorShell `isolation: isolate`
  (consumer pages have arbitrarily many trapping ancestors); it also improves
  `backdrop-filter`.
- Tooltip exemption is correct — it is `position: absolute`, anchored to its trigger.
- Dialog's variant-var reading uses `document.documentElement`, unaffected by portaling.
- Two fixed-overlay components sharing one ~20-line action is not premature abstraction.
