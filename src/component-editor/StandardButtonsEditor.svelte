<script context="module" lang="ts">
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'button';

  const variants = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;
  type Variant = typeof variants[number];
  const stateNames = ['default', 'hover', 'disabled'] as const;
  type StateName = typeof stateNames[number];
  function statePrefix(v: Variant, s: StateName): string {
    return s === 'default' ? `--button-${v}` : `--button-${v}-${s}`;
  }
  function variantStateTokens(v: Variant, s: StateName): Token[] {
    const p = statePrefix(v, s);
    return [
      { label: 'surface color', variable: `${p}-surface` },
      { label: 'border color', variable: `${p}-border` },
      { label: 'border width', canBeShared: true, groupKey: 'border-width', variable: `${p}-border-width` },
      { label: 'corner radius', canBeShared: true, groupKey: 'radius', variable: `${p}-radius` },
      { label: 'padding', canBeShared: true, groupKey: 'padding', variable: `${p}-padding` },
    ];
  }

  // Single typeGroup per variant lives in the default state — buttons rarely
  // change typography per state in practice, so consolidate.
  function variantTypeGroups(v: Variant): Record<string, TypeGroupConfig[]> {
    return {
      default: [{
        legend: 'button text',
        colorVariable: `--button-${v}-text`,
        familyVariable: `--button-${v}-text-font-family`,
        sizeVariable: `--button-${v}-text-font-size`,
        weightVariable: `--button-${v}-text-font-weight`,
        lineHeightVariable: `--button-${v}-text-line-height`,
      }],
      hover: [{
        legend: 'button text (hover)',
        colorVariable: `--button-${v}-hover-text`,
      }],
      disabled: [{
        legend: 'button text (disabled)',
        colorVariable: `--button-${v}-disabled-text`,
      }],
    };
  }

  function variantStates(v: Variant): Record<string, Token[]> {
    return Object.fromEntries(stateNames.map((s) => [s, variantStateTokens(v, s)]));
  }
  function variantTypeGroupTokens(v: Variant): Token[] {
    return [
      { label: 'font family', canBeShared: true, groupKey: 'font-family', variable: `--button-${v}-text-font-family` },
      { label: 'font size', canBeShared: true, groupKey: 'font-size', variable: `--button-${v}-text-font-size` },
      { label: 'font weight', canBeShared: true, groupKey: 'font-weight', variable: `--button-${v}-text-font-weight` },
      { label: 'line height', canBeShared: true, groupKey: 'line-height', variable: `--button-${v}-text-line-height` },
    ];
  }
  export const allTokens: Token[] = variants.flatMap((v) => [
    ...Object.values(variantStates(v)).flat(),
    ...variantTypeGroupTokens(v),
  ]);

  // Shared block:
  //   - shape props (border-width, radius, padding) link across every variant × state — buttons share one geometry.
  //   - typography props link across all six variants.
  const shareableContexts = new Map<string, string>([
    ...variants.flatMap((v) => stateNames.flatMap((s) => [
      [`${statePrefix(v, s)}-border-width`, `${v} ${s}`] as const,
      [`${statePrefix(v, s)}-radius`, `${v} ${s}`] as const,
      [`${statePrefix(v, s)}-padding`, `${v} ${s}`] as const,
    ])),
    ...variants.flatMap((v) => [
      [`--button-${v}-text-font-family`, v] as const,
      [`--button-${v}-text-font-size`, v] as const,
      [`--button-${v}-text-font-weight`, v] as const,
      [`--button-${v}-text-line-height`, v] as const,
    ]),
  ]);

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

  function siblingsFor(toVariant: Variant) {
    return variants
      .filter((v) => v !== toVariant)
      .map((v) => ({
        name: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
        states: variantStates(v),
        typeGroups: variantTypeGroups(v),
      }));
  }
</script>

<script lang="ts">
  import Button from '../components/Button.svelte';
  import Toggle from '../components/Toggle.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentAlias } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';

  $: shimmerRef = $editorState.components.button?.aliases['--button-shimmer'];
  $: shimmerEnabled = !(shimmerRef?.kind === 'token' && shimmerRef.name === '--shimmer-off');

  function handleShimmerChange(e: CustomEvent<boolean>) {
    setComponentAlias('button', '--button-shimmer', { kind: 'token', name: e.detail ? '--shimmer-on' : '--shimmer-off' });
  }

  $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);

  $: visibleVariantStates = (v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
</script>

<ComponentEditorBase {component} title="Button" description="Reusable button component with multiple variants and sizes. Import from <code>components/Button.svelte</code>" tokens={allTokens} {shared} tabbable variants={variantOptions}>
  <svelte:fragment slot="config">
    <label>
      <span>Hover shimmer</span>
      <Toggle checked={shimmerEnabled} on:change={handleShimmerChange} />
    </label>
  </svelte:fragment>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={visibleVariantStates(v)}
      typeGroups={variantTypeGroups(v)}
      {component}
      siblings={siblingsFor(v)}
      let:activeState
    >
      {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
      {@const isDisabled = activeState === 'disabled'}
      <div class="size-row">
        <div class="size-section">
          <span class="size-label">size="default"</span>
          <div class="button-showcase-grid">
            <div class="button-showcase-item">
              <Button variant={v} disabled={isDisabled} class={forceClass}>{v.charAt(0).toUpperCase() + v.slice(1)}</Button>
            </div>
            <div class="button-showcase-item">
              <Button variant={v} icon="fas fa-star" iconPosition="left" disabled={isDisabled} class={forceClass}>With Icon</Button>
            </div>
          </div>
        </div>
        <div class="size-divider"></div>
        <div class="size-section">
          <span class="size-label">size="small"</span>
          <div class="button-showcase-grid">
            <div class="button-showcase-item">
              <Button variant={v} size="small" disabled={isDisabled} class={forceClass}>{v.charAt(0).toUpperCase() + v.slice(1)}</Button>
            </div>
            <div class="button-showcase-item">
              <Button variant={v} size="small" icon="fas fa-star" iconPosition="left" disabled={isDisabled} class={forceClass}>With Icon</Button>
            </div>
          </div>
        </div>
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .size-row {
    display: flex;
    gap: var(--space-12);
    align-items: flex-start;
  }

  .size-divider {
    width: 1px;
    background: var(--ui-border-faint);
    align-self: stretch;
  }

  .size-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .size-label {
    font-size: var(--font-size-xs);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-tertiary);
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
</style>
