---
name: live-tokens-create-component
description: Author a brand-new editable component for a @motion-proto/live-tokens project when nothing in the shipped catalogue fits — runtime and editor Svelte files, registration, naming, state model, and verification. Use when the user asks to author, create, or build a new tokenized component; make an existing Svelte component editable in the live-tokens editor; add a component to the catalogue; register a custom component with the editor; or build a [Thing] component that does not exist in the shipped set. Not for placing an existing shipped component on a page (see live-tokens-build-page); read live-tokens-pick-component first to confirm nothing in the catalogue fits.
---

# Authoring a component for a live-tokens project

The end state is a runtime Svelte file, an editor Svelte file, one registration, and an entry on `/live-tokens/components` under the **CUSTOM** group with full token editing, linked-block sharing, and persistence.

## Worked examples ship inside the package

For pattern reference, read any shipped component's source directly from the consumer's `node_modules`:

- Runtime files: `node_modules/@motion-proto/live-tokens/src/system/components/<Name>.svelte`.
  - Simplest reads (no state, no linked-block): `Card` (single variant with parts), `Badge` and `Callout` (multi-variant).
  - Multi-state (hover, disabled, focus): `Button`, `Input`.
  - Multi-part (overlay / header / body / footer): `Dialog`.
  - Multi-variant with linked siblings (`canBeLinked` + `groupKey`): `SegmentedControl`, `TabBar`. Composes another shipped component: `CodeSnippet`.
- Editor files: `node_modules/@motion-proto/live-tokens/src/editor/component-editor/<Name>Editor.svelte`.

**File-location note.** Shipped editors live in `src/editor/component-editor/` because they're library-internal. For *your* component, **co-locate** both files in `src/system/components/`. Read the shipped files for pattern, ignore their location.

## The recipe

1. **Runtime file** — `src/system/components/MyWidget.svelte`. Declare every editable slot as a CSS custom property inside `:global(:root)`, defaulting to a theme token (never a raw value). The plugin parses `:global(:root)` to seed `component-configs/<id>/default.json`; variables declared anywhere else can't be edited.
2. **Editor file** — `src/system/components/MyWidgetEditor.svelte`. In a `<script module>` block, declare `const component = 'mywidget'`, build a `states: Record<string, Token[]>` for each VariantGroup, and export the flat union as `allTokens: Token[]`. Components with linked siblings also build a `linkableContexts: Map<string, string>` (read `references/linked-siblings.md`). Components with structural/display controls that aren't token values (alignment, element visibility, layout position) also export an `intrinsics: IntrinsicSpec[]` (read `references/intrinsics.md`). In the runtime `<script>` block, mount `ComponentEditorBase` with one `VariantGroup` per variant.
3. **Register** — pass the component to `bootLiveTokens` in `src/main.ts`. This is the standard boot the scaffold generates and the README documents; `bootLiveTokens` calls `registerComponent` internally at the right point — after its editor init hooks (`cssVarSync.init`, `editorStore.init`), before it seeds configs and mounts the app:
   ```ts
   import { bootLiveTokens } from '@motion-proto/live-tokens';
   import App from './App.svelte';
   import MyWidgetEditor, { allTokens as myWidgetTokens } from './system/components/MyWidgetEditor.svelte';

   bootLiveTokens(App, '#app', {
     components: [{
       id: 'mywidget',
       label: 'My Widget',
       icon: 'fas fa-magic',
       sourceFile: 'src/system/components/MyWidget.svelte',
       editorComponent: MyWidgetEditor,
       schema: myWidgetTokens,
     }],
   });
   ```
   The schema side-effect happens inside `registerComponent` (which `bootLiveTokens` calls for you), so you don't call `registerComponentSchema` separately. **Do not place a standalone `registerComponent(...)` *before* `bootLiveTokens`** — that registers before the editor's init hooks run, which is the wrong window and can leave editor changes disconnected from the live page. Only call `registerComponent` directly if your app mounts manually (no `bootLiveTokens`), in which case call it before `mount(App, ...)`.
4. **Say what it is for.** The runtime file's leading HTML comment is the
   component's description. `npx live-tokens components` prints it beside the
   id with the variants and props read from `interface Props` (`--json` for
   data); that is how **live-tokens-pick-component** weighs a project's own
   component against the shipped set, so no skill file is edited and nothing
   is lost when `setup-claude` refreshes the skills. Name the job it does and
   what it is not for. A directory other than `src/system/components` goes in
   `"componentDirs"` in `live-tokens.config.json`; a first-party component is
   also added to the picker's **Catalogue** line, which `check:skills` holds.
5. **Join the sketch layer** — the effect draws a fixed set of parts, so a new
   component stays crisp while the page around it goes hand-drawn until it opts
   in. A consumer component carries one of four reserved classes on its root and
   names the five `--sketch-*` values it is drawn with; a first-party component
   adds a `PartSpec` row instead. The layer also takes `background`,
   `border-color`, `box-shadow`, `overflow`, `position` and both pseudo-elements
   away from the element it draws, which constrains where the class can go. Read
   `references/sketch-mode.md`.
6. **Gate on the checker.** Run it, fix every error, and run it again. Do not
   call the component done while it reports one:
   ```bash
   npx live-tokens check-component <id> --strict --json
   ```
   `--json` gives each finding a stable `rule` id and a line number, so work one
   rule at a time and re-run rather than guessing. `--strict` fails on warnings
   too, which is the right setting for a new component: every warning it raises
   is a naming or token decision that is cheaper to make now than to migrate
   later. Exit code 0 is the gate. With no id it checks every component under
   `src/system/components`; a project scaffolded by `create` runs that as
   `npm run check:design` before every `vite build`.

   If it rejects a suffix, do not invent a new name for the role. Find a shipped
   component that paints the same thing and use the name it uses: the catalogue
   is the worked reference, and `bin/check-component.test.ts` holds all 26 of
   them to this same contract.
7. **Verify** with the checklist at the bottom of this file, then place the component on a page with **live-tokens-build-page**.

## Token discipline

### Naming scheme

```
--<componentId>-<part|variant>[-<state>][-<element>]-<property>
```

- `componentId` — the literal id passed to `registerComponent()`. Lowercase, no dashes, no abbreviations (`segmentedcontrol` not `sc`). The file id matches: `MyWidget.svelte` → id `mywidget`.
- `part` or `variant` — the sub-region (`bar`, `option`, `track`, `header`, `body`, `footer`, `overlay`, `value`, `label`), or, on a component whose variants differ in more than one property, the variant name: `--badge-accent-surface`, `--callout-danger-border`. A component with both stacks them outer to inner, so the bar in its small size is `--segmentedcontrol-bar-small-padding`.
- `state` (optional) — interaction or component state (`hover`, `disabled`, `selected`, `focus`). **Always before the property.**
- `element` (optional) — sub-element inside the part (`dot`, `icon`, `label`, `text`).
- `property` — theme role or CSS property. Always last.

### Suffix vocabulary

The editor picker is chosen by the token's suffix, so the suffix is the naming
decision that matters. Color and surface: `-surface`, `-border`, `-text`,
`-icon`, `-label`, `-fill`, `-divider`, `-color`, `-shadow`, `-opacity`,
`-tint`, `-background`, `-accent`, `-indicator`, `-thumb`, and the
element-named text roles `-title`, `-body`, `-eyebrow`, `-description`,
`-hint`, `-error`, `-placeholder`, `-value`. Geometry: `-radius`,
`-border-width`, `-accent-width`, `-hairline-thickness`, `-thickness`,
`-width`, `-height`, `-size`, `-padding`, `-margin`, `-gap`, `-inset`,
`-divider-width`, `-divider-thickness`, `-divider-height`, `-divider-inset`,
`-track-height`, `-dot-size`, `-thumb-size`, `-icon-size`, `-scale`, `-blur`.
Motion: `-duration`, `-easing`. Typography: `-font-family`, `-font-weight`,
`-font-size`, `-line-height`, `-letter-spacing`.

A token that carries a structural keyword rather than a value takes no suffix
from this list. Declare it in the editor's `intrinsics` instead, which is what
exempts it, and never end its name in a state word, which reads as
state-after-property and fails.

Read `references/token-naming.md` for what each one means and when two of them
compete. A suffix outside that list fails `check-component`. The list lives in
`KIND_RULES` in the editor's `aliasKinds.ts`, which the picker, the `adjust`
CLI, and `check-component` all read, so a name accepted here always has a
control behind it.

### Rules that bite

- **Fixed overlays must portal to `<body>`.** Any `position: fixed` layer is trapped by a transformed or `contain`ed ancestor, which real pages and the editor's preview pane both have. `check:overlay-portal` fails the build without it. Read `references/fixed-overlays.md` before authoring a modal, lightbox, or backdrop.
- **State before property.** `--mywidget-button-hover-surface` ✓ — `--mywidget-button-surface-hover` ✗ (breaks sibling matching). Disabled is terminal in the name too: `-disabled-hover-` and `-selected-disabled-` describe states that never paint, and `check-component` rejects both.
- **Every default resolves to a theme token.** A component token names a semantic property; its default is the theme token that property reads. That is what makes the component repaint when the theme changes. `var(--surface-primary)` ✓, `#6a4ce8` ✗, `white` ✗, and `var(--surface-imaginary)` ✗: `check-component` fails on a colour literal in any notation, on a `var()` naming a token that does not exist, and on a default with no token behind it at all, so a raw `16rem` fails too. Composing tokens counts and is common: `color-mix(in srgb, var(--surface-neutral-lower) 70%, transparent)`, or `calc(var(--space-64) * 4)` for a width the spacing scale does not reach. The one value allowed without a token is a structural keyword (`contain`, `start`, `none`), and only when the editor declares it in `intrinsics`.
- **No abbreviations.** `bg` → `surface`; `fg` → `text`; component ids are never abbreviated.
- **Text aliases.** Neutral scale is `--text-primary` / `--text-secondary` / `--text-tertiary` / `--text-muted` / `--text-disabled`. Family-tinted is `--text-primary-color`, `--text-accent`, `--text-success`. There is no `--text-neutral`.
- **Typography `groupKey` on multi-slot components must include the slot prefix.** `groupKey: 'value-font-family'` and `groupKey: 'label-font-family'` ✓ — bare `groupKey: 'font-family'` silently merges them into one link tree ✗. Single-slot components can use a bare typography `groupKey`; add the slot prefix the moment a second slot appears. The same trap applies to type-group **colors** (two slots ending in `-text` collapsing to one `text` key). Let the helpers handle both, below.
- **Let the type-group helpers derive slot-scoped keys; never rely on the bare last-dash default.** When you build typography tokens with `buildTypeGroupColorTokens` / `buildTypeGroupTokens` / `buildTypeGroupFontTokens`, **pass `{ component, variants }`** so each slot gets a distinct, structural `groupKey`:

  ```ts
  // variants = the variant/state segment strings as they appear in the variable name
  const VARIANTS = ['default', 'hover'] as const;
  ...buildTypeGroupColorTokens(typeGroups, { component, variants: [...VARIANTS] }),
  ...buildTypeGroupFontTokens(typeGroups, { component, variants: [...VARIANTS] }),
  ```

  The helper strips the `--<component>-` prefix and those segments, keeping the rest: `--mywidget-header-default-text` → `header-text`, `--mywidget-header-default-text-font-family` → `header-text-font-family`. Two parts ending in the same word stay distinct; one slot across variants collapses to one key. To override a single derived key, set `colorGroupKey` on that type-group config — it wins and is never recomputed, so your fix survives. There is no name-based fallback: a bare `buildTypeGroupColorTokens` call emits un-grouped (solo) colors rather than guessing, and a bare *font* helper across multiple slots is a `check-component` warning (its default `font-family`/… keys would merge the slots' fonts).


## State model

Components *can* have two state axes. Many don't: container and messaging components (Card, Badge, Callout, CollapsibleSection) have only variants, no hover/disabled. Skip the rest of this section for those.

When a component does have states, don't mix the two axes:

- **Component states** — mutually exclusive top-level fieldsets: `default`, `selected`, `disabled` (names vary by component). One fieldset per component state.
- **Interaction states** — a select *inside* each component-state fieldset: `default`, `hover`. Add `focus`/`active` later if needed.

Rules:

- **Disabled is terminal.** A disabled component can't be hovered or focused. The `disabled` fieldset is flat — no interaction selector.
- **`selected-disabled` is impossible.** Don't author tokens or fieldsets for it.
- **Parts ≠ states.** Dialog's `overlay | header | body | footer` are *parts* (all present simultaneously), not states. The VariantGroup tab strip defaults its label to "Element" (neutral). If you label tabs anywhere, use **part** for structure and **state** for runtime conditions. Never call a footer a state.
- **Don't call interaction states "option states" or "selected states"** in the UI. `selected` is a *component* state.

Token naming consequence:

```
--mywidget-disabled-surface          ✓  component-state-level
--mywidget-option-disabled-surface   ✗  implies disabled is an interaction state
--mywidget-option-hover-surface      ✓  default-component-state, hover-interaction
--mywidget-selected-hover-surface    ✓  selected-component-state, hover-interaction
--mywidget-selected-disabled-text    ✗  selected-disabled doesn't exist
```

## User-facing copy

Strings you author for the editor UI use periods and commas, never em-dashes. Em-dashes read as an AI tell. This applies to `title=` and `description=` on `ComponentEditorBase`, token row labels, info popovers, and any text inside `previewActions` / `canvasToolbarExtras` snippets. Code comments are unaffected.

If you add custom chrome inside an editor snippet (rare — `ComponentEditorBase` and `VariantGroup` carry the standard chrome), keep it greyscale (no accent colors) and reference heading sizes via `--ui-font-size-md` / `-lg` / `-2xl` rather than pixel literals.

## Public imports only

Imports in your runtime, editor, and `main.ts` come from exactly two paths:

```ts
import { registerComponent, editorState } from '@motion-proto/live-tokens';
import {
  ComponentEditorBase, VariantGroup,
  computeLinkedBlock, withLinkedDisabled, buildSiblings,
} from '@motion-proto/live-tokens/component-editor';
import type { Token } from '@motion-proto/live-tokens/component-editor';
```

That covers everything the worked examples use. Additional primitives (`LinkedBlock`, `TypeEditor`, `TokenLayout`, `buildTypeGroupTokens`, `buildTypeGroupColorTokens`, `buildTypeGroupFontTokens`, `buildTypeGroupShareableContexts`, the `TypeGroupConfig` type, more types) are exported from the same paths for advanced cases.

**Never deep-import `node_modules/@motion-proto/live-tokens/src/...`.** Reading those files for pattern reference is fine; importing them at runtime is not. If you need something not exported, file an issue rather than reaching in.

## Worked example: the shipped Toggle

Toggle exercises every rule above in the fewest lines. Read both files from the package rather than from memory, because they are the contract and this skill is not:

- `node_modules/@motion-proto/live-tokens/src/system/components/Toggle.svelte`
- `node_modules/@motion-proto/live-tokens/src/editor/component-editor/ToggleEditor.svelte`

What to notice in the runtime file:

- Component states (`on`, `disabled`) name themselves in the token: `--toggle-on-*`, `--toggle-disabled-*`.
- Interaction states layer on top: `--toggle-hover-*` for default+hover, `--toggle-on-hover-*` for on+hover.
- Disabled is terminal: no `--toggle-disabled-hover-*`, no `--toggle-on-disabled-*`.
- The `force-hover` class pairs with the editor's preview hook so hover tokens paint without a real pointer. Each `:hover` selector has a matching `.force-hover` sibling.

What to notice in the editor file:

- No `groupKey`, no `canBeLinked`: Toggle has no linked siblings. For components that share base properties across variants, read `references/linked-siblings.md`.

For your own component, copy the pattern and substitute your id. Registering against a built-in id wins with a console warning, but the right call is a unique id.

## Extensions

Read the sketch reference for every component; the other two only when they apply.

- `references/linked-siblings.md`: variants that share base properties and should move together (Badge, Card, SegmentedControl).
- `references/intrinsics.md`: structural or display choices that are not token values (an alignment, an element's visibility), where the runtime default and the editor's read-back must agree.
- `references/sketch-mode.md`: joining the sketch layer. **Every component needs this.** One class on the root, the five `--sketch-*` values the layer draws with, and the list of what it takes over from the element. Skip it and the component stays crisp while the page around it goes hand-drawn.

## Verification checklist

After saving, run the static validator first:

```bash
npx live-tokens check-component <id>
# or: npx @motion-proto/live-tokens check-component <id>
```

It enforces the file layout, the `:global(:root)` block, token-suffix vocabulary, state-before-property rule, the terminal disabled state, public-imports rule, that every token an editor row names is declared in the runtime, and that the id is registered, via either `bootLiveTokens({ components: [{ id }] })` or a direct `registerComponent({ id })` call. On the value side it fails on a colour literal in any notation, on a default reading a token that does not exist, and on a default with no theme token behind it that the editor does not declare an intrinsic.

It *warns* (non-fatal) when a token-backed default still carries a px or rem term, and when a type-group font helper is called bare across multiple slots, which would merge their fonts into one link tree.

Exit code 0 means the static contract is met. Resolve warnings before shipping, or run with `--strict` to make them fail. `--json` prints findings with a stable `rule` id, so you can work through one rule at a time and re-run.

**Then run the registry contract test.** If you're authoring inside the package itself, `src/editor/component-editor/registryContract.test.ts` runs `describe.each(getComponentRegistryEntries())` and verifies, per component, that the registration resolves to a real `sourceFile` and a non-empty schema, that schema variables are unique, that every editable token (excluding `hidden: true`, `kind: 'gradient'`, and padding-side suffixes) is declared in the runtime `<style>` block and seeded in `src/live-tokens/data/component-configs/<id>/default.json`, and that `setComponentAlias` round-trips the alias through the slice.

A new first-party component is auto-covered the moment it lands in `builtInRegistry` — `npm test` will fail if any of the five checks miss. For a consumer-authored component, mirror this pattern in your own test suite if you want the same drift protection: `getComponentRegistryEntries` is exported from `@motion-proto/live-tokens` and returns every registration, shipped and custom, once your `main.ts` has run.

**If your component declares `intrinsics`, the intrinsics contract test covers it too.** `src/editor/component-editor/intrinsicsContract.test.ts` iterates every entry with an `intrinsics` array and asserts, per (intrinsic, variant), that the runtime `:global(:root)` declares a default, the default is one of the spec's `values`, and the editor's `default` equals the runtime default. This is what would have caught a getter defaulting to `center` while `:global(:root)` says `start`. Same auto-coverage rule: declare `intrinsics` on the registry entry and the test picks it up.

Finally navigate to `/live-tokens/components` and confirm the runtime behaviours no static check can see:

- [ ] The new component appears in the nav rail under the **CUSTOM** group (system entries above, custom below the labeled divider).
- [ ] Token rows render. Color pickers, radius selectors, font selectors all work.
- [ ] Linked-block (if your component has linked siblings): shared rows appear with the link toggle. Changing the linked value broadcasts across every variant.
- [ ] `component-configs/<id>/default.json` is derived from the `:global(:root)` block at boot. Save writes `_working.json`, the unsaved buffer the open theme captures; Save As also writes a named preset.
- [ ] Reset returns each variable to its `:global(:root)` default.
- [ ] Boot validation is clean (no warnings about the component being missing from the server scan, or about disk-vs-registry drift).
- [ ] Switch Sketch mode on in the editor and walk the checklist at the end of `references/sketch-mode.md`. The component is drawn in every variant and on hover, in its own colours, not crisp and not wearing another part's palette. Switch it off again and the component is unchanged.
