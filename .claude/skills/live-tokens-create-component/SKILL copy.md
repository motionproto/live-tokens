app---
name: live-tokens-create-component
description: Create a custom Svelte component in a @motion-proto/live-tokens project with semantic properties that reference the existing theme tokens, a live editor, and registration. Use for a new component or to make an existing component editable. Use live-tokens-create-page to place existing components on a page.
---

# Creating a Live Tokens component

Create a component whose structure and behavior serve the user's purpose. Give each editable visual property a semantic name and assign its default from the design system's existing token vocabulary. Deliver the runtime component, its editor, and its registration together.

## Design model

Live Tokens has two token layers:

| Layer | Responsibility | Example |
|---|---|---|
| Theme tokens | Define the available colors, typography, geometry, and motion values. Theme presets change these values. | `--space-16`, `--radius-md`, `--surface-neutral` |
| Component properties | Name the visual roles within a component and reference theme tokens. Component presets record these assignments. | `--statcard-frame-padding: var(--space-16)` |

The rendering chain is **theme token → semantic component property → CSS declaration**. The editor changes the assignment; the runtime reads the property. Keep the assignment as a token reference so a theme change reaches the component.

A property describes its purpose: `--statcard-value-text`, `--statcard-frame-radius`, `--statcard-label-font-size`. Its name stays stable when its assigned color or size changes. Use role names such as `surface` and `text`, and full words for component ids and parts.

Build distinct components through their anatomy, proportions, content hierarchy, behavior, and choice of existing tokens. Create only the variants and states the task requires. Keep the theme vocabulary intact during component creation; a new theme token belongs in a separate theme change.

Component props carry content and behavior, such as `value`, `label`, `selected`, and callbacks. Semantic CSS properties carry the editable appearance. Expose variants through props when they represent meaningful component choices.

## Source inspection

Read the project's `package.json`, `live-tokens.config.json`, and application bootstrap before writing files. Run `npx live-tokens components` to inspect the catalogue and `npx live-tokens components <id>` for a candidate's props. Use an existing component when it fulfills the request; create a new component when the request needs distinct structure or behavior.

Locate the installed package at `node_modules/@motion-proto/live-tokens`. When working inside the Live Tokens repository, use the repository root instead. Read these sources from that root:

- `src/system/styles/tokens.css` for the available default tokens, and the project's theme files for overrides. Treat `tokens.generated.css` as generated output.
- `src/system/components/<Name>.svelte` and `src/editor/component-editor/<Name>Editor.svelte` for a matching runtime/editor pair. Use `Toggle` for interaction states, `Badge` for variants and linking, and `Card` for separate text and container parts.
- `src/editor/core/components/aliasKinds.ts` for the suffixes that select editor controls.
- `src/editor/component-editor/index.ts` and the package exports for available authoring APIs.

Use the current source as the contract when older prose differs. For example, the current brand color family uses `--surface-brand`, `--border-brand`, and `--text-brand`; `--text-primary` names neutral primary text.

Read [references/token-naming.md](references/token-naming.md) when choosing property suffixes. Read the other references at the steps that need them.

## Property design

Before implementation, identify the component's parts, text roles, variants, and states. Make a short property map that connects each editable role to an existing default token and the CSS property it controls. Keep separate roles independent even when they start with the same value.

| Component property | Default assignment | CSS use |
|---|---|---|
| `--statcard-frame-surface` | `--surface-neutral` | `background` |
| `--statcard-frame-border` | `--border-neutral` | `border-color` |
| `--statcard-frame-border-width` | `--border-width-1` | `border-width` |
| `--statcard-frame-radius` | `--radius-md` | `border-radius` |
| `--statcard-frame-padding` | `--space-16` | `padding` |
| `--statcard-value-text` | `--text-primary` | `color` |
| `--statcard-label-text` | `--text-secondary` | `color` |

Choose defaults from tokens that exist in the target project. Prefer the color role that matches the purpose: surfaces for fills, borders for outlines, and text tokens for text. Select geometry from the relevant spacing, radius, stroke, and icon scales. Give each text role its own family, size, weight, line height, and letter spacing properties, using existing typography tokens.

Name properties with the component id first and the property suffix last:

```text
--<componentId>-<part-or-variant>[-<state>][-<element>]-<property>
```

Use a lowercase id with no dashes that matches the runtime filename: `StatCard.svelte` has id `statcard`. Include the segments that distinguish the role. Follow the closest shipped component for components with both variants and parts. Put state segments before the final property: `--statcard-frame-hover-surface`.

The suffix selects the editor control. Use `-surface` for a fill, `-border` for border color, `-border-width` for stroke thickness, `-radius` for corners, and `-padding` or `-gap` for spacing. Use the full typography suffixes such as `-font-size`. Verify other suffixes against `aliasKinds.ts`.

## Runtime component

Create `src/system/components/StatCard.svelte`. Use Svelte 5 props and snippets, semantic HTML, and the behavior the task requires. Start with a short HTML comment that states the component's purpose, suitable uses, and an alternative for uses outside its scope. The component CLI reads this comment and `interface Props` to describe the component.

Declare every editable property explicitly in a literal `:global(:root)` block. The discovery parser reads the Svelte source to seed `component-configs/<id>/default.json`; it needs concrete property names. Keep SCSS loops and interpolation out of this declaration block.

```svelte
<style>
  :global(:root) {
    --statcard-frame-surface: var(--surface-neutral);
    --statcard-frame-border: var(--border-neutral);
    --statcard-frame-border-width: var(--border-width-1);
    --statcard-frame-radius: var(--radius-md);
    --statcard-frame-padding: var(--space-16);
    --statcard-value-text: var(--text-primary);
    --statcard-label-text: var(--text-secondary);
  }

  .statcard {
    display: grid;
    background: var(--statcard-frame-surface);
    border: var(--statcard-frame-border-width) solid var(--statcard-frame-border);
    border-radius: var(--statcard-frame-radius);
    padding: var(--statcard-frame-padding);
  }

  .value { color: var(--statcard-value-text); }
  .label { color: var(--statcard-label-text); }
</style>
```

This excerpt shows the assignment chain. Add typography, spacing, and other properties from the component's actual property map.

Route editable styling through component properties. Keep structural CSS such as `display: grid`, `width: 100%`, and `align-items: center` in the component's layout rules. Use token references for visual defaults. A token expression such as `calc(var(--space-64) * 4)` can express a dimension beyond the scale when the component needs it; prefer a direct assignment when a preset value fits.

For persistent structural choices such as alignment or visibility, read [references/intrinsics.md](references/intrinsics.md). Declare an `IntrinsicSpec`, mirror its default in `:global(:root)`, and register it through the `intrinsics` field. Keep these choices outside `allTokens`.

## Variants and states

Parts coexist, variants provide alternative presentations, and states reflect runtime conditions. Preserve those distinctions in both the component API and the editor.

Use the default state for shared geometry and typography. Add state properties for the values that change. Follow `Toggle` for a component state such as `on` with an interaction state such as `hover`. Live Tokens treats `disabled` as terminal: its editor fieldset is flat, and its tokens carry no combined hover or selected state.

Make the preview render the state whose properties the user edits. Pair each hover selector with a `.force-hover` selector and expose a class prop so the editor can show hover without a pointer. Preserve native disabled behavior, keyboard operation, and visible focus for interactive controls.

For action emphasis, use `primary` for the single action that completes the page's main task, `secondary` for supporting or directly related actions, and `outline` for unrelated or informational actions. Use `danger` for actions that destroy saved work. The page chooses the one primary action; a component supplies the relevant variants.

## Component editor

Create `src/system/components/StatCardEditor.svelte` beside the custom runtime file. Shipped editors use a separate internal directory; custom components keep both files together.

In `<script module lang="ts">`, declare `const component = 'statcard'`, define the token lists, and export their flat union as `allTokens: Token[]`. Each editable runtime property has one schema entry with the exact variable name. Use `element` to group rows by part and a short `label` to name the property.

```ts
import type { Token } from '@motion-proto/live-tokens/component-editor';

const component = 'statcard';
const states: Record<string, Token[]> = {
  default: [
    { label: 'surface', element: 'frame', variable: '--statcard-frame-surface' },
    { label: 'padding', element: 'frame', variable: '--statcard-frame-padding' },
    { label: 'text', element: 'value', variable: '--statcard-value-text' },
    { label: 'text', element: 'label', variable: '--statcard-label-text' },
  ],
};
export const allTokens: Token[] = Object.values(states).flat();
```

Expand this illustrative schema to cover the full property map. In the instance script, import the runtime component and the editor primitives. Mount `ComponentEditorBase` with `component` and `tokens={allTokens}`, then a `VariantGroup` for each variant with its `states`, `component`, and runtime preview. Follow the matching shipped editor for the exact snippet API.

Use public imports in consumer projects:

```ts
import { ComponentEditorBase, VariantGroup } from '@motion-proto/live-tokens/component-editor';
import StatCard from './StatCard.svelte';
```

Read shipped source files for examples; import package APIs through their public exports. Use `--ui-*` tokens for custom editor chrome and let the runtime preview consume the theme through its component properties.

When variants should share properties, read [references/linked-siblings.md](references/linked-siblings.md). Declare intentional sibling sets with `groupKey`, enable the linked controls with `canBeLinked`, and wire the linked block using the shipped helpers. Scope keys to the role: `value-font-size` and `label-font-size` stay independent. When using `buildTypeGroup*` helpers, pass `{ component, variants }` so they derive keys for each slot.

## Registration and persistence

Add the custom component to the existing `bootLiveTokens` call, preserving the project's other registrations and setup:

```ts
import StatCardEditor, { allTokens as statCardTokens } from './system/components/StatCardEditor.svelte';

bootLiveTokens(App, '#app', {
  components: [{
    id: 'statcard',
    label: 'Stat Card',
    icon: 'fas fa-chart-simple',
    sourceFile: 'src/system/components/StatCard.svelte',
    editorComponent: StatCardEditor,
    schema: statCardTokens,
  }],
});
```

`bootLiveTokens` registers components after editor initialization and before theme initialization. Use that registration window. For a manual bootstrap, follow the package initialization order and register before mounting the app. Choose a unique id so the registration preserves built-in entries.

The runtime root declarations supply the initial assignments. The plugin derives `default.json`; editor saves write `_working.json`, and Save As creates a named preset. Preserve token references through this flow. Verify the project's configured data path rather than creating a second persistence mechanism.

For a first-party addition inside the Live Tokens package, follow the internal layout instead: runtime in `src/system/components`, editor in `src/editor/component-editor`, and an entry in `builtInRegistry` in `src/editor/component-editor/registry.ts`. Update the built-in id union and catalogue through the repository's existing conventions.

## Rendering integration

Read [references/sketch-mode.md](references/sketch-mode.md) and integrate the component's painted parts with Sketch mode. Custom components use the reserved sketch classes and bind the sketch properties to their own semantic properties. Choose a wrapper that accommodates the layer's positioning, overflow, and pseudo-element requirements. First-party components add the corresponding `PartSpec` entries.

For a fixed overlay, read [references/fixed-overlays.md](references/fixed-overlays.md) and portal the layer to `body`. Follow the existing container pattern when the component owns typography inside a content snippet.

## Verification

Run `npx live-tokens check-component <id> --strict --json`. Inside the package repository, use `node bin/cli.mjs check-component <id> --strict --json`. Resolve findings and rerun until the command passes. Run the project's Svelte checks and the build or tests that cover the new behavior.

Read [references/contract-tests.md](references/contract-tests.md) and verify the registry entry with `checkRegistryEntry`. The contract checks registration, unique schema variables, runtime declarations, seeded defaults, and alias round trips. Include intrinsic checks when the component declares intrinsics.

Open `/live-tokens/components` and verify:

- The component appears under Custom, or among system components for a first-party addition.
- Each property has the correct editor control and changes the matching runtime part.
- Preview variants and states match the controls; keyboard and pointer behavior work.
- Linked properties change together, and separate roles remain independent.
- Save and reload retain assignments. Reset restores runtime defaults.
- Theme changes reach every property that references a theme token.
- Sketch mode renders each painted part correctly and restores the normal appearance when switched off.

Report the files, component id, available props, and verification results. State any checks the environment prevented you from running.
