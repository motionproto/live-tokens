---
name: live-tokens-create-component
description: Author a brand-new editable component for a @motion-proto/live-tokens project when nothing in the shipped catalogue fits: runtime and editor Svelte files, registration, naming, state model, and verification. Use when the user asks to author, create, or build a new tokenized component; make an existing Svelte component editable in the live-tokens editor; add a component to the catalogue; register a custom component with the editor; or build a [Thing] component that does not exist in the shipped set. Not for placing an existing shipped component on a page (see live-tokens-build-page); read live-tokens-pick-component first to confirm nothing in the catalogue fits.
---

# Authoring a component for a live-tokens project

The end state is a runtime Svelte file, an editor Svelte file, one registration, and an entry on `/live-tokens/components` under the **CUSTOM** group with full token editing, linked-block sharing, and persistence.

## Worked examples ship inside the package

Read a shipped component's source from the consumer's `node_modules` rather than from memory, because the files are the contract and this skill is not:

- Runtime files: `node_modules/@motion-proto/live-tokens/src/system/components/<Name>.svelte`.
  - Simplest reads (no state, no linked-block): `Card` (single variant with parts), `Badge` and `Callout` (multi-variant).
  - Multi-state (hover, disabled, focus): `Button`, `Input`.
  - Multi-part (overlay / header / body / footer): `Dialog`.
  - Multi-variant with linked siblings (`canBeLinked` + `groupKey`): `SegmentedControl`, `TabBar`. Composes another shipped component: `CodeSnippet`.
  - Every rule below in the fewest lines: `Toggle`. Component states name themselves in the token (`--toggle-on-*`, `--toggle-disabled-*`), interaction states layer on top (`--toggle-hover-*`, `--toggle-on-hover-*`), disabled is terminal (no `--toggle-disabled-hover-*`), and each `:hover` selector has a `.force-hover` sibling so the editor's preview can paint hover tokens without a pointer.
- Editor files: `node_modules/@motion-proto/live-tokens/src/editor/component-editor/<Name>Editor.svelte`. `ToggleEditor` has no `groupKey` and no `canBeLinked`; for components that share base properties across variants, read `references/linked-siblings.md`.

Shipped editors live in `src/editor/component-editor/` because they are library-internal. For *your* component, co-locate both files in `src/system/components/`. Read the shipped files for pattern, ignore their location.

## The recipe

1. **Runtime file**, `src/system/components/MyWidget.svelte`. Declare every editable slot as a CSS custom property inside `:global(:root)`, defaulting to a theme token (never a raw value). The plugin parses `:global(:root)` to seed `component-configs/<id>/default.json`; variables declared anywhere else cannot be edited.
2. **Editor file**, `src/system/components/MyWidgetEditor.svelte`. In a `<script module>` block, declare `const component = 'mywidget'`, build a `states: Record<string, Token[]>` for each VariantGroup, and export the flat union as `allTokens: Token[]`. Components with linked siblings also build a `linkableContexts: Map<string, string>` (read `references/linked-siblings.md`). Components with structural or display controls that are not token values (alignment, element visibility, layout position) also export an `intrinsics: IntrinsicSpec[]` (read `references/intrinsics.md`). In the runtime `<script>` block, mount `ComponentEditorBase` with one `VariantGroup` per variant.
3. **Register** by passing the component to `bootLiveTokens` in `src/main.ts`, the boot the scaffold generates:
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
   `bootLiveTokens` calls `registerComponent` for you after its editor init hooks and before it seeds configs, so a standalone `registerComponent(...)` placed *before* `bootLiveTokens` lands in the wrong window and can leave editor changes disconnected from the live page. Call `registerComponent` directly only when the app mounts manually, and then before `mount(App, ...)`. Registering against a built-in id wins with a console warning; the right call is a unique id.
4. **Say what it is for.** The runtime file's leading HTML comment is the component's description. `npx live-tokens components` prints it beside the id with the variants and props read from `interface Props` (`--json` for data), which is how **live-tokens-pick-component** weighs a project's own component against the shipped set: no skill file is edited, and nothing is lost when `setup-claude` refreshes the skills. Name the job it does and what it is not for. A directory other than `src/system/components` goes in `"componentDirs"` in `live-tokens.config.json`. A first-party component is also added to the picker's **Catalogue** line, which `check:skills` holds.
5. **Join the sketch layer.** The effect draws a fixed set of parts, so a new component stays crisp while the page around it goes hand-drawn until it opts in. A consumer component carries one of four reserved classes on its root and names the five `--sketch-*` values it is drawn with; a first-party component adds a `PartSpec` row instead. The layer also takes `background`, `border-color`, `box-shadow`, `overflow`, `position` and both pseudo-elements away from the element it draws, which constrains where the class can go. Read `references/sketch-mode.md`.
6. **Gate on the checker.** Run it, fix every error, and run it again. Do not call the component done while it reports one:
   ```bash
   npx live-tokens check-component <id> --strict --json
   ```
   `--json` gives each finding a stable `rule` id and a line number, so work one rule at a time. `--strict` fails on warnings too, the right setting for a new component: every warning is a naming or token decision that is cheaper to make now than to migrate later. Exit code 0 is the gate. With no id it checks every component under `src/system/components`; a project scaffolded by `create` runs that as `npm run check:design` before every `vite build`.

   If it rejects a suffix, do not invent a new name for the role. Find a shipped component that paints the same thing and use the name it uses: every shipped component passes this same check, so the catalogue is the worked reference.
7. **Verify** with the checklist at the bottom of this file, then place the component on a page with **live-tokens-build-page**.

## Token discipline

### Naming scheme

```
--<componentId>-<part|variant>[-<state>][-<element>]-<property>
```

- `componentId`: the literal id passed to `registerComponent()`. Lowercase, no dashes, no abbreviations (`segmentedcontrol` not `sc`). The file id matches: `MyWidget.svelte` is id `mywidget`.
- `part` or `variant`: the sub-region (`bar`, `option`, `track`, `header`, `body`, `footer`, `overlay`, `value`, `label`), or, on a component whose variants differ in more than one property, the variant name: `--badge-accent-surface`, `--callout-danger-border`. A component with both stacks them outer to inner, so the bar in its small size is `--segmentedcontrol-bar-small-padding`.
- `state` (optional): interaction or component state (`hover`, `disabled`, `selected`, `focus`). **Always before the property.**
- `element` (optional): sub-element inside the part (`dot`, `icon`, `label`, `text`).
- `property`: theme role or CSS property. Always last.

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
- **State before property.** `--mywidget-button-hover-surface` passes; `--mywidget-button-surface-hover` breaks sibling matching. Disabled is terminal in the name too: `-disabled-hover-` and `-selected-disabled-` describe states that never paint, and `check-component` rejects both.
- **Every default resolves to a theme token.** A component token names a semantic property; its default is the theme token that property reads, which is what makes the component repaint when the theme changes. `var(--surface-primary)` passes; `#6a4ce8`, `white`, `var(--surface-imaginary)`, and a bare `16rem` all fail, because `check-component` rejects a colour literal in any notation, a `var()` naming a token that does not exist, and a default with no token behind it. Composing tokens counts and is common: `color-mix(in srgb, var(--surface-neutral-lower) 70%, transparent)`, or `calc(var(--space-64) * 4)` for a width the spacing scale does not reach. The one value allowed without a token is a structural keyword (`contain`, `start`, `none`), and only when the editor declares it in `intrinsics`.
- **No abbreviations.** `bg` is `surface`; `fg` is `text`; component ids are never abbreviated.
- **Text aliases.** Neutral scale is `--text-primary` / `--text-secondary` / `--text-tertiary` / `--text-muted` / `--text-disabled`. Family-tinted is `--text-primary-color`, `--text-accent`, `--text-success`. There is no `--text-neutral`.
- **Typography `groupKey` on multi-slot components must include the slot prefix.** `groupKey: 'value-font-family'` and `groupKey: 'label-font-family'` stay distinct; a bare `groupKey: 'font-family'` silently merges the slots into one link tree. Single-slot components can use a bare typography `groupKey`; add the slot prefix the moment a second slot appears. The same trap applies to type-group colours (two slots ending in `-text` collapsing to one `text` key).
- **Let the type-group helpers derive slot-scoped keys.** When you build typography tokens with `buildTypeGroupColorTokens` / `buildTypeGroupTokens` / `buildTypeGroupFontTokens`, pass `{ component, variants }` so each slot gets a distinct, structural `groupKey`:

  ```ts
  // variants = the variant/state segment strings as they appear in the variable name
  const VARIANTS = ['default', 'hover'] as const;
  ...buildTypeGroupColorTokens(typeGroups, { component, variants: [...VARIANTS] }),
  ...buildTypeGroupFontTokens(typeGroups, { component, variants: [...VARIANTS] }),
  ```

  The helper strips the `--<component>-` prefix and those segments, keeping the rest: `--mywidget-header-default-text` becomes `header-text`, and `--mywidget-header-default-text-font-family` becomes `header-text-font-family`. Two parts ending in the same word stay distinct; one slot across variants collapses to one key. To override a single derived key, set `colorGroupKey` on that type-group config; it wins and is never recomputed. There is no name-based fallback: a bare `buildTypeGroupColorTokens` call emits un-grouped (solo) colours rather than guessing, and a bare *font* helper across multiple slots is a `check-component` warning, because its default keys would merge the slots' fonts.

## State model

Components *can* have two state axes. Many do not: container and messaging components (Card, Badge, Callout, CollapsibleSection) have only variants, no hover or disabled. Skip the rest of this section for those.

When a component does have states, keep the two axes apart:

- **Component states** are mutually exclusive top-level fieldsets: `default`, `selected`, `disabled` (names vary by component). One fieldset per component state.
- **Interaction states** are a select *inside* each component-state fieldset: `default`, `hover`. Add `focus` or `active` later if needed.

Rules:

- **Disabled is terminal.** A disabled component cannot be hovered or focused. The `disabled` fieldset is flat, with no interaction selector.
- **`selected-disabled` is impossible.** Do not author tokens or fieldsets for it.
- **Parts are not states.** Dialog's `overlay | header | body | footer` are *parts* (all present at once), not states. The VariantGroup tab strip defaults its label to "Element" (neutral). If you label tabs anywhere, use **part** for structure and **state** for runtime conditions. Never call a footer a state.
- **Do not call interaction states "option states" or "selected states"** in the UI. `selected` is a *component* state.

Token naming consequence:

```
--mywidget-disabled-surface          ✓  component-state-level
--mywidget-option-disabled-surface   ✗  implies disabled is an interaction state
--mywidget-option-hover-surface      ✓  default-component-state, hover-interaction
--mywidget-selected-hover-surface    ✓  selected-component-state, hover-interaction
--mywidget-selected-disabled-text    ✗  selected-disabled does not exist
```

## User-facing copy

Strings you author for the editor UI use periods and commas, never em-dashes, which read as an AI tell. This applies to `title=` and `description=` on `ComponentEditorBase`, token row labels, info popovers, and any text inside `previewActions` / `canvasToolbarExtras` snippets. Code comments are unaffected.

Custom chrome inside an editor snippet is rare, since `ComponentEditorBase` and `VariantGroup` carry the standard chrome. Where you add some, keep it greyscale (no accent colours) and reference heading sizes via `--ui-font-size-md` / `-lg` / `-2xl` rather than pixel literals.

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

## Extensions

Read the sketch reference for every component; the other two only when they apply.

- `references/linked-siblings.md`: variants that share base properties and should move together (Badge, Card, SegmentedControl).
- `references/intrinsics.md`: structural or display choices that are not token values (an alignment, an element's visibility), where the runtime default and the editor's read-back must agree.
- `references/sketch-mode.md`: joining the sketch layer. **Every component needs this.** One class on the root, the five `--sketch-*` values the layer draws with, and the list of what it takes over from the element. Skip it and the component stays crisp while the page around it goes hand-drawn.

## Verification checklist

Step 6 of the recipe is the static gate: `npx live-tokens check-component <id>` at exit 0, with `--strict` clean or its warnings resolved. It enforces the file layout, the `:global(:root)` block, the suffix vocabulary, state-before-property, the terminal disabled state, public imports, that every token an editor row names is declared in the runtime, that every default reads a theme token, and that the id is registered through `bootLiveTokens({ components: [{ id }] })` or a direct `registerComponent({ id })` call.

**Then run the registry contract test.** `checkRegistryEntry`, from `@motion-proto/live-tokens/component-editor/contract`, takes one registry entry and returns a violation line per failure, so a suite over your own components is a `describe.each` and one call. It verifies that the registration resolves to a real `sourceFile` and a non-empty schema, that schema variables are unique, that every editable token is declared in the runtime `<style>` block and seeded in `component-configs/<id>/default.json`, that a token declaring `minOpacity` seeds at or above its floor, and that `setComponentAlias` round-trips the alias through the slice. The test file and its path options are in `references/contract-tests.md`. Inside the package, `registryContract.test.ts` runs that same check over `builtInRegistry`, so a first-party component is covered the moment it lands there.

**If your component declares `intrinsics`, the intrinsics contract test covers it too.** `intrinsicsContract.test.ts` asserts, per (intrinsic, variant), that the runtime `:global(:root)` declares a default, that it is one of the spec's `values`, and that the editor's `default` equals it. This is what would have caught a getter defaulting to `center` while `:global(:root)` says `start`.

Finally navigate to `/live-tokens/components` and confirm the runtime behaviours no static check can see:

- [ ] The new component appears in the nav rail under the **CUSTOM** group (system entries above, custom below the labeled divider).
- [ ] Token rows render. Color pickers, radius selectors, font selectors all work.
- [ ] Linked-block (if your component has linked siblings): shared rows appear with the link toggle. Changing the linked value broadcasts across every variant.
- [ ] `component-configs/<id>/default.json` is derived from the `:global(:root)` block at boot. Save writes `_working.json`, the unsaved buffer the open theme captures; Save As also writes a named preset.
- [ ] Reset returns each variable to its `:global(:root)` default.
- [ ] Boot validation is clean (no warnings about the component being missing from the server scan, or about disk-vs-registry drift).
- [ ] Switch Sketch mode on in the editor and walk the checklist at the end of `references/sketch-mode.md`. The component is drawn in every variant and on hover, in its own colours, not crisp and not wearing another part's palette. Switch it off again and the component is unchanged.
