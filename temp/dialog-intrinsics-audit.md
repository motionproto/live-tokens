# Dialog intrinsics audit

Phase 3a of `component-intrinsics-roadmap.md`. Goal: retire `Dialog.svelte`'s direct `editorState` subscription so the live Dialog reads `--dialog-confirm-variant` / `--dialog-cancel-variant` from the CSS cascade, matching the phase 1 SectionDivider pattern.

This doc proposes answers to the three open questions from the roadmap and lays out implementation steps concretely enough to execute on sign-off.

---

## What's broken today

`Dialog.svelte:5,42-44`:

```ts
import { editorState } from '../../editor/core/store/editorStore';
let configuredConfig = $derived($editorState.components.dialog?.config ?? {});
let effectiveConfirmVariant = $derived(confirm?.variant ?? asVariant(configuredConfig['--dialog-confirm-variant'] as string | undefined, 'primary'));
let effectiveCancelVariant = $derived(cancel?.variant ?? asVariant(configuredConfig['--dialog-cancel-variant'] as string | undefined, 'outline'));
```

The Dialog component imports the editor store from a sibling tree and subscribes to it for intrinsic values. Two problems:

1. **Package leak.** A system component depends on editor code. Consumers shipping the npm package drag editor surface area into their bundle (even if tree-shaken, the import path crosses a layer it shouldn't).
2. **Bus mismatch.** Every other live component receives values via the CSS cascade. Dialog uses a side channel. That's the anti-pattern phase 1 retired for SectionDivider.

The fix is to put Dialog on the same bus.

---

## The shape twist

SectionDivider's intrinsics map to CSS *properties* (`display`, `text-align`). Dialog's intrinsics map to Button variant *names* — strings consumed by `<Button variant={...} />` that expand to classes inside `Button.svelte`. CSS vars can carry the string on `:root`, but Dialog still has to read it in JS to pass to a child component. Pipeline:

1. CSS var carries the variant name on `:root`, written by the same renderer path that already handles aliases.
2. Dialog reads the variant name reactively and forwards it to `<Button>`.
3. The read replaces the `$editorState` subscription.

---

## Audit finding: the renderer doesn't write config keys to `:root` today

The biggest correction vs. the roadmap. `componentsToVars` in `src/editor/core/themes/slices/components.ts` iterates `slice.aliases` only; the `slice.config` bucket never reaches `:root`:

```ts
for (const slice of Object.values(components)) {
  for (const [varName, ref] of Object.entries(slice.aliases)) {
    // emits to CSS var map
  }
}
```

So today `editorState.components.dialog.config['--dialog-confirm-variant']` lives only in memory. No CSS var ever gets written. That's why Dialog has to subscribe to the store: it's the only place the value exists.

The roadmap proposed a migration to "encode as CSS var". No schema change is actually needed. The config bucket already stores the value in the right shape. What's missing is the renderer step that emits it to `:root`. That's a smaller change than the roadmap implied.

Implication for `componentConfigKeys.ts:16-27`: the existing comment notes some config keys are editor metadata (e.g. `--sectiondivider-*-color-family`) and should *not* become runtime CSS vars. So we can't blanket-emit the whole config bucket. We need to mark which keys cascade.

---

## Answers to the three open questions

### Q1. How does Dialog read the CSS var reactively?

**Recommendation: MutationObserver on `document.documentElement` style attribute, scoped to mount/unmount.**

Why not the alternatives:

- **`CSS_VAR_CHANGE_EVENT` from `cssVarSync` (option a in roadmap).** The event exists (`cssVarSync.ts:CSS_VAR_CHANGE_EVENT`), but it ships from editor code. Subscribing from `Dialog.svelte` would replace one cross-layer import with another and ship the event-string contract into the package. Not better.
- **Read once at mount, accept editor preview is its own thing (option c).** Workable for production (CSS vars are static once the stylesheet loads), but creates two code paths and reintroduces the editorState read in the editor preview. The whole point is to unify on one bus.
- **MutationObserver on `:root` (option b).** Zero editor coupling. Fires only when the inline style on `documentElement` changes (which happens precisely when the editor mutates it via `cssVarSync.setCssVar`). In production where the var is set in a stylesheet rather than inline, the observer just never fires. Cheap, correct, layer-clean.

Sketch:

```ts
let confirmVarValue = $state(readVar('--dialog-confirm-variant'));
let cancelVarValue = $state(readVar('--dialog-cancel-variant'));

function readVar(name: string): string {
  return typeof document === 'undefined'
    ? ''
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

$effect(() => {
  if (typeof document === 'undefined') return;
  const obs = new MutationObserver(() => {
    confirmVarValue = readVar('--dialog-confirm-variant');
    cancelVarValue = readVar('--dialog-cancel-variant');
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  return () => obs.disconnect();
});

let effectiveConfirmVariant = $derived(confirm?.variant ?? asVariant(confirmVarValue, 'primary'));
let effectiveCancelVariant = $derived(cancel?.variant ?? asVariant(cancelVarValue, 'outline'));
```

SSR-safe via the `typeof document` guard. No editor imports. One observer per Dialog instance, but the callback work is two `getComputedStyle` reads, both negligible.

If multiple Dialogs are open at once, each registers its own observer. Acceptable. Can be hoisted to a shared module-level singleton later if it ever matters; not worth the abstraction now.

### Q2. Scope of intrinsics covered

**Recommendation: just the two variant keys. Nothing else.**

Surveyed `Dialog.svelte` for other candidates:

- `title` (line 91) — optional, conditionally shown. Consumer-controlled (the `title` prop). Not an editor intrinsic.
- `confirm` / `cancel` (lines 110-138) — visibility driven by whether the consumer passes the spec. Not an editor intrinsic.
- `footerLeft` snippet — consumer-controlled.
- `width`, `inline`, `show` — consumer props.

Surveyed `DialogEditor.svelte` for editor-exposed intrinsics:

- Color/typography tokens (frameStates, frameTypeGroups). Already aliases.
- The two `extraPropertyRows` selectors (lines 113-131). The two variant keys.

There are no other editor-controlled intrinsic strings on Dialog. Scope is two keys.

### Q3. `asVariant` fallback

**Recommendation: keep the validation.**

`Dialog.svelte:9-11` validates the read string against `BUTTON_VARIANTS`. Costs nothing. Catches a stale or hand-edited theme file feeding garbage into `<Button variant>` (where the consequence would be a missing CSS class and an unstyled button). Defense in depth at zero performance cost. No change.

---

## Implementation steps

Five mechanical changes. Estimated 4–6 hours including verification.

### 1. Mark cascading config keys

`src/editor/core/components/componentConfigKeys.ts`. Add a second set alongside `KNOWN_COMPONENT_CONFIG_KEYS`:

```ts
/**
 * Subset of KNOWN_COMPONENT_CONFIG_KEYS that should be emitted as `:root` CSS
 * vars by the renderer. Editor-only metadata (e.g. `--sectiondivider-*-color-family`)
 * stays out of this set.
 */
export const CASCADING_COMPONENT_CONFIG_KEYS: ReadonlySet<string> = new Set([
  '--dialog-confirm-variant',
  '--dialog-cancel-variant',
]);
```

`KNOWN_COMPONENT_CONFIG_KEYS` keeps its existing contents and remains the validation set. The new set is strictly a subset used by the renderer.

### 2. Extend `componentsToVars`

`src/editor/core/themes/slices/components.ts`. After the existing aliases loop, add:

```ts
for (const slice of Object.values(components)) {
  for (const [key, value] of Object.entries(slice.config)) {
    if (CASCADING_COMPONENT_CONFIG_KEYS.has(key) && typeof value === 'string') {
      out[key] = value;
    }
  }
}
```

The existing `editorRenderer.ts` diff-and-write loop (lines 59-68) will pick these up automatically and route them through `setCssVar` (which already fans out to both self and parent roots via `cssVarSync`). No changes needed in the renderer.

### 3. Rewrite `Dialog.svelte`

- Remove the `editorState` import (line 5).
- Remove the three `$derived` lines (42-44).
- Add the `$state` + `$effect` + MutationObserver pattern from Q1 above.
- Keep `asVariant` and `BUTTON_VARIANTS` unchanged.

The conditional rendering on lines 87, 91, 110 stays as-is. The only logic change is how `effectiveConfirmVariant` and `effectiveCancelVariant` are derived.

### 4. No changes to `DialogEditor.svelte`

`DialogEditor.svelte:100-107` already calls `setComponentConfig(component, CONFIRM_VAR, v)`. That writes to `editorState.components.dialog.config`, which now flows through the extended `componentsToVars` from step 2. The mutator path is unchanged.

### 5. No migration needed

The config schema is unchanged. The two keys live in the same bucket with the same values. Existing theme files load and work without transformation.

---

## Verification

After the changes:

1. **Editor live-sync.** On `/components/dialog`, change the "right button" variant in the editor selector from Primary to Danger. Open `/demo` (or any consumer page using `<Dialog>` with no explicit `confirm.variant`) and confirm the live Dialog's confirm button rerenders in the danger variant without a refresh.
2. **Iframe fan-out.** Same test from the overlay editor on `/`. The `cssVarSync` self+parent write should already handle this. Verify by checking the iframe's parent document inline style on `:root` includes both vars after a change.
3. **Production read.** Build the package, dogfood in the starter, confirm the Dialog picks up the var from the generated stylesheet without ever opening the editor. (Observer registers but never fires; initial `readVar` returns the cascaded value.)
4. **No editor import in Dialog.** `grep editorState src/system/components/Dialog.svelte` returns nothing.
5. **No other system component regressions.** `grep -r editorState src/system/components/` returns nothing (was true before, should stay true).
6. **`asVariant` fallback.** Hand-edit a theme file to set `--dialog-confirm-variant: garbage`, load it, confirm Dialog falls back to `primary` without console errors.

---

## What ships

- `Dialog.svelte` no longer imports from `../../editor/`.
- The CSS cascade is the sole bus for Dialog intrinsics.
- The anti-pattern is retired across all live components in `src/system/components/`.
- A modest extension to `componentsToVars` opens the path for future string-valued config keys to cascade without further infrastructure changes (relevant to phase 3b's "string intrinsic" playbook row).

## What does not ship

- No generalized `getCssVarReactive` helper. The MutationObserver pattern lives inline in Dialog. Promote it to a helper when the second component needs it.
- No changes to `KNOWN_COMPONENT_CONFIG_KEYS` semantics. The new `CASCADING_COMPONENT_CONFIG_KEYS` set is additive.
- No build-time pruning. Dialog has no per-variant markup to prune; phase 2's `PRUNE_FOR` is irrelevant here.
- No migration file. The data on disk is unchanged.

---

## Risks and notes

- **MutationObserver in SSR.** Guarded by `typeof document === 'undefined'`. Svelte 5 effects don't run on the server, so the guard is belt-and-braces, but cheap.
- **Observer firing on unrelated `:root` style changes.** Any `style` mutation on `documentElement` triggers the callback, which then reads two CSS vars. The callback work is O(1) and runs only when an editor write actually happens. Not a concern.
- **Multiple Dialogs.** Each Dialog instance registers its own observer. The package's `Dialog` is typically a singleton-ish modal, so this is fine. If a page renders many Dialogs simultaneously, the observer count grows linearly. Still fine; promote to a shared singleton only if profiling shows otherwise.
- **Order of operations on first render.** The Dialog reads the var via `getComputedStyle` at component init. By that point, the renderer's first pass over the loaded theme has already written the var (the renderer subscribes to `editorState` and writes on the initial subscription, before any component renders). So the initial read returns the correct value, not the asVariant fallback. Verified by the existing `editorRenderer.ts` invocation order.
