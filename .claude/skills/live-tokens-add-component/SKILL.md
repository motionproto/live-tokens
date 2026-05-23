---
name: live-tokens-add-component
description: Author a new component for a project that uses @motion-proto/live-tokens. Covers the runtime Svelte file, the editor Svelte file, registerComponent() wiring, public-imports rule, naming conventions, state model, and verification. Use when the user asks to add a component to a live-tokens project, make a Svelte component editable in the live-tokens editor, extend the live-tokens system with a new tokenized component, or create a tokenized [Thing] component.
---

# Authoring a component for a live-tokens project

This skill teaches how to add a new editable component to a project that consumes `@motion-proto/live-tokens`. The end state: a runtime Svelte component, an editor Svelte component, one `registerComponent()` call, and a `/components` page entry under the **CUSTOM** group with full token editing, linked-block sharing, and persistence.

The skill has two pillars. Read both before writing any code.

## Pillar 1 — Token discipline

Every editable property is a CSS custom property declared in `:global(:root)` inside the runtime component's `<style>` block. Defaults reference theme tokens; never raw values. The token surface is *meaningful*: one row per state, per part, per property. The dev plugin parses `:global(:root)` to seed `component-configs/<id>/default.json` on first save. Variables not declared in `:global(:root)` cannot be edited.

### Naming scheme

```
--<componentId>-<part>[-<state>][-<element>]-<property>
```

- **`componentId`** — the literal id passed to `registerComponent()`. Lowercase, no dashes, no abbreviations. The component file id matches: `MyWidget.svelte` → id `mywidget`.
- **`part`** — which sub-region of the component. Examples: `bar`, `option`, `selected`, `track`, `header`, `body`, `footer`, `overlay`, `value`, `label`.
- **`state`** — optional interaction or component state. State comes **before** the property, never after. Examples: `hover`, `disabled`, `selected`, `focus`.
- **`element`** — optional sub-element within a part. Examples: `dot`, `icon`, `label`, `text`.
- **`property`** — always last. Either a theme role (`surface`, `border`, `text`, `icon`, `label`, `fill`) or a CSS property name (`radius`, `border-width`, `padding`, `font-family`, `font-weight`, `font-size`).

### No abbreviations

- `bg` → `surface`. `fg` → `text`. Component ids are never abbreviated: `segmentedcontrol` not `sc`, `mywidget` not `mw`.

### Property suffix vocabulary

| Suffix         | Meaning                                                      |
|----------------|--------------------------------------------------------------|
| `-surface`     | Fill / background color                                       |
| `-border`      | Border color                                                 |
| `-text`        | Text color                                                   |
| `-icon`        | Icon color                                                   |
| `-label`       | Label text color                                             |
| `-fill`        | Inner fill (distinct from outer surface)                     |
| `-radius`      | Corner radius                                                |
| `-border-width`| Stroke thickness                                             |
| `-font-family` | Font family reference                                        |
| `-font-weight` | Font weight reference                                        |
| `-font-size`   | Font size reference                                          |
| `-thickness`   | Alternative to `-width` when fallback siblings would collide |

### State order matters

State comes **before** the property:

```
--mywidget-button-hover-surface   ✓  state before property; siblings on `-surface`
--mywidget-button-surface-hover   ✗  breaks sibling matching and reads oddly
```

### Default values reference theme tokens

```
--mywidget-primary-surface: var(--surface-primary);     ✓
--mywidget-primary-surface: #6a4ce8;                    ✗  raw value, can't be re-pointed
```

Text token aliases use the neutral text scale by default: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted`, `--text-disabled`. Family-tinted text is `--text-primary-color`, `--text-accent`, `--text-success`, etc. There is no `--text-neutral` — neutral text is `--text-primary`.

### Linked siblings (the link toggle)

Tokens that share a `groupKey` form a sibling set. Declaring `canBeLinked: true` plus a `groupKey` in the editor's token list creates a link toggle that broadcasts one value across every sibling. Linkage is **dev-declared**: you author it when you build the component; users opt out of an existing link per-property, never add or reshape links. Do not expose UI for users to add siblings or mark properties as linkable.

For typography on multi-slot components, the `groupKey` must include the slot prefix:

```
groupKey: 'value-font-family', 'label-font-family'   ✓  separate link trees per slot
groupKey: 'font-family'                              ✗  silently links value and label together
```

Single-slot components can use a bare typography `groupKey` (`font-family`). Add the slot prefix the moment a second typography slot appears.

## Pillar 2 — Editor patterns

The editor file mounts inside `ComponentEditorBase` and lays out tokens via `VariantGroup` per variant. Use the shared scaffolding components from `@motion-proto/live-tokens/component-editor`.

### State model

Components have two state axes. Don't mix them.

- **Component states** — mutually exclusive top-level fieldsets: `default`, `selected`, `disabled` (names vary by component). One fieldset per component state.
- **Interaction states** — a select inside each component-state fieldset: `default`, `hover`. (Add `focus`/`active` later if needed.)

Rules:

- **Disabled is terminal.** A disabled component can't be hovered or focused. The `disabled` fieldset is flat — no interaction selector.
- **`selected-disabled` is impossible.** Don't author tokens or fieldsets for it.
- **Don't call interaction states "option states" or "selected states"** in the UI. `selected` is a *component* state. Interaction states are interaction states.

Token naming consequence:

```
--mywidget-disabled-surface          ✓  component-state-level
--mywidget-option-disabled-surface   ✗  implies disabled is an interaction state
--mywidget-option-hover-surface      ✓  default-component-state, hover-interaction
--mywidget-selected-hover-surface    ✓  selected-component-state, hover-interaction
--mywidget-selected-disabled-text    ✗  selected-disabled doesn't exist
```

### Parts vs states

A component's structural sub-regions (Dialog's `overlay | header | body | footer`) are **parts**, not states. All present simultaneously. The VariantGroup tab strip defaults its label to "Element" — a neutral noun that fits both — but if you label individual tabs anywhere, use **part** when describing structure and **state** when describing runtime conditions. Never call a footer a state.

### Editor chrome (greyscale, pill buttons, no em-dashes)

The editor chrome is greyscale only. Never introduce accent colors (blue, etc.) for buttons, links, or hover states. The sole exception is file-state indicators. Buttons in editor chrome are pill-shaped with a subtle white gradient. Section underlines are bright (`--ui-border-high`); sub-element outlines stay dim (`--ui-border-faint`).

Editor heading scale (semantic):

| Role | Token | Treatment |
|---|---|---|
| Body | `--ui-font-size-md` | — |
| Section | `--ui-font-size-2xl` | semibold primary, 2px `--ui-border-high` underline |
| Group | `--ui-font-size-lg` | semibold secondary |
| Eyebrow | `--ui-font-size-xs` | semibold tertiary, uppercase, letter-spacing |

Reference tokens by role; never hardcode pixel sizes.

**User-facing copy uses periods and commas, no em-dashes.** Em-dashes read as an AI tell. Restructure sentences. This applies to titles, descriptions, info popovers, button labels, and dialog body text. (Code comments are unaffected.)

## Project structure

Co-locate the runtime and editor files in `src/system/components/` in the consumer project:

```
src/system/components/
  MyWidget.svelte          # runtime — declares CSS vars in :global(:root)
  MyWidgetEditor.svelte    # editor — exports `allTokens`, mounts via ComponentEditorBase
```

Register the component in `src/main.ts` before `mount(App, ...)`:

```ts
import { registerComponent } from '@motion-proto/live-tokens';
import MyWidgetEditor, { allTokens as myWidgetTokens } from './system/components/MyWidgetEditor.svelte';

registerComponent({
  id: 'mywidget',
  label: 'My Widget',
  icon: 'fas fa-magic',
  sourceFile: 'src/system/components/MyWidget.svelte',
  editorComponent: MyWidgetEditor,
  schema: myWidgetTokens,
});
```

The plugin's `componentsSrcDir` defaults to `src/system/components/` and scans runtime `.svelte` files. The scanner ignores editors because they don't declare `:global(:root)`. On first save in the editor, `component-configs/<id>/default.json` is seeded automatically from the runtime file.

## Public imports only

Imports in your runtime, editor, and `main.ts` must come from exactly two paths:

- `@motion-proto/live-tokens`
- `@motion-proto/live-tokens/component-editor`

Never deep-import `node_modules/@motion-proto/live-tokens/src/...`. Doing so couples your project to internal refactors and is not a supported API.

### Legal imports from `@motion-proto/live-tokens`

```ts
import {
  registerComponent,
  editorState,
  setComponentAlias,
  setComponentConfig,
  registerComponentSchema,
  // plus the wider editor init API: configureEditor, initEditorStore, etc.
} from '@motion-proto/live-tokens';

import type {
  RegisterComponentEntry,
  RegistryEntry,
  ComponentId,
} from '@motion-proto/live-tokens';
```

### Legal imports from `@motion-proto/live-tokens/component-editor`

```ts
import {
  ComponentEditorBase,
  VariantGroup,
  LinkedBlock,
  TypeEditor,
  TokenLayout,
  buildSiblings,
  computeLinkedBlock,
  withLinkedDisabled,
  buildTypeGroupTokens,
} from '@motion-proto/live-tokens/component-editor';

import type {
  Token,
  Sibling,
  LinkedToken,
  LinkedGroup,
  LinkedBlockResult,
  ComponentSection,
} from '@motion-proto/live-tokens/component-editor';
```

If you find yourself needing something not in this list, stop. Either restructure the component to avoid the dependency, or file an issue against `@motion-proto/live-tokens` to add the export. Do not deep-import.

## 4-step recipe

### Step 1 — Runtime component

Write `src/system/components/MyWidget.svelte`. Declare every editable slot in `:global(:root)` with a default that references a theme token.

### Step 2 — Editor component

Write `src/system/components/MyWidgetEditor.svelte`. In a `<script module>` block:

- Declare `const component = 'mywidget';`
- Build the `Token[]` list for each variant × state combination.
- Export `allTokens: Token[]` (flat union of every token, used by `registerComponentSchema` and the linked-block).
- Build the `linkableContexts: Map<string, string>` for cross-variant link rows.

In the `<script>` block, mount `ComponentEditorBase` with one `VariantGroup` per variant.

### Step 3 — Register

Add a `registerComponent({ ... })` call to `src/main.ts` before `mount(App, ...)`. The schema-side-effect happens inside `registerComponent`, so you don't call `registerComponentSchema` separately.

### Step 4 — Verify

Open `/components`. The new component appears under the **CUSTOM** group in the nav rail. Token rows render. Aliases persist. Boot validation is clean.

## Worked example: Stat

A small `Stat` component with two variants (`primary`, `subtle`) and two interaction states (`default`, `hover`). Renders a number value above a label.

### Runtime: `src/system/components/Stat.svelte`

```svelte
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'subtle';
    value: string;
    label: string;
  }
  let { variant = 'primary', value, label }: Props = $props();
</script>

<div class="stat stat-{variant}">
  <span class="value">{value}</span>
  <span class="label">{label}</span>
</div>

<style>
  :global(:root) {
    /* primary */
    --stat-primary-surface: var(--surface-primary);
    --stat-primary-border: var(--border-primary);
    --stat-primary-radius: var(--radius-md);
    --stat-primary-padding: var(--space-16);
    --stat-primary-value-text: var(--text-primary);
    --stat-primary-value-font-family: var(--font-display);
    --stat-primary-value-font-size: var(--font-size-2xl);
    --stat-primary-value-font-weight: var(--font-weight-bold);
    --stat-primary-label-text: var(--text-secondary);
    --stat-primary-label-font-family: var(--font-sans);
    --stat-primary-label-font-size: var(--font-size-sm);
    --stat-primary-hover-surface: var(--surface-primary-high);

    /* subtle */
    --stat-subtle-surface: var(--surface-neutral);
    --stat-subtle-border: var(--border-neutral);
    --stat-subtle-radius: var(--radius-md);
    --stat-subtle-padding: var(--space-16);
    --stat-subtle-value-text: var(--text-primary);
    --stat-subtle-value-font-family: var(--font-display);
    --stat-subtle-value-font-size: var(--font-size-2xl);
    --stat-subtle-value-font-weight: var(--font-weight-bold);
    --stat-subtle-label-text: var(--text-tertiary);
    --stat-subtle-label-font-family: var(--font-sans);
    --stat-subtle-label-font-size: var(--font-size-sm);
    --stat-subtle-hover-surface: var(--surface-neutral-high);
  }

  .stat {
    display: inline-flex;
    flex-direction: column;
    gap: var(--space-4);
    border: 1px solid;
    transition: background 120ms ease;
  }

  .stat-primary {
    background: var(--stat-primary-surface);
    border-color: var(--stat-primary-border);
    border-radius: var(--stat-primary-radius);
    padding: var(--stat-primary-padding);
  }
  .stat-primary:hover { background: var(--stat-primary-hover-surface); }
  .stat-primary .value {
    color: var(--stat-primary-value-text);
    font-family: var(--stat-primary-value-font-family);
    font-size: var(--stat-primary-value-font-size);
    font-weight: var(--stat-primary-value-font-weight);
  }
  .stat-primary .label {
    color: var(--stat-primary-label-text);
    font-family: var(--stat-primary-label-font-family);
    font-size: var(--stat-primary-label-font-size);
  }

  .stat-subtle {
    background: var(--stat-subtle-surface);
    border-color: var(--stat-subtle-border);
    border-radius: var(--stat-subtle-radius);
    padding: var(--stat-subtle-padding);
  }
  .stat-subtle:hover { background: var(--stat-subtle-hover-surface); }
  .stat-subtle .value {
    color: var(--stat-subtle-value-text);
    font-family: var(--stat-subtle-value-font-family);
    font-size: var(--stat-subtle-value-font-size);
    font-weight: var(--stat-subtle-value-font-weight);
  }
  .stat-subtle .label {
    color: var(--stat-subtle-label-text);
    font-family: var(--stat-subtle-label-font-family);
    font-size: var(--stat-subtle-label-font-size);
  }
</style>
```

Things to notice:

- Every editable slot lives in `:global(:root)` with a default that references a theme token.
- `--stat-<v>-value-font-family` and `--stat-<v>-label-font-family` are slot-prefixed because there are two typography slots (`value` and `label`). The same applies to `-font-size`. The bare typography groupKey (`font-family`) would silently link them together.
- `--stat-<v>-hover-surface` is one row, one state. The hover background is one editable property; we don't author a full hover copy of every slot.

### Editor: `src/system/components/StatEditor.svelte`

```svelte
<script module lang="ts">
  import { buildSiblings, type Token } from '@motion-proto/live-tokens/component-editor';

  export const component = 'stat';
  const variants = ['primary', 'subtle'] as const;
  type Variant = typeof variants[number];
  const stateNames = ['default', 'hover'] as const;
  type StateName = typeof stateNames[number];

  function variantStateTokens(v: Variant, s: StateName): Token[] {
    if (s === 'default') {
      return [
        { label: 'surface',         variable: `--stat-${v}-surface` },
        { label: 'border',          variable: `--stat-${v}-border` },
        { label: 'corner radius',   variable: `--stat-${v}-radius`,  canBeLinked: true, groupKey: 'radius' },
        { label: 'padding',         variable: `--stat-${v}-padding`, canBeLinked: true, groupKey: 'padding' },
        { label: 'value text',      variable: `--stat-${v}-value-text` },
        { label: 'value font family', variable: `--stat-${v}-value-font-family`, canBeLinked: true, groupKey: 'value-font-family' },
        { label: 'value font size',   variable: `--stat-${v}-value-font-size`,   canBeLinked: true, groupKey: 'value-font-size' },
        { label: 'value font weight', variable: `--stat-${v}-value-font-weight`, canBeLinked: true, groupKey: 'value-font-weight' },
        { label: 'label text',      variable: `--stat-${v}-label-text` },
        { label: 'label font family', variable: `--stat-${v}-label-font-family`, canBeLinked: true, groupKey: 'label-font-family' },
        { label: 'label font size',   variable: `--stat-${v}-label-font-size`,   canBeLinked: true, groupKey: 'label-font-size' },
      ];
    }
    // hover: one slot. No selected/disabled, so the hover fieldset is flat.
    return [
      { label: 'surface', variable: `--stat-${v}-hover-surface` },
    ];
  }

  function variantStates(v: Variant): Record<StateName, Token[]> {
    return Object.fromEntries(stateNames.map((s) => [s, variantStateTokens(v, s)])) as Record<StateName, Token[]>;
  }

  export const allTokens: Token[] = variants.flatMap((v) => Object.values(variantStates(v)).flat());

  // Linkable contexts: which variables anchor cross-variant link rows.
  // The slot prefix on typography groupKeys (value-* vs label-*) keeps the two
  // typography slots from merging into one link tree.
  const linkableContexts = new Map<string, string>([
    ['--stat-primary-radius', 'primary'],
    ['--stat-subtle-radius',  'subtle'],
    ['--stat-primary-padding','primary'],
    ['--stat-subtle-padding', 'subtle'],
    ['--stat-primary-value-font-family', 'primary'],
    ['--stat-subtle-value-font-family',  'subtle'],
    ['--stat-primary-value-font-size',   'primary'],
    ['--stat-subtle-value-font-size',    'subtle'],
    ['--stat-primary-value-font-weight', 'primary'],
    ['--stat-subtle-value-font-weight',  'subtle'],
    ['--stat-primary-label-font-family', 'primary'],
    ['--stat-subtle-label-font-family',  'subtle'],
    ['--stat-primary-label-font-size',   'primary'],
    ['--stat-subtle-label-font-size',    'subtle'],
  ]);

  const variantOptions = variants.map((v) => ({
    value: v,
    label: v.charAt(0).toUpperCase() + v.slice(1),
  }));
</script>

<script lang="ts">
  import {
    ComponentEditorBase,
    VariantGroup,
    computeLinkedBlock,
    withLinkedDisabled,
  } from '@motion-proto/live-tokens/component-editor';
  import { editorState } from '@motion-proto/live-tokens';
  import Stat from './Stat.svelte';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<StateName, Token[]>);
</script>

<ComponentEditorBase
  {component}
  title="Stat"
  description="A number above a label. Import from system/components/Stat.svelte."
  tokens={allTokens}
  {linked}
  variants={variantOptions}
>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={visibleVariantStates(v)}
      {component}
      siblings={buildSiblings(variants, v, variantStates)}
    >
      <div class="stat-preview">
        <Stat variant={v} value="248" label="Active users" />
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .stat-preview {
    display: flex;
    gap: var(--ui-space-16);
    padding: var(--ui-space-16);
  }
</style>
```

### Registration: `src/main.ts`

```ts
import { registerComponent } from '@motion-proto/live-tokens';
import StatEditor, { allTokens as statTokens } from './system/components/StatEditor.svelte';

// ... existing initEditorStore, initCssVarSync, configureEditor, etc.

registerComponent({
  id: 'stat',
  label: 'Stat',
  icon: 'fas fa-chart-simple',
  sourceFile: 'src/system/components/Stat.svelte',
  editorComponent: StatEditor,
  schema: statTokens,
});

// ... mount(App, ...)
```

## Verification checklist

After saving, navigate to `/components`:

- [ ] `Stat` appears in the nav rail under the **CUSTOM** group (system entries above, custom below the labeled divider).
- [ ] The token rows render. Color pickers, radius selectors, and font selectors all work.
- [ ] Linked-block: the `corner radius`, `padding`, and font typography rows appear with the link toggle. Changing the linked value broadcasts across both variants.
- [ ] Save creates `component-configs/stat/default.json`. Subsequent saves write `_active.json` plus any named files.
- [ ] Reset returns each variable to its `:global(:root)` default.
- [ ] Boot validation is clean (no warnings about `stat` being missing from the server scan or about disk-vs-registry drift).
- [ ] Imports in `Stat.svelte`, `StatEditor.svelte`, and `main.ts` come from only `@motion-proto/live-tokens` and `@motion-proto/live-tokens/component-editor`. No `../../node_modules/...` and no deep-imports.

If anything fails this checklist, fix it before declaring done. The verification checklist is the contract; the rest of this skill is how to satisfy it.
