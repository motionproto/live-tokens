<script lang="ts">
  import CollapsibleSection from '../components/CollapsibleSection.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import SharedBlock from './scaffolding/SharedBlock.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  const component = 'collapsiblesection';
  let demoExpanded = false;
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
  const stateNames = ['default', 'hover', 'active'] as const;
  type StateName = typeof stateNames[number];
  function stateTokens(s: StateName): Token[] {
    return [
      { label: 'surface color', variable: `--collapsiblesection-${s}-surface` },
      { label: 'border color', variable: `--collapsiblesection-${s}-border` },
      { label: 'border width', canBeShared: true, groupKey: 'border-width', variable: `--collapsiblesection-${s}-border-width` },
      { label: 'radius', canBeShared: true, groupKey: 'radius', variable: `--collapsiblesection-${s}-radius` },
      { label: 'padding', canBeShared: true, groupKey: 'padding', variable: `--collapsiblesection-${s}-padding` },
      { label: 'icon color', variable: `--collapsiblesection-${s}-icon` },
      { label: 'icon size', canBeShared: true, groupKey: 'icon-size', variable: `--collapsiblesection-${s}-icon-size` },
    ];
  }
  function stateTypeGroups(s: StateName): TypeGroupConfig[] {
    return [{
      legend: 'label',
      colorVariable: `--collapsiblesection-${s}-label`,
      familyVariable: `--collapsiblesection-${s}-label-font-family`,
      sizeVariable: `--collapsiblesection-${s}-label-font-size`,
      weightVariable: `--collapsiblesection-${s}-label-font-weight`,
      lineHeightVariable: `--collapsiblesection-${s}-label-line-height`,
    }];
  }

  const states: Record<string, Token[]> = Object.fromEntries(stateNames.map((s) => [s, stateTokens(s)]));
  const typeGroups: Record<string, TypeGroupConfig[]> = Object.fromEntries(stateNames.map((s) => [s, stateTypeGroups(s)]));
  const typeGroupTokens: Token[] = stateNames.flatMap((s) => [
    { label: 'font family', canBeShared: true, groupKey: 'label-font-family', variable: `--collapsiblesection-${s}-label-font-family` },
    { label: 'font size', canBeShared: true, groupKey: 'label-font-size', variable: `--collapsiblesection-${s}-label-font-size` },
    { label: 'font weight', canBeShared: true, groupKey: 'label-font-weight', variable: `--collapsiblesection-${s}-label-font-weight` },
    { label: 'line height', canBeShared: true, groupKey: 'label-line-height', variable: `--collapsiblesection-${s}-label-line-height` },
  ]);
  const allTokens = [...Object.values(states).flat(), ...typeGroupTokens];
  registerComponentSchema(component, allTokens);

  const shareableContexts = new Map<string, string>(stateNames.flatMap((s) => [
    [`--collapsiblesection-${s}-border-width`, s] as const,
    [`--collapsiblesection-${s}-radius`, s] as const,
    [`--collapsiblesection-${s}-padding`, s] as const,
    [`--collapsiblesection-${s}-icon-size`, s] as const,
    [`--collapsiblesection-${s}-label-font-family`, s] as const,
    [`--collapsiblesection-${s}-label-font-size`, s] as const,
    [`--collapsiblesection-${s}-label-font-weight`, s] as const,
    [`--collapsiblesection-${s}-label-line-height`, s] as const,
  ]));

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

  $: visibleStates = Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
  const allVariables = allTokens.map((t) => t.variable);
</script>

<ComponentEditorBase {component} title="Collapsible Section" description="Expandable section with chevron toggle. Import from <code>components/CollapsibleSection.svelte</code>" resetVariables={allVariables}>
  <VariantGroup
    name="collapsible"
    title="Collapsible Section"
    states={visibleStates}
    {typeGroups}
    {component}
    {highlightedVars}
    sharedOrder={shared.sharedOrder}
    on:tokenhover={handleTokenHover}
    let:activeState
  >
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const forceActive = activeState === 'active'}
    <div class="collapsible-demo-wrapper">
      <CollapsibleSection
        label="Click to expand"
        expanded={demoExpanded}
        active={forceActive}
        class={forceClass}
        on:toggle={() => (demoExpanded = !demoExpanded)}
      />
      {#if demoExpanded}
        <div class="collapsible-demo-content">
          <p style="margin: 0; color: var(--text-secondary);">
            This content is revealed when the section is expanded. Any content can go here.
          </p>
        </div>
      {/if}
    </div>
  </VariantGroup>
  <SharedBlock {component} {shared} {highlightedVars} on:tokenhover={handleTokenHover} on:change />
</ComponentEditorBase>

<style>
  .collapsible-demo-wrapper {
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .collapsible-demo-content {
    padding: var(--space-12) var(--space-16);
    background: var(--ui-surface-low);
    border-top: 1px solid var(--ui-border-faint);
  }
</style>
