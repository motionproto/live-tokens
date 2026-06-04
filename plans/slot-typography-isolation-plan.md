# Slot typography isolation — implementation roadmap

**Status:** active roadmap
**Scope:** how components that render slotted prose (`Card`, `CollapsibleSection`, `SectionKit`, and every future one) defend their body typography against the consumer's global page styles.
**TL;DR:** Each slotted component re-pins its body typography with a hand-tuned selector. The defense is duplicated and already drifting across three copies. Root cause: there is no cascade boundary between global page prose and light-DOM component slots. Fix in two phases. Phase 1 (ship now) centralizes the per-axis pin into one mixin, closes the drift, and makes the ownership policy explicit. Phase 2 (gated) adds an explicit cascade-layer order so the pin wins structurally instead of by specificity, hardening the policy against high-specificity consumer rules without changing it.

---

## How to use this roadmap

This document is the work tracker. Tasks are sized so a fresh agent or a later session can pick up any one with no extra context. Each task carries its own status, files, dependencies, and acceptance criteria.

**Status protocol.** Update a task's status line in place. Do not reorder or move tasks (the organizing axis is phase, then dependency order). When you finish a task, change its status and add a one-line `Done:` note with the date and what shipped.

Status legend:
- `[ ] not started`
- `[~] in progress`
- `[x] done`
- `[!] blocked` (name the blocker)
- `[-] deferred / gated` (name the trigger that activates it)

**Parallelism.** Phase 1 tasks can run concurrently except where a dependency is named. Phase 2 depends on Phase 1 being complete. Within Phase 1, P1-T2 (component conversions) depends on P1-T1 (the mixin) existing.

---

## Status dashboard

**Phase 1 — centralize (ship now, zero consumer impact)** — ✅ complete (2026-06-03)
- `[x]` P1-T1 — Add the `slot-prose` mixin (one definition of the defense)
- `[x]` P1-T2 — Convert `Card`, `CollapsibleSection`, `SectionKit`; delete the three copies
- `[x]` P1-T3 — Update `CONVENTIONS.md` (it still documents the old sledgehammer)
- `[x]` P1-T4 — Add the `check:slot-prose` guardrail against future drift
- `[x]` P1-T5 — Tests + `svelte-check` green; verify on a real page

**Phase 2 — cascade-layer boundary (gated, see trigger)**
- `[-]` P2-T1 — Declare `@layer baseline, prose;` in `tokens.css`
- `[-]` P2-T2 — Demote only the `:where(*)` baseline into `@layer baseline`
- `[-]` P2-T3 — Ship `site.css` wrapped in `@layer prose { ... }` (demo + starter)
- `[-]` P2-T4 — Migration entry + activate the guardrail's layer check
- `[-]` P2-T5 — Verify high-specificity isolation on a real page

**Phase 2 activation trigger:** a real consumer reports a high-specificity page rule (for example `#hero p`, an id or multi-class selector) leaking into a component slot, OR a deliberate decision to harden proactively. Until then Phase 1 fully fixes the observed bug (a bare `p` rule painting card body text serif). See "Why Phase 2 is gated" below.

---

## 1. The problem

A consumer styles their page prose with bare element selectors in `site.css`:

```css
/* src/app/site.css — verified: only bare element selectors, max specificity 0,0,2 */
p      { font-family: var(--font-serif); … }   /* 0,0,1 */
ul li  { font-family: var(--font-serif); … }   /* 0,0,2 */
ol li  { font-family: var(--font-sans);  … }   /* 0,0,2 */
```

This is intentional and documented: `site.css` is the consumer-facing starter that themes raw page copy, so you can write `<p>` and get themed text with no classes (`feedback_site_css_is_user_owned`).

Components render the consumer's raw HTML as slot content in the *same* DOM tree. A `Card` body containing a `<p>` therefore inherits the consumer's serif rule instead of the card's `--card-default-body-font-family` alias. The original bug: a card whose body alias was Manrope rendered serif.

The current defense, repeated in every slotted component, out-specifies the global rule:

```scss
.card-body.prose :global(p), …ul, …ol, …li { font-family: inherit; … }
```

## 2. Root cause

**There is no cascade boundary between globally-styled page prose and light-DOM component slots.** `site.css` styles by *element type* across the whole document; components slot the consumer's raw `<p>`/`<ul>` into that same tree; nothing separates "page copy" from "component internals." Two individually-good decisions collide:

- zero-class themed prose (write `<p>`, get themed copy), great for authoring,
- light-DOM components that slot raw HTML, great for theming (CSS-var tokens pierce, no shadow-DOM tax).

Specificity is the weapon both sides grab to fight over the same `<p>`, not the cause.

### Why Svelte 5 scoping does not solve this on its own

Svelte scopes a component's `<style>` by adding a hashed class to the elements the component renders, which raises each scoped selector's specificity by 0-1-0 (confirmed in the Svelte 5 "Scoped styles" docs). That is why a component's own `p` beats a global `p` automatically.

But **slotted content does not receive the component's scope class.** The consumer's `<p>`, passed through `children` and rendered with `{@render children()}`, belongs to the *caller's* scope, not the component's. So it gets none of the component's 0-1-0 protection. This is by design and there is no Svelte-level switch to change it. The consequence: a component auto-protects the elements it renders, and must *explicitly* pin the elements it slots. The fix is necessarily at the CSS-platform layer, not the Svelte layer. (Svelte 5 still helps with authoring; see "Svelte 5 notes.")

### The project already states the intended convention

`tokens.css:5` sets the global font baseline at zero specificity on purpose:

```css
/* Module font fallback. :where() = 0 specificity so components override. */
:where(*:not([class*="fa-"])) { font-family: var(--font-sans); }
```

The stated rule is: global baselines should be zero-specificity so components win without a fight. `site.css` lifts page typography above that baseline by using non-`:where()` element selectors.

### But lowering `site.css`'s specificity would not fix it

Even if `site.css` used `:where(p)` (0,0,0), a rule that **directly matches** `<p>` still beats a component's **inherited** typography. Inheritance only applies when nothing targets the element directly. So the component would still have to pin the `<p>` directly. Lowering `site.css`'s specificity just lowers the bar, it does not remove it. **Specificity is the symptom; the missing cascade boundary is the cause.**

### A correction on specificity figures

The shipped pin is `.card-body.prose :global(p)`, which is two classes plus the Svelte scope class plus an element (about 0,3,1 after scoping), not the 0,1,1 an earlier draft quoted. The exact number does not change any conclusion, but the pin already carries plenty of class-level specificity. It loses only to id-bearing or multi-class consumer selectors, which is the narrow case Phase 2 targets.

## 3. The ownership policy (made explicit)

The pin covers **p, ul, ol, li** and pins only the **type axes the component owns**: font-family, font-size, font-weight, line-height, color, plus the component's own spacing rhythm. This is a deliberate, surgical policy, not an accident of partial coverage:

- **Pinned:** paragraph and list typography and spacing. The component owns the look of body copy.
- **Left to inherit page styling, on purpose:** `<a>` (links should keep the consumer's link treatment so links look like links inside a card), `<strong>` (inline emphasis follows the page), and font-style, letter-spacing, text-transform (a consumer's italics or tracking survive).
- **Escape hatch:** `prose={false}` drops the pin entirely so the consumer fully owns the slot's content styling.

Naming this policy is the point. The earlier "the pin only covers some elements" reading was a half-finished defense; in fact leaving links and emphasis to the page is correct. Any change to this policy (for example, making components own links too) is a product decision, recorded in "Considered and rejected" below, not a silent default.

## 4. Evidence this is systemic, not a one-off

The same defense is hand-copied in three places that have already diverged (verified):

- `src/system/components/Card.svelte:178` — per-axis `inherit` + a `prose` opt-out (the reference).
- `src/system/components/CollapsibleSection.svelte:293` — the old `font: inherit; color: inherit` sledgehammer over p/ul/ol/li.
- `src/demo/sections/SectionKit.svelte:221` — the old sledgehammer, and it covers **`p` only** (no ul/ol/li at all).

Every new slotted component is one forgotten pin away from reintroducing the serif bug. The sledgehammer (`font: inherit`) also pins font-style, letter-spacing, text-transform, and font-variant, axes the component never meant to own (it kills a consumer's italics).

## 5. Goals / non-goals

**Goals**
- One place defines slot-prose defense; new components inherit it for free.
- The ownership policy (Section 3) is explicit and consistent across all slotted components.
- Phase 2 makes the defense robust against high-specificity consumer rules in the page-prose layer, without changing the policy.
- `prose={false}` lets a consumer fully own a slot's content styling.

**Non-goals**
- Rewriting `site.css`'s rules. It is user-owned starter (`feedback_site_css_is_user_owned`). Phase 2 wraps its rules in a layer block (structure, not content); the bare selectors the user authors stay byte-identical.
- Shadow-DOM encapsulation. It would delete the per-component pin, but its costs (SSR, the editor overlay, forms, tooling) are not worth it here. Svelte 5 custom-element compilation does not change that calculus.

---

## Phase 1 — centralize the pin (ship now)

Zero consumer impact (internal component CSS only). Fixes the observed bug everywhere, kills the drift, and records the policy.

### P1-T1 — Add the `slot-prose` mixin

**Status:** `[ ] not started`
**Files:** new `src/system/styles/_slot-prose.scss`
**Depends on:** nothing
**Blocks:** P1-T2, P1-T4

One definition of the defense, next to the existing `_padding.scss` helper. Uses the proven `:global(...)` form nested under `&.prose` (safe through the scss → Svelte pipeline):

```scss
// Pin a slot container's OWNED type axes onto slotted flowing content, so a
// consumer's global element rules (site.css `p`, `ul li`, …) can't override the
// container's body aliases. Only p/ul/ol/li and only the type axes the
// component owns are pinned; `a`, `strong`, font-style, letter-spacing and
// text-transform stay free (see roadmap Section 3). `&.prose` gates it so
// `prose={false}` drops the pin and the consumer fully owns the content.
@mixin slot-prose {
  &.prose {
    :global(p), :global(ul), :global(ol), :global(li) {
      font-family: inherit;
      font-size: inherit;
      font-weight: inherit;
      line-height: inherit;
      color: inherit;
    }
    :global(p)            { margin: 0 0 var(--space-12); }
    :global(p:last-child) { margin-bottom: 0; }
    :global(ul), :global(ol) { margin: var(--space-12) 0; padding-left: var(--space-24); }
    :global(li)           { margin-bottom: var(--space-4); }
  }
}
```

**Acceptance:**
- [ ] Mixin compiles when `@include`d in a `<style lang="scss">` block.
- [ ] A consuming component shows the per-axis behavior (slotted `<p>` takes the container font; a slotted `<em>`/italic survives).
- [ ] Optional cleanliness follow-up (only if verified through the scss → Svelte pipeline): collapse the repeated `:global(...)` into a single Svelte 5 `:global { p, ul, ol, li { … } }` block. Keep the `:global(...)` form if the block does not survive scss flattening cleanly.

### P1-T2 — Convert the three components

**Status:** `[ ] not started`
**Files:** `src/system/components/Card.svelte`, `src/system/components/CollapsibleSection.svelte`, `src/demo/sections/SectionKit.svelte`
**Depends on:** P1-T1
**Blocks:** P1-T5

Standard recipe per component: a `prose = true` prop, a `class:prose` gate on the slot container, and `@include slot-prose` in the container's rule. The container keeps owning its baseline axes (font-family, size, color, padding) as it does today.

```svelte
<script lang="ts">
  let { prose = true, /* … */ } = $props();
</script>

<div class="card-body" class:prose>
  {@render children?.()}
</div>

<style lang="scss">
  @use '../styles/slot-prose' as *;
  .card-body { /* owns the baseline axes */ @include slot-prose; }
</style>
```

**Acceptance:**
- [ ] `Card` keeps its existing `prose` prop and behavior; the inline pin block (`Card.svelte:178-205`) is replaced by `@include slot-prose`.
- [ ] `CollapsibleSection` gains a `prose` prop; the `font: inherit` sledgehammer (`:293`) is deleted in favor of the mixin. Italics in collapsible content now survive.
- [ ] `SectionKit` gains a `prose` prop and now covers ul/ol/li (it covered `p` only); sledgehammer (`:221`) deleted.
- [ ] All three import the mixin via `@use`, not a hand-rolled pin.
- [ ] Grep confirms zero remaining `font: inherit` slot pins in `src/`.

### P1-T3 — Update CONVENTIONS.md

**Status:** `[ ] not started`
**Files:** `src/system/styles/CONVENTIONS.md`
**Depends on:** nothing (can run in parallel)

The `site.css` row currently codifies the old defense verbatim: "defend their typography aliases … via `:global(p) { font: inherit; color: inherit; }`." That is now wrong. Replace it with a pointer to `@include slot-prose` and a one-line statement of the ownership policy (pins p/ul/ol/li type axes; links and emphasis inherit the page; `prose={false}` opts out).

**Acceptance:**
- [ ] No reference to `font: inherit` as the slot defense remains in the doc.
- [ ] The mixin and the policy are documented in the `site.css` row.

### P1-T4 — Add the `check:slot-prose` guardrail

**Status:** `[ ] not started`
**Files:** new `scripts/check-slot-prose.mjs`; wire into `package.json` `prepublishOnly`
**Depends on:** P1-T1 (mixin name finalized)
**Blocks:** nothing

Sibling to `scripts/check-no-style-imports.mjs` (same regex-over-`.svelte` approach). Fail the build if a published `.svelte` `<style>` block hand-rolls a slot type pin (a `:global(p|ul|ol|li)` rule whose body contains `font` or `inherit`) without `@use`-ing the `slot-prose` mixin. This is what prevents the drift from coming back, and is why a wrapper component is not needed to make the defense hard to forget.

**Acceptance:**
- [ ] Script exits non-zero on a planted hand-rolled pin; exits zero on the converted tree.
- [ ] Added to the `prepublishOnly` check chain.

### P1-T5 — Tests, type check, real-page verification

**Status:** `[ ] not started`
**Files:** component tests under `src/system/components/__tests__`
**Depends on:** P1-T2

**Acceptance:**
- [ ] `svelte-check` clean.
- [ ] A test (or extended existing one) asserts that slotted `p/ul/ol/li` take the container's font-family in `prose` mode, and that `prose={false}` lets a global rule through.
- [ ] Manual: a card on the Home page with a serif global `p` rule renders the card body in the card alias; a card with `prose={false}` renders serif.

---

## Phase 2 — cascade-layer boundary (gated)

**Status of the phase:** `[-] deferred / gated` (see trigger in the dashboard).

**Why Phase 2 is gated.** The real `site.css` uses only bare element selectors (max specificity 0,0,2), which Phase 1 fully beats. The high-specificity leak Phase 2 defends against (for example `#hero p` at 1,0,1) is hypothetical: no such rule exists in the reference setup. Per YAGNI, hold Phase 2 until a real consumer hits the case, then ship it cheaply using the steps below. Activating early is a valid choice if the team prefers to harden proactively; flip the statuses to `[ ] not started` and proceed.

**What it does.** Establishes a small, explicit layer order so the cascade itself encodes "page prose < component," and the pin wins *structurally* instead of by specificity. It does **not** change the ownership policy (Section 3): links and emphasis still inherit the page, because their `site.css` rules sit in the `prose` layer and nothing unlayered in the slot targets them.

| Tier | What | Mechanism |
|---|---|---|
| `baseline` | `tokens.css`'s `:where(*)` font fallback | lowest layer |
| `prose` | `site.css`'s page typography | middle layer |
| *(unlayered)* | component `<style>` blocks, editor chrome | beats all named layers |

Unlayered author styles beat any named layer regardless of specificity (CSS Cascade 5 sorts by layer before specificity). Once `site.css` is in `prose` and component pins stay unlayered, the pin wins over the entire prose layer, including a `#hero p` that lives in `site.css`.

**Scope of the robustness claim (corrected).** This is robustness against anything in the `prose` layer, not against any selector anywhere. A consumer rule that is both higher-specificity than the pin *and* sits in an unlayered stylesheet (a second global sheet, a CSS-in-JS injection) still pierces. That case is rare, and `prose={false}` is the deliberate escape. Do not oversell this as "robust against any specificity."

### P2-T1 — Declare the layer order

**Status:** `[-] gated`
**Files:** `src/system/styles/tokens.css` (top), and the starter copy
**Depends on:** Phase 1 complete

Add as the first line of the first-loaded stylesheet (`tokens.css`, imported first by `main.ts`):

```css
@layer baseline, prose;
```

**Acceptance:**
- [ ] The order declaration is present before any page renders (it is in the first import).
- [ ] `:root { --vars }` blocks stay unlayered, so the variable cascade (`tokens.css` defaults → `tokens.generated.css` `:root:root` overrides → editor inline writes) is untouched. This preserves the iframe CSS-var fan-out invariant (`reference_cssvar_fanout`).

### P2-T2 — Demote only the baseline font rule

**Status:** `[-] gated`
**Files:** `src/system/styles/tokens.css:5`

Wrap *only* the universal font fallback:

```css
@layer baseline {
  :where(*:not([class*="fa-"])) { font-family: var(--font-sans); }
}
```

This is safe in place: the editor never writes `tokens.css` (confirmed in `themeFileApi.ts` options doc and regen comments; writes go to `tokens.generated.css` only). The demotion is behavior-preserving: the rule is zero-specificity already, so anything that beat it before still beats it.

**Landmine (do not skip this task):** the baseline is currently unlayered, i.e. the highest tier. If you layer `site.css` (P2-T3) without demoting the baseline, the unlayered `--font-sans` baseline would beat the layered serif `p` rule and strip serif from page body text. Demotion is mandatory, not optional.

**Acceptance:**
- [ ] Only the `:where(*)` rule is layered; all `:root` blocks remain unlayered.
- [ ] Page body text still renders serif (the prose layer beats the demoted baseline).

### P2-T3 — Ship `site.css` wrapped in `@layer prose`

**Status:** `[-] gated`
**Files:** `src/app/site.css` (demo) and `starter/site.css` (the template copy)
**Depends on:** P2-T1, P2-T2

`site.css` is a JavaScript per-page side-effect import (`Home.svelte:6: import './site.css'`, lazy-loaded per route), **not** a CSS `@import`. There is no `@import` statement to decorate with `layer()`. The simplest correct mechanism is to ship the starter `site.css` with its rules wrapped in a top-level layer block:

```css
@layer prose {
  h1 { … }
  p  { … }
  /* the existing rules, unchanged */
}
```

The user still authors bare element selectors inside the block (same authoring model as the `:root {}` wrapper they already accept in `tokens.css`). This removes the only real feasibility risk in the original plan: no wrapper `@import` file, no Vite `@import … layer()` spike, no `?inline` fallback. Wrap both copies: the library's own demo (`src/app/site.css`, loaded by `Home.svelte`) and the starter (`starter/site.css`).

**Acceptance:**
- [ ] Both `site.css` copies wrap their rules in `@layer prose { … }`; the selectors and values inside are unchanged.
- [ ] On the Home page: page `<p>` renders serif (prose beats baseline); a card body `<p>` renders the card alias (unlayered pin beats prose); a slotted `<a>` still uses the page link color (its `site.css` rule is uncontested in the slot); `prose={false}` yields the slot to the consumer.

### P2-T4 — Migration entry and guardrail layer check

**Status:** `[-] gated`
**Files:** `vite-plugin/tokensCssMigrations/migrations/<date>-cascade-layers.ts`, its registration in `index.ts`, the `create` template, `scripts/check-slot-prose.mjs`
**Depends on:** P2-T1..T3

A `tokens.css` change must ship a migration so `npx live-tokens migrate` upgrades existing vendored copies (`feedback_scale_changes_need_migration`). Note this is a **new kind** of migration: existing ones are token-presence transforms (`ensureScale`, `renameToken`, `removeToken`); this one prepends the `@layer baseline, prose;` order line and wraps the baseline rule. It must be idempotent by presence (detect an already-declared `@layer baseline` and a baseline already wrapped), consistent with the "idempotent by presence" rule in `tokensCssMigrations/types.ts`.

`site.css` is user-owned and there is **no** `site.css` migration track today (the infra targets `tokens.css`). Decide one of: (a) add a `site.css` migration track, or (b) document the one-line wrap as a manual migration step for existing consumers. Option (b) is lower-risk because it avoids a tool rewriting a user-owned file; record the decision here.

Optionally extend `check:slot-prose` (P1-T4) so that, once layers exist, it also flags a slotted-prose component that re-introduces specificity-chasing selectors.

**Acceptance:**
- [ ] Migration adds the order line + wraps the baseline; second run is a no-op (idempotent).
- [ ] `create` template ships the layered `tokens.css` and the layered `site.css`.
- [ ] `site.css` migration decision (a or b) recorded with a one-line rationale.

### P2-T5 — Verify high-specificity isolation

**Status:** `[-] gated`
**Depends on:** P2-T1..T4

**Acceptance:**
- [ ] On a real page, a `#hero p` rule placed in `site.css` no longer leaks into a card inside `#hero` (unlayered pin beats prose).
- [ ] Editor and `/components` surfaces are unaffected (they do not import `site.css`; confirmed no `site.css` import under `src/editor`).
- [ ] Page prose, card alias, and `prose={false}` all behave as in P2-T3.

---

## Considered and rejected

### `@scope` donut (lower-boundary scope)
A donut scope (`@scope (:root) to (.lt-slot) { p, ul, … { … } }`) would make page prose stop at the slot boundary, letting slotted `<p>` inherit the container's type with **no pin at all**. It is the most direct expression of the root cause and the only light-DOM way to delete the pin.

Rejected because it changes the ownership policy in a way we do not want. `@scope` excludes elements by subtree, not properties by axis, so it would also strip the consumer's `<a>` and `<strong>` styling inside slots: links would stop looking like links inside a card. Restoring them means re-adding rules in the component, which re-introduces a pin and defeats the simplicity. It also needs a newer browser baseline (`@scope` is mid-2024 Baseline; `@layer` is 2022). It additionally requires scoping the `tokens.css` universal baseline out of slots too (a directly-matching `:where(*)` beats inheritance even from a lower layer), which is more surgery on `tokens.css`. The per-axis pin plus `@layer` keeps the deliberate "components own body type, links stay links" policy and hardens it; the donut would blunt it. Revisit only if the product decision changes to "components fully own all slotted content."

### Wrapper component (`<SlotBody>`)
Svelte 5 makes a shared wrapper component easy, and it would make the defense impossible to forget (use the component or you have no slot body). Rejected as not worth its costs: slotted content is not scoped to the wrapper either, so the wrapper would still need a `:global` pin (no scoping gain over the mixin); it adds a DOM node per slot; and a plain `.svelte` file in `src/system/components/` lands in the public components export glob. The mixin already centralizes the defense to one file, and the `check:slot-prose` guardrail (P1-T4) covers the "forgot it" risk that the component would otherwise prevent.

### Shadow DOM / custom elements
Would truly delete the per-component pin. Rejected for the same reasons as the original plan: SSR, the editor overlay, forms, and tooling costs. Svelte 5's easy custom-element compilation does not change that calculus.

### Lowering `site.css` specificity to `:where()`
Does not fix it. A rule that directly matches `<p>` beats the component's inherited typography regardless of specificity. See Section 2.

### Dropping the Phase 2 pin to `:where()`
The original plan proposed zeroing the pin's specificity once layers do the work, for aesthetic consistency with `tokens.css`. Rejected: it buys nothing (the layer already wins over the prose layer) and slightly lowers the pin's residual defense against stray unlayered consumer rules. Keep the pin at its scoped class specificity.

---

## Svelte 5 notes (does it open options for handling this?)

Short answer: it improves authoring and explains the model, but it does not provide a structural escape for slotted content. The structural fix stays at the CSS-platform layer (`@layer`).

- **Scoped-style specificity (+0-1-0).** Svelte adds a hashed class to the elements a component renders, so the component's own `p` beats a global `p` automatically, even if the global sheet loads later. This is why the component never needs to defend the markup it renders itself.
- **Slotted content is not scoped to the component.** Content passed via `children` and rendered with `{@render children()}` belongs to the caller's scope and gets none of the component's 0-1-0 bump. This is the exact reason the explicit `:global` pin is required, and why no Svelte switch removes the need for it.
- **`:global { … }` blocks.** Svelte 5 supports a `:global { p { … } }` block (and the nested `.a :global { .b { … } }` form). This is the cleaner way to author the pin than repeating `:global(p), :global(ul), …`. P1-T1 ships the proven `:global(...)` form first and lists the block as a verified-only cleanup, because the rule passes through scss before Svelte sees it.
- **Custom elements (shadow DOM).** Svelte 5 compiles to custom elements readily, which is the only thing that would delete the pin, but the encapsulation costs remain (see Considered and rejected).

---

## Findings traceability

Every issue raised in the architecture review maps to a roadmap item:

| Finding | Resolution |
|---|---|
| C1 — Phase 2 targets a CSS `@import` that does not exist (`site.css` is a JS per-page import) | P2-T3 ships `site.css` pre-wrapped in `@layer prose`; the `@import … layer()` spike is removed |
| M1 — a simpler Phase 2 mechanism exists | P2-T3 (pre-wrap, no wrapper file, no spike, no `?inline`) |
| M2 — "robust against any specificity" is overstated | Phase 2 intro restates it as "robust against the prose layer"; pin kept at class specificity (no `:where()` drop) |
| M3 — pin coverage looked incomplete | Section 3 records it as a deliberate policy (own p/ul/ol/li type; links and emphasis inherit the page) |
| M4 — Phase 2 solves a hypothetical | Phase 2 is gated with an explicit activation trigger; Phase 1 fixes the observed bug |
| m1 — specificity figures were off | Section 2 "A correction on specificity figures" |
| m2 — plan omitted `CONVENTIONS.md` and the starter copy | P1-T3 (conventions), P2-T3 (both `site.css` copies) |
| m3 — the `@layer` migration is a new kind | P2-T4 notes the structural, idempotent-by-presence transform and the missing `site.css` migration track |

---

## Appendix — verified facts and files

Verified against the code (June 2026):

- `src/system/styles/tokens.css:5` — zero-spec `:where(*)` baseline, currently unlayered.
- `src/app/site.css` — global page prose, **bare element selectors only** (max 0,0,2); styles p, ul li, ol li, h1-h3, a, strong, blockquote, hr. JS-imported per page by `Home.svelte:6`, lazy per route (`App.svelte`). No CSS `@import` of it anywhere.
- `src/system/components/Card.svelte:178` — per-axis pin + `prose` opt-out (the reference to generalize).
- `src/system/components/CollapsibleSection.svelte:293`, `src/demo/sections/SectionKit.svelte:221` — drifted sledgehammer copies (SectionKit covers `p` only).
- `vite-plugin/themeFileApi.ts` — `tokens.css` is developer-authored and never editor-written; writes go to `tokens.generated.css`.
- `src/app/main.ts:4` — load order: `tokens.css`, then `tokens.generated.css`, then `fonts.css`; pages import `site.css` later.
- `scripts/check-no-style-imports.mjs` — the guardrail pattern to mirror for P1-T4.
- `vite-plugin/tokensCssMigrations/` — token-presence migration infra (`cssTokenOps.ts`), idempotent by presence; no `site.css` track.
- `package.json` — Svelte `^5.55.5`; `:global { }` blocks available.
- No `@layer` or `@scope` anywhere in the repo today; Phase 2 introduces the first.
