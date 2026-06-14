<script module lang="ts">
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token } from './scaffolding/types';

  export const component = 'iconbutton';

  const variants = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;
  type Variant = typeof variants[number];
  const stateNames = ['default', 'hover', 'disabled'] as const;
  type StateName = typeof stateNames[number];
  function statePrefix(v: Variant, s: StateName): string {
    return s === 'default' ? `--iconbutton-${v}` : `--iconbutton-${v}-${s}`;
  }

  // Shape. Icon-only, so unlike Button there is no text typography here — the
  // base part carries only frame geometry, which links across variants.
  function variantBaseTokens(v: Variant): Token[] {
    return [
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--iconbutton-${v}-padding` },
      { label: 'padding-top', canBeLinked: true, groupKey: 'padding-top', variable: `--iconbutton-${v}-padding-top`, hidden: true },
      { label: 'padding-right', canBeLinked: true, groupKey: 'padding-right', variable: `--iconbutton-${v}-padding-right`, hidden: true },
      { label: 'padding-bottom', canBeLinked: true, groupKey: 'padding-bottom', variable: `--iconbutton-${v}-padding-bottom`, hidden: true },
      { label: 'padding-left', canBeLinked: true, groupKey: 'padding-left', variable: `--iconbutton-${v}-padding-left`, hidden: true },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--iconbutton-${v}-radius` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--iconbutton-${v}-border-width` },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: `--iconbutton-${v}-icon-size` },
    ];
  }

  function variantStateTokens(v: Variant, s: StateName): Token[] {
    const iconVar = s === 'default' ? `--iconbutton-${v}-icon` : `--iconbutton-${v}-${s}-icon`;
    return [
      { label: 'surface color', groupKey: 'surface', variable: `${statePrefix(v, s)}-surface` },
      { label: 'border color', groupKey: 'border', variable: `${statePrefix(v, s)}-border` },
      { label: 'icon color', groupKey: 'icon', variable: iconVar },
    ];
  }

  // Outline is the only variant that paints a surface tint on :active.
  const outlineActiveTokens: Token[] = [
    { label: 'surface color', groupKey: 'surface', variable: '--iconbutton-outline-active-surface' },
  ];

  function variantStates(v: Variant): Record<string, Token[]> {
    const out: Record<string, Token[]> = {};
    out.base = variantBaseTokens(v);
    out.default = variantStateTokens(v, 'default');
    out.hover = variantStateTokens(v, 'hover');
    if (v === 'outline') out.active = outlineActiveTokens;
    out.disabled = variantStateTokens(v, 'disabled');
    return out;
  }

  // Small-size schema. One shared spec across all variants (matches the runtime
  // `.small` rule, which is variant-agnostic). Per-side padding rows are hidden
  // and surface only when the editor splits the padding control.
  const smallStates: Record<string, Token[]> = {
    small: [
      { label: 'padding', groupKey: 'small-padding', variable: '--iconbutton-small-padding' },
      { label: 'padding-top', groupKey: 'small-padding-top', variable: '--iconbutton-small-padding-top', hidden: true },
      { label: 'padding-right', groupKey: 'small-padding-right', variable: '--iconbutton-small-padding-right', hidden: true },
      { label: 'padding-bottom', groupKey: 'small-padding-bottom', variable: '--iconbutton-small-padding-bottom', hidden: true },
      { label: 'padding-left', groupKey: 'small-padding-left', variable: '--iconbutton-small-padding-left', hidden: true },
      { label: 'icon size', groupKey: 'small-icon-size', variable: '--iconbutton-small-icon-size' },
    ],
  };
  const smallTokensFlat: Token[] = Object.values(smallStates).flat();

  export const allTokens: Token[] = [
    ...variants.flatMap((v) => Object.values(variantStates(v)).flat()),
    ...smallTokensFlat,
  ];

  // Frame geometry lives under each variant's "base" part and links across
  // variants from there. Small tokens stay in their own namespace.
  const linkableContexts = new Map<string, string>(
    variants.flatMap((v) => [
      [`--iconbutton-${v}-padding`, `${v} base`] as const,
      [`--iconbutton-${v}-radius`, `${v} base`] as const,
      [`--iconbutton-${v}-border-width`, `${v} base`] as const,
      [`--iconbutton-${v}-icon-size`, `${v} base`] as const,
    ]),
  );

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

  const previewIcons: Record<Variant, string> = {
    primary: 'fas fa-star',
    secondary: 'fas fa-gear',
    outline: 'fas fa-pen',
    success: 'fas fa-check',
    danger: 'fas fa-trash',
    warning: 'fas fa-triangle-exclamation',
  };
</script>

<script lang="ts">
  import IconButton from '../../system/components/IconButton.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let previewSize = $state<'default' | 'small'>('default');

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));

  let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  let visibleSmallStates = $derived(Object.fromEntries(
    Object.entries(smallStates).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  // At small size, no variant strip — the small spec is shared across all
  // variants, so the strip would have nothing to navigate between.
  let baseVariantOptions = $derived(previewSize === 'small' ? [] : variantOptions);
</script>

{#snippet sizeAction()}
  <label>
    <span>Size</span>
    <select bind:value={previewSize}>
      <option value="default">Default</option>
      <option value="small">Small</option>
    </select>
  </label>
{/snippet}

<ComponentEditorBase {component} title="Icon Button" description="Icon-only button with the same variants, states and sizes as Button." tokens={allTokens} {linked} variants={baseVariantOptions}>
  {#if previewSize === 'default'}
    {#each variants as v}
      <VariantGroup
        name={v}
        title={v.charAt(0).toUpperCase() + v.slice(1)}
        states={visibleVariantStates(v)}
        {component}
        siblings={buildSiblings(variants, v, variantStates)}
        previewActions={sizeAction}
      >
        {#snippet children({ activeState })}
          {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
          {@const isDisabled = activeState === 'disabled'}
          <IconButton variant={v} icon={previewIcons[v]} ariaLabel={`${v} action`} disabled={isDisabled} class={forceClass} />
        {/snippet}
      </VariantGroup>
    {/each}
  {:else}
    <VariantGroup
      name="small"
      title="Small"
      states={visibleSmallStates}
      {component}
      previewActions={sizeAction}
    >
      {#snippet children()}
        <div class="small-preview">
          {#each variants as v}
            <IconButton variant={v} size="small" icon={previewIcons[v]} ariaLabel={`${v} action`} />
          {/each}
        </div>
      {/snippet}
    </VariantGroup>
  {/if}
</ComponentEditorBase>

<style>
  .small-preview {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
    align-items: center;
  }
</style>
