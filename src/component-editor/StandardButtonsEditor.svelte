<script lang="ts">
  import Button from '../components/Button.svelte';
  import Toggle from '../components/Toggle.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import FieldsetWrapper from './scaffolding/FieldsetWrapper.svelte';
  import TokenLayout from './scaffolding/TokenLayout.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentAlias, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  const component = 'button';

  $: shimmerEnabled = $editorState.components.button?.aliases['--button-shimmer'] !== '--shimmer-off';

  function handleShimmerChange(e: CustomEvent<boolean>) {
    setComponentAlias('button', '--button-shimmer', e.detail ? '--shimmer-on' : '--shimmer-off');
  }
  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; hidden?: boolean };
  type TypeGroupConfig = {
    legend?: string;
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string;
    sizeVariable?: string;
    weightVariable?: string;
    lineHeightVariable?: string;
  };
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
      { label: 'border width', canBeShared: true, groupKey: `${v}-border-width`, variable: `${p}-border-width` },
      { label: 'radius', canBeShared: true, groupKey: `${v}-radius`, variable: `${p}-radius` },
      { label: 'padding', canBeShared: true, groupKey: `${v}-padding`, variable: `${p}-padding` },
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
  const allTokens: Token[] = variants.flatMap((v) => [
    ...Object.values(variantStates(v)).flat(),
    ...variantTypeGroupTokens(v),
  ]);
  registerComponentSchema(component, allTokens);

  // Shared block:
  //   - per-variant shape props (border-width, radius, padding) link across default/hover/disabled.
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

  $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);

  let highlightedVars = new Set<string>();
  function handleTokenHover(e: CustomEvent<{ variable: string | null }>) {
    const v = e.detail.variable;
    if (!v) {
      highlightedVars = new Set();
      return;
    }
    const group = shared.groups.find((g) => g.variables.includes(v));
    highlightedVars = group ? new Set(group.variables) : new Set();
  }

  $: visibleVariantStates = (v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
  const allVariables = allTokens.map((t) => t.variable);
</script>

<ComponentEditorBase {component} title="Button" description="Reusable button component with multiple variants and sizes. Import from <code>components/Button.svelte</code>" resetVariables={allVariables}>
  <FieldsetWrapper legend="shared">
    <div class="shared-row">
      <span class="shared-label">hover shimmer</span>
      <Toggle checked={shimmerEnabled} on:change={handleShimmerChange} />
    </div>
    {#if shared.groups.length > 0}
      <TokenLayout
        tokens={shared.groups.map((g) => ({ ...g.token, disabled: !g.shared }))}
        {component}
        contexts={shared.contextsByVar}
        {highlightedVars}
        sharedOrder={shared.sharedOrder}
        isSharedBlock
        on:tokenhover={handleTokenHover}
        on:change
      />
    {/if}
  </FieldsetWrapper>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={visibleVariantStates(v)}
      typeGroups={variantTypeGroups(v)}
      {component}
      {highlightedVars}
      sharedOrder={shared.sharedOrder}
      on:tokenhover={handleTokenHover}
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
              <span class="variant-label">{v}</span>
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
    gap: var(--space-16);
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

  .variant-label {
    font-size: var(--font-size-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
  }

  .shared-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
    padding: var(--ui-space-4) var(--ui-space-12);
  }

  .shared-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }
</style>
