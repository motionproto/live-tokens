# Adding a new component

This is a step-by-step recipe for adding a new component to the editor. Read
chapter 05 first if you don't already know how the registry, alias/config split,
shared blocks, and state model work.

## What you'll do

1. Author the runtime component (`src/components/<Name>.svelte`).
2. Author its editor (`src/component-editor/<Name>Editor.svelte`).
3. Add **one** registry entry (`src/component-editor/registry.ts`).
4. Verify the editor shows up, the alias map persists, and shared-block linking
   works.

That's it — no other files to touch. The dev plugin generates `default.json` from
your component's `:global(:root)` block on first save; `defaultSections`,
`componentSources`, and `componentNavItems` derive from the registry.

## Worked example: `Toggle`

We'll add a Toggle component with two variants (`brand`, `subtle`) and three
interaction states (`default`, `hover`, `disabled`).

### Step 1 — Runtime component

Create `src/components/Toggle.svelte`:

```svelte
<script lang="ts">
  export let variant: 'brand' | 'subtle' = 'brand';
  export let checked: boolean = false;
  export let disabled: boolean = false;
</script>

<button
  type="button"
  class="toggle toggle-{variant}"
  class:checked
  class:disabled
  aria-pressed={checked}
  {disabled}
  on:click={() => !disabled && (checked = !checked)}
>
  <span class="thumb" />
</button>

<style>
  :global(:root) {
    /* brand */
    --toggle-brand-track: var(--surface-neutral);
    --toggle-brand-track-checked: var(--surface-primary);
    --toggle-brand-thumb: var(--surface-neutral-highest);
    --toggle-brand-radius: var(--radius-full);
    --toggle-brand-hover-track: var(--surface-neutral-high);
    --toggle-brand-disabled-track: var(--surface-neutral-low);

    /* subtle */
    --toggle-subtle-track: var(--surface-neutral-low);
    --toggle-subtle-track-checked: var(--surface-accent);
    --toggle-subtle-thumb: var(--surface-neutral-higher);
    --toggle-subtle-radius: var(--radius-full);
    --toggle-subtle-hover-track: var(--surface-neutral);
    --toggle-subtle-disabled-track: var(--surface-neutral-low);
  }

  .toggle {
    width: 36px; height: 20px;
    background: var(--toggle-brand-track);
    border-radius: var(--toggle-brand-radius);
    border: none; padding: 2px; cursor: pointer;
    transition: background 120ms ease;
  }
  .toggle.toggle-subtle { background: var(--toggle-subtle-track); }
  .toggle.checked.toggle-brand { background: var(--toggle-brand-track-checked); }
  .toggle.checked.toggle-subtle { background: var(--toggle-subtle-track-checked); }
  .toggle:hover.toggle-brand:not(.disabled) { background: var(--toggle-brand-hover-track); }
  .toggle:hover.toggle-subtle:not(.disabled) { background: var(--toggle-subtle-hover-track); }
  .toggle.disabled.toggle-brand { background: var(--toggle-brand-disabled-track); cursor: not-allowed; }
  .toggle.disabled.toggle-subtle { background: var(--toggle-subtle-disabled-track); cursor: not-allowed; }

  .thumb {
    display: block; width: 16px; height: 16px;
    background: var(--toggle-brand-thumb); border-radius: 50%;
    transition: transform 120ms ease;
  }
  .toggle-subtle .thumb { background: var(--toggle-subtle-thumb); }
  .toggle.checked .thumb { transform: translateX(16px); }
</style>
```

Things to notice:

- **`:global(:root)` declares every slot.** The dev plugin parses this block to seed
  `component-configs/toggle/default.json`. Variables not declared here won't be
  editable.
- **Naming follows the convention.** `--toggle-<variant>-<part>[-state][-property]`.
  See `src/styles/CONVENTIONS.md` for the full vocabulary.
- **Default values reference theme tokens** (`var(--surface-primary)`). At runtime
  the alias editor lets users re-point each one, but the source-of-truth defaults
  are these references.
- **No state-coupling JS in the runtime.** Disabled rejects clicks at the handler;
  `aria-pressed` reflects `checked`. The component doesn't care that disabled is
  "terminal" — that's a *state-model* invariant the editor honors (chapter 05);
  the runtime just behaves correctly when `disabled === true`.

### Step 2 — Editor

Create `src/component-editor/ToggleEditor.svelte`:

```svelte
<script context="module" lang="ts">
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token } from './scaffolding/types';

  export const component = 'toggle';
  const variants = ['brand', 'subtle'] as const;
  type Variant = typeof variants[number];
  const stateNames = ['default', 'hover', 'disabled'] as const;
  type StateName = typeof stateNames[number];

  function statePrefix(v: Variant, s: StateName): string {
    return s === 'default' ? `--toggle-${v}` : `--toggle-${v}-${s}`;
  }

  function variantStateTokens(v: Variant, s: StateName): Token[] {
    if (s === 'default') {
      return [
        { label: 'track color', variable: `--toggle-${v}-track` },
        { label: 'track color (checked)', variable: `--toggle-${v}-track-checked` },
        { label: 'thumb color', variable: `--toggle-${v}-thumb` },
        { label: 'corner radius', canBeShared: true, groupKey: 'radius', variable: `--toggle-${v}-radius` },
      ];
    }
    return [
      { label: 'track color', variable: `${statePrefix(v, s)}-track` },
    ];
  }

  function variantStates(v: Variant): Record<StateName, Token[]> {
    return Object.fromEntries(stateNames.map((s) => [s, variantStateTokens(v, s)])) as Record<StateName, Token[]>;
  }

  export const allTokens: Token[] = variants.flatMap((v) =>
    Object.values(variantStates(v)).flat()
  );

  // Shared block: radius links across both variants.
  const shareableContexts = new Map<string, string>([
    ['--toggle-brand-radius', 'brand'],
    ['--toggle-subtle-radius', 'subtle'],
  ]);

  const variantOptions = variants.map((v) => ({
    value: v, label: v.charAt(0).toUpperCase() + v.slice(1),
  }));
</script>

<script lang="ts">
  import Toggle from '../components/Toggle.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';

  $: shared = computeSharedBlock(component, shareableContexts, allTokens);
  $: void $editorState;
  $: visibleVariantStates = (v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<StateName, Token[]>;
</script>

<ComponentEditorBase
  {component}
  title="Toggle"
  description="Two-state switch. Import from <code>components/Toggle.svelte</code>"
  tokens={allTokens}
  {shared}
  tabbable
  variants={variantOptions}
>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={visibleVariantStates(v)}
      {component}
      siblings={buildSiblings(variants, v, variantStates)}
      let:activeState
    >
      <div class="toggle-row">
        <Toggle variant={v} checked={false} disabled={activeState === 'disabled'} />
        <Toggle variant={v} checked={true}  disabled={activeState === 'disabled'} />
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .toggle-row { display: flex; gap: var(--space-16); padding: var(--space-12); }
</style>
```

Required pieces:

| Piece | Why |
|---|---|
| `<script context="module">` | Exports `allTokens`, `component`, helpers. Imported eagerly by the registry; not coupled to a mount. |
| `export const component = 'toggle'` | Canonical lowercase id. Must match the runtime filename and the registry entry's `id`. |
| `export const allTokens: Token[]` | The editor's full schema. Drives the reset-to-default action and `registerComponentSchema`. |
| `groupKey` on every shareable token | Makes `--toggle-brand-radius` and `--toggle-subtle-radius` siblings via the `'radius'` group. Without it, fallback would group by the literal last segment. |
| `shareableContexts` | Per-variable context labels for the shared block (passed to `computeSharedBlock`). |
| `tabbable` + `variants={variantOptions}` | Enables the List/Tabs view toggle and the variant tab strip. |
| `withSharedDisabled` | Greys out tokens currently in the shared block so per-state rows don't double-edit. |
| `buildSiblings(variants, v, variantStates)` | The "Copy from" menu's data source. |

### Step 3 — Register

Edit `src/component-editor/registry.ts`:

```ts
// Add the import alongside the others, near the top
import ToggleEditor, { allTokens as toggleTokens } from './ToggleEditor.svelte';

// Add to the ComponentId union
export type ComponentId =
  | 'segmentedcontrol'
  | 'button'
  /* … */
  | 'progressbar'
  | 'toggle';   // ← add

// Add the registry entry. Position here = display order in the nav rail.
export const componentRegistry: Readonly<Record<ComponentId, RegistryEntry>> = Object.freeze({
  /* …existing entries… */
  toggle: {
    id: 'toggle',
    label: 'Toggle',
    icon: 'fas fa-toggle-on',
    sourceFile: 'src/components/Toggle.svelte',
    editorComponent: ToggleEditor,
    schema: toggleTokens,
  },
});
```

That's the only file outside `src/components/` and `src/component-editor/`
that touches "Toggle exists" — the registry's iteration order is the nav order, the
schema is registered eagerly at module load, and the validation function compares
the registry's id list to the server's filesystem scan at boot.

### Step 4 — Verify

```bash
npm run dev
# Visit http://localhost:5173/components
```

Checklist:

- [ ] **Toggle appears in the nav rail** (left side of `/components`). If not,
      check that the registry import compiled — open devtools, look for
      `[componentRegistry]` warnings.
- [ ] **The preview renders** with both variants and three states.
- [ ] **Token rows render** in TokenLayout for each state (color picker for
      colors, radius selector for radius).
- [ ] **Shared block shows the radius row** when both variants' radii agree.
      Toggling the link icon should unlink/relink them across variants.
- [ ] **Save creates a config file**: with the file menu, "Save As" → name it
      `default_01` → check that `component-configs/toggle/default_01.json`
      exists with your aliases.
- [ ] **`default.json` was generated** — `component-configs/toggle/default.json`
      should be present, populated with identity-mapped aliases parsed from your
      `:global(:root)` block.
- [ ] **Reset works** — clicking the reset icon on a row clears the alias and
      the row falls back to its `default.json` value.
- [ ] **Boot validation is clean** — open devtools console; there should be no
      `[componentRegistry] components on disk not in registry` warning.

If validation warns about `registered components missing from server scan`, your
runtime filename is wrong (must be `Toggle.svelte`; the server lowercases the
basename to derive the id).

## Common gotchas

### "My component appears but the alias map is empty"

The dev plugin reads your `:global(:root)` block via `extractGlobalRootBody`. If
you wrote your declarations *outside* `:global(:root)` (e.g., in a `:root` block
without `:global(...)` wrapping, or inside a Svelte-scoped class), Svelte's CSS
preprocessor scopes them and the parser sees zero declarations.

The fix: wrap them in `:global(:root) { … }` exactly. Test by inspecting the
generated `component-configs/<id>/default.json` — the `aliases` map should be
non-empty.

### "Sibling linking doesn't work"

Two causes:

1. **You forgot `canBeShared: true` and/or `groupKey`** on the token. Without
   `canBeShared`, the link icon doesn't render. Without `groupKey`, fallback is
   to match the last `-<segment>` of the variable name — works for things like
   `-radius`, `-padding`, but breaks if two unrelated tokens both end in
   `-width`.
2. **The schema wasn't registered.** Schema registration happens automatically
   from `registry.ts` at module load — but only if you actually added an entry.
   Verify with `console.log` in the registry, or check that the boot validation
   isn't warning about your component.

### "I want a non-stylable knob"

Use the `config` slot in `<ComponentEditorBase>`:

```svelte
<svelte:fragment slot="config">
  <label>
    <span>Animation duration</span>
    <input
      type="number"
      value={$editorState.components[component]?.config['--toggle-duration'] ?? 120}
      on:change={(e) => setComponentConfig(component, '--toggle-duration', e.target.value)}
    />
  </label>
</svelte:fragment>
```

Then add `'--toggle-duration'` to `KNOWN_COMPONENT_CONFIG_KEYS` in
`src/lib/componentConfigKeys.ts` so the on-load split routes it to the `config`
bucket on legacy files.

The runtime reads it via `$editorState.components.toggle?.config['--toggle-duration']`.
Don't add config knobs that can be expressed as CSS variables — those belong in
`aliases`, not `config`.

### "I want to use a non-default `groupKey` strategy"

`buildTypeGroupTokens(typeGroups, { groupKeyFor: (prop, group) => '…' })` accepts
a custom resolver that receives the prop descriptor and the type group. Useful
when you want a per-variant groupKey rather than the default per-property
(`font-family`, `font-size`, etc.). Most editors use the default; the override
is there for cases like SegmentedControl that need finer-grained linkage.

### "My component has parts, not states"

Don't put parts (Dialog overlay, Tooltip arrow, SegmentedControl divider) into the
state map. Use a flat token list and one VariantGroup with a single state, or
multiple VariantGroups (one per part) with appropriate `name` / `title`. The
state model's "default / selected / disabled" mutual exclusion only applies to
*states*, not parts. See chapter 10.

## Where to go next

- Chapter 09 covers other recipes: adding a token category, adding a migration,
  adding a versioned resource.
- Chapter 10 covers the encoded contracts (state model, parts vs states, sharing-
  is-dev-declared) — read this if any of the editor invariants surprise you.
