<script module lang="ts">
  import { buildSiblings } from './scaffolding/siblings';
  import type { Token } from './scaffolding/types';

  export const component = 'button';

  const variants = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;
  type Variant = typeof variants[number];
  const stateNames = ['default', 'hover', 'disabled'] as const;
  type StateName = typeof stateNames[number];
  function statePrefix(v: Variant, s: StateName): string {
    return s === 'default' ? `--button-${v}` : `--button-${v}-${s}`;
  }

  // Shape + type. These don't change per state in the runtime — promoted into
  // their own "base" part so state panels carry only what genuinely varies.
  function variantBaseTokens(v: Variant): Token[] {
    return [
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--button-${v}-padding` },
      { label: 'padding-top', canBeLinked: true, groupKey: 'padding-top', variable: `--button-${v}-padding-top`, hidden: true },
      { label: 'padding-right', canBeLinked: true, groupKey: 'padding-right', variable: `--button-${v}-padding-right`, hidden: true },
      { label: 'padding-bottom', canBeLinked: true, groupKey: 'padding-bottom', variable: `--button-${v}-padding-bottom`, hidden: true },
      { label: 'padding-left', canBeLinked: true, groupKey: 'padding-left', variable: `--button-${v}-padding-left`, hidden: true },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--button-${v}-radius` },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--button-${v}-border-width` },
      { label: 'font family', canBeLinked: true, groupKey: 'font-family', variable: `--button-${v}-text-font-family` },
      { label: 'font size', canBeLinked: true, groupKey: 'font-size', variable: `--button-${v}-text-font-size` },
      { label: 'font weight', canBeLinked: true, groupKey: 'font-weight', variable: `--button-${v}-text-font-weight` },
      { label: 'line height', canBeLinked: true, groupKey: 'line-height', variable: `--button-${v}-text-line-height` },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: `--button-${v}-icon-size` },
    ];
  }

  // State panels carry only what changes between states: the three color slots.
  function variantStateTokens(v: Variant, s: StateName): Token[] {
    const colorVar = s === 'default' ? `--button-${v}-text` : `--button-${v}-${s}-text`;
    return [
      { label: 'surface color', groupKey: 'surface', variable: `${statePrefix(v, s)}-surface` },
      { label: 'border color', groupKey: 'border', variable: `${statePrefix(v, s)}-border` },
      { label: 'text color', groupKey: 'text', variable: colorVar },
    ];
  }

  // Outline is the only variant that paints a surface tint on :active; the rest
  // express press feedback through transform/shadow only. Expose just the one
  // tunable property here rather than adding an active state to every variant.
  const outlineActiveTokens: Token[] = [
    { label: 'surface color', groupKey: 'surface', variable: '--button-outline-active-surface' },
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
      { label: 'padding', groupKey: 'small-padding', variable: '--button-small-padding' },
      { label: 'padding-top', groupKey: 'small-padding-top', variable: '--button-small-padding-top', hidden: true },
      { label: 'padding-right', groupKey: 'small-padding-right', variable: '--button-small-padding-right', hidden: true },
      { label: 'padding-bottom', groupKey: 'small-padding-bottom', variable: '--button-small-padding-bottom', hidden: true },
      { label: 'padding-left', groupKey: 'small-padding-left', variable: '--button-small-padding-left', hidden: true },
      { label: 'font size', groupKey: 'small-font-size', variable: '--button-small-text-font-size' },
      { label: 'font weight', groupKey: 'small-font-weight', variable: '--button-small-text-font-weight' },
      { label: 'line height', groupKey: 'small-line-height', variable: '--button-small-text-line-height' },
      { label: 'icon size', groupKey: 'small-icon-size', variable: '--button-small-icon-size' },
    ],
  };
  const smallTokensFlat: Token[] = Object.values(smallStates).flat();

  export const allTokens: Token[] = [
    ...variants.flatMap((v) => Object.values(variantStates(v)).flat()),
    ...smallTokensFlat,
  ];

  // All shape + type props live under each variant's "base" part; they link
  // across variants from there. Small tokens stay in their own namespace —
  // no cross-size linking.
  const linkableContexts = new Map<string, string>(
    variants.flatMap((v) => [
      [`--button-${v}-padding`, `${v} base`] as const,
      [`--button-${v}-radius`, `${v} base`] as const,
      [`--button-${v}-border-width`, `${v} base`] as const,
      [`--button-${v}-text-font-family`, `${v} base`] as const,
      [`--button-${v}-text-font-size`, `${v} base`] as const,
      [`--button-${v}-text-font-weight`, `${v} base`] as const,
      [`--button-${v}-text-line-height`, `${v} base`] as const,
      [`--button-${v}-icon-size`, `${v} base`] as const,
    ]),
  );

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import Button from '../../system/components/Button.svelte';
  import Toggle from '../ui/Toggle.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentAlias } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';

  let shimmerRef = $derived($editorState.components.button?.aliases['--button-shimmer']);
  let shimmerEnabled = $derived(!(shimmerRef?.kind === 'token' && shimmerRef.name === '--shimmer-off'));

  function handleShimmerChange(checked: boolean) {
    setComponentAlias('button', '--button-shimmer', { kind: 'token', name: checked ? '--shimmer-on' : '--shimmer-off' });
  }

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
  <label class="preview-size-field">
    <span>Size</span>
    <select bind:value={previewSize}>
      <option value="default">Default</option>
      <option value="small">Small</option>
    </select>
  </label>
{/snippet}

<ComponentEditorBase {component} title="Button" description="Reusable button component with multiple variants and sizes." tokens={allTokens} {linked} variants={baseVariantOptions}>
  {#if previewSize === 'default'}
    {#each variants as v}
      <VariantGroup
        name={v}
        title={v.charAt(0).toUpperCase() + v.slice(1)}
        states={visibleVariantStates(v)}
        {component}
        columns={2}
        siblings={buildSiblings(variants, v, variantStates)}
        previewActions={sizeAction}
      >
        {#snippet extraPropertyRows(stateName)}
          {#if stateName === 'hover'}
            <div class="property-row">
              <span class="property-label">hover shimmer</span>
              <Toggle checked={shimmerEnabled} onchange={handleShimmerChange} />
            </div>
          {/if}
        {/snippet}
        {#snippet children({ activeState })}
          {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
          {@const isDisabled = activeState === 'disabled'}
          <div class="button-showcase-grid">
            <div class="button-showcase-item">
              <Button variant={v} disabled={isDisabled} class={forceClass}>{v.charAt(0).toUpperCase() + v.slice(1)}</Button>
            </div>
            <div class="button-showcase-item">
              <Button variant={v} icon="fas fa-star" iconPosition="left" disabled={isDisabled} class={forceClass}>With Icon</Button>
            </div>
          </div>
        {/snippet}
      </VariantGroup>
    {/each}
  {:else}
    <VariantGroup
      name="small"
      title="Small"
      states={visibleSmallStates}
      {component}
      columns={2}
      previewActions={sizeAction}
    >
      {#snippet children()}
        <div class="small-preview">
          {#each variants as v}
            <Button variant={v} size="small">{v.charAt(0).toUpperCase() + v.slice(1)}</Button>
          {/each}
          {#each variants as v}
            <Button variant={v} size="small" icon="fas fa-star" iconPosition="left">{v.charAt(0).toUpperCase() + v.slice(1)}</Button>
          {/each}
        </div>
      {/snippet}
    </VariantGroup>
  {/if}
</ComponentEditorBase>

<style>
  .preview-size-field {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  .button-showcase-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-16);
    align-items: start;
  }

  .button-showcase-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    align-items: flex-start;
  }

  .small-preview {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
    align-items: center;
  }
</style>
