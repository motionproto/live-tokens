---
name: live-tokens-create-component
description: Create an editable component for a @motion-proto/live-tokens project. A component is a runtime Svelte file, an editor Svelte file, and one registration. The runtime file declares one semantic property per editable CSS property and assigns each an existing design token. The property names are semantic, based on function, and reuse the names of the existing components. Use when live-tokens-pick-component finds no suitable component, or the user asks for a new component. Use when the user asks to make an existing Svelte component editable in the live-tokens editor. For page integration, read live-tokens-create-page.
---

# Creating a component for a live-tokens project

Create a component whose structure and behavior serve the user's purpose. Give each editable visual property a semantic name. Assign its default from the existing design tokens. Deliver the runtime file, the editor file, and the registration together.

## Design model

A live-tokens project has two layers.

| Layer | Responsibility | Example |
|---|---|---|
| Design tokens | Name the available colors, typography, geometry, and motion values. A theme sets the values. | `--space-16`, `--radius-md`, `--surface-neutral` |
| Semantic properties | Name the visual roles within a component and reference tokens. A component config records these assignments. | `--statcard-padding: var(--space-16)` |

A token is assigned to a property, and a CSS declaration reads the property. The editor changes the assignment; the runtime reads the property. Keep the assignment a token reference, so a theme change reaches the component.

A property describes its purpose: `--statcard-value`, `--statcard-radius`, `--statcard-label-font-size`. Its name stays stable when its assigned color or size changes. Use role names such as `surface` and `text`. Use full words for component ids and parts.

A component is distinct in its anatomy, its proportions, its content hierarchy, and its behavior. Its appearance comes from the existing tokens. Create only the variants and states the task requires. The tokens stay as they are; a new token is a separate change to the design system.

Props carry content and behavior: a value, a label, a callback. Properties carry the editable appearance. When a variant is a choice the page makes, expose it as a prop.

## Source inspection

Before writing a file:

1. Read the project's `package.json`, `live-tokens.config.json`, and `src/main.ts`.
2. Run `npx live-tokens components`. The list holds every component the project has, with its variants and usage comment. `npx live-tokens components <id>` prints one component's props.
3. Run `npx live-tokens tokens --family <name>` for each family the component will use. Those names are the tokens a property can reference.
4. Read a shipped runtime and editor pair: `Toggle` for interaction states, `Badge` for variants and linked values, `Card` for text and container parts.
5. Read `references/token-naming.md` for the suffixes that select editor controls.

The shipped sources are in `node_modules/@motion-proto/live-tokens/src/`: the runtime at `system/components/<Name>.svelte`, the editor at `editor/component-editor/<Name>Editor.svelte`. Inside the live-tokens repository, read them from the repository root. The source is the contract.

## Property design

Before writing a file, identify the component's parts, text roles, variants, and states. Then write a property map: one row per editable role, with the token it is assigned and the CSS property it controls. Keep separate roles independent even when they start with the same value.

| Property | Assigned token | CSS use |
|---|---|---|
| `--statcard-surface` | `--surface-neutral` | `background` |
| `--statcard-border` | `--border-neutral` | `border-color` |
| `--statcard-border-width` | `--border-width-1` | `border-width` |
| `--statcard-radius` | `--radius-md` | `border-radius` |
| `--statcard-padding` | `--space-16` | `padding` |
| `--statcard-value` | `--text-primary` | `color` of the value |
| `--statcard-value-font-size` | `--font-size-2xl` | `font-size` of the value |
| `--statcard-label` | `--text-secondary` | `color` of the label |

Assign from the tokens the project has. Match the token family to the role: `--surface-*` for a fill, `--border-*` for an outline, `--text-*` for text, and the space, radius, border-width, and icon-size scales for geometry. Give each text role five properties: `-font-family`, `-font-size`, `-font-weight`, `-line-height`, and `-letter-spacing`.

A property name starts with the component id and ends with the property suffix. Use this shape for part-specific states:

```text
--<componentId>[-<variant>][-<part>][-<state>]-<property>
```

- `componentId` is the runtime file name in lowercase with no dashes: `StatCard.svelte` is `statcard`.
- `variant` is present when the component has more than one: `--card-default-surface`, `--card-bare-surface`. A component with one variant has no variant segment: `--toggle-track-surface`.
- `part` names a region inside the component: `header`, `body`, `track`, `thumb`. The editor's `element` tag groups rows in the panel and is never a name segment.
- `state` comes before the property: `--card-hover-border`. `disabled` is terminal, so no name pairs `disabled` with another state.
- `property` is the suffix, and the suffix selects the editor control: `-surface` for a fill, `-border` for a border color, `-border-width` for a stroke, `-radius` for corners, `-padding` and `-gap` for spacing, and the five typography suffixes. `references/token-naming.md` lists every suffix.

For a state that affects several parts, follow Toggle: `--toggle-on-hover-track-surface`. State segments precede the affected part.

Name a role as the shipped component that paints the same thing names it. A fill is `-surface` in every shipped component. A knob is `-thumb`. A text role's color sits on the role's own name, `-title`, `-body`, `-label`, `-value`, and its typography hangs off that name: `--card-default-title-font-size`. A component with one text role uses `-text`: `--badge-primary-text`.

## Runtime component

Create `src/system/components/StatCard.svelte`. `check-component` finds a runtime there only. A component in another directory is listed by `components` and `report` when that directory is named in `"componentDirs"` in `live-tokens.config.json`, and `check-component` does not check it. Use Svelte 5 props and snippets, semantic HTML, and the behavior the task requires.

Open the file with an HTML comment in the shape every shipped component carries. `npx live-tokens components` prints the comment beside the id, and `components <id>` prints the props.

```svelte
<!--
  StatCard.svelte. A figure with its label.
  Use for: one number the reader takes in at a glance.
  Not for: a set of records (Table); a titled block of content (Card).
-->
```

Declare every editable property in a literal `:global(:root)` block, each assigned a token. The plugin parses the Svelte source to seed `component-configs/<id>/default.json`, so the block holds plain declarations with no SCSS loop or interpolation.

```svelte
<style>
  :global(:root) {
    --statcard-surface: var(--surface-neutral);
    --statcard-border: var(--border-neutral);
    --statcard-border-width: var(--border-width-1);
    --statcard-radius: var(--radius-md);
    --statcard-padding: var(--space-16);
    --statcard-value: var(--text-primary);
    --statcard-value-font-size: var(--font-size-2xl);
    --statcard-label: var(--text-secondary);
  }

  .statcard {
    display: grid;
    background: var(--statcard-surface);
    border: var(--statcard-border-width) solid var(--statcard-border);
    border-radius: var(--statcard-radius);
    padding: var(--statcard-padding);
  }

  .value { color: var(--statcard-value); font-size: var(--statcard-value-font-size); }
  .label { color: var(--statcard-label); }
</style>
```

The excerpt shows the chain for part of the property map. Every editable value reads a property. Structural CSS (`display: grid`, `width: 100%`, `align-items: center`) stays in the layout rules. A value beyond a scale is a token expression: `calc(var(--space-64) * 4)`. A property that carries a structural choice, an alignment or a visibility, is an intrinsic: read `references/intrinsics.md`.

## Variants and states

A component has three kinds of division. Keep them apart in the props, the names, and the editor.

| Kind | Meaning | Example |
|---|---|---|
| Part | Regions present at once | Dialog's overlay, header, body, footer |
| Variant | Alternative presentations the page chooses | Badge's primary, danger |
| State | A runtime condition | Toggle's on, hover, disabled |

States have two axes. A component state is one of a set that excludes the others: default, selected (or on), disabled. An interaction state layers on a component state: default, hover, and later focus or active. `disabled` is terminal: no other state layers on it, in the names or in the editor.

The default state carries the shared geometry and typography. A state adds properties only for the values that change: `--toggle-on-track-surface`, `--toggle-on-hover-track-surface`.

The preview renders the state being edited. Pair each `:hover` selector with a `.force-hover` selector and expose a `class` prop, so the editor shows hover without a pointer. Keep native disabled behavior, keyboard operation, and visible focus on an interactive control.

A component supplies its variants. The page chooses the one primary action.

## Component editor

Create `src/system/components/StatCardEditor.svelte` beside the runtime file. The editor has three parts.

1. A `<script module>` block exports `component`, the id, and `allTokens`, one row per property in the map. A row is `{ label, variable, element? }`; `element` groups rows in the panel by part, and `label` names the property in the row.
2. The instance script imports the runtime component and the editor primitives from the package's public paths, and maps the state being edited to preview props.
3. The markup mounts `ComponentEditorBase` with one `VariantGroup` per variant, each rendering a preview.

```svelte
<script module lang="ts">
  import type { Token } from '@motion-proto/live-tokens/component-editor';

  export const component = 'statcard';
  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface', element: 'frame', variable: '--statcard-surface' },
      { label: 'border', element: 'frame', variable: '--statcard-border' },
      { label: 'border width', element: 'frame', variable: '--statcard-border-width' },
      { label: 'radius', element: 'frame', variable: '--statcard-radius' },
      { label: 'padding', element: 'frame', variable: '--statcard-padding' },
      { label: 'text', element: 'value', variable: '--statcard-value' },
      { label: 'font size', element: 'value', variable: '--statcard-value-font-size' },
      { label: 'text', element: 'label', variable: '--statcard-label' },
    ],
  };
  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import { ComponentEditorBase, VariantGroup } from '@motion-proto/live-tokens/component-editor';
  import StatCard from './StatCard.svelte';
</script>

<ComponentEditorBase {component} title="Stat Card" tokens={allTokens}>
  <VariantGroup name="statcard" title="Stat Card" {states} {component}>
    <StatCard value="1,204" label="Sessions" />
  </VariantGroup>
</ComponentEditorBase>
```

The shipped editor for the closest component gives the preview snippet for a component with states. Custom chrome in an editor takes `--ui-*` tokens and no accent color; its copy uses periods and commas, never em-dashes.

When variants share a value, read `references/linked-siblings.md`. A `groupKey` is scoped to the text role: `value-font-size` and `label-font-size` stay separate keys. A `buildTypeGroup*` helper takes `{ component, variants }` so it derives one key per role.

## Registration

Add the component to the project's `bootLiveTokens` call in `src/main.ts`, beside any registration already there. The id is unique; a registration that repeats a shipped id replaces that component.

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

A component that declares intrinsics adds `intrinsics` to the entry. When the app mounts by hand, call `registerComponent({ id: 'statcard', ... })` before `mount(App, ...)`. `check-component` finds the registration by the id literal inside the call.

At boot the plugin reads the `:global(:root)` block and writes `component-configs/<id>/default.json`, one token per property. An edit in the editor writes `_working.json`; Save As writes a named config. The assignments stay token references through that flow.

Inside the live-tokens repository, a first-party component keeps its editor in `src/editor/component-editor/` and takes an entry in `builtInRegistry` in `src/editor/component-editor/registry.ts`.

## Sketch mode and overlays

Every component joins the sketch layer: read `references/sketch-mode.md`. A suitable root or inner wrapper carries a reserved class and names five `--sketch-*` values from its own properties. Preserve positioning, clipping, and pseudo-elements as the reference specifies. A first-party component adds a `PartSpec` row instead.

A fixed overlay portals to `<body>`: read `references/fixed-overlays.md`. A container that owns the typography of its content follows `Card` and its `prose` prop.

## Verification

1. Run **live-tokens-check-compliance** and address its findings with **live-tokens-fix-findings**. Then run `npx live-tokens check-component <id> --strict --json`. Inside the live-tokens repository, run `node bin/cli.mjs check-component <id> --strict --json`. Each finding carries a rule id and a line; `--off=<rule>` silences a rule for one run. Fix every finding and rerun until exit 0.
2. Run the project's Svelte check and its build.
3. Verify the registry entry with `checkRegistryEntry`: read `references/contract-tests.md`. The contract holds registration, unique schema variables, runtime declarations, seeded defaults, and alias round trips. For intrinsics, also compare each spec default with the runtime declaration and permitted values. The package covers first-party intrinsics in `src/editor/component-editor/intrinsicsContract.test.ts`.
4. Open `/live-tokens/components` and check each line below.
5. Reply with the files, the component id, the props, and the results of steps 1 to 4, naming any check the environment prevented.

A finding maps to the section that fixes it.

| Rule | Section |
|---|---|
| `unknown-suffix`, `state-after-property`, `disabled-is-terminal` | Property design, the name |
| `default-not-token`, `color-literal`, `dimension-literal`, `unknown-token-ref` | Property design, the assigned token |
| `invalid-id`, `missing-file`, `missing-root-block`, `no-tokens` | Runtime component |
| `missing-component-const`, `missing-all-tokens`, `phantom-editor-token`, `phantom-link`, `deep-import` | Component editor |
| `missing-registration` | Registration |

In the editor:

- A custom component appears under CUSTOM. A first-party component appears among the system entries.
- Each property has the control its suffix selects, and changes the matching part.
- The preview matches the state being edited. Keyboard and pointer behavior work.
- Linked properties change together. Separate roles stay independent.
- An edit persists across a reload. Reset restores the `:global(:root)` defaults.
- A theme change reaches every property.
- With Sketch mode on, every painted part is drawn in its own colors. With it off, the component is unchanged.

Then place the component on a page with **live-tokens-create-page**.
