<script lang="ts">
  import CollapsibleSection from '../components/CollapsibleSection.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../lib/editorStore';
  import { computeSharedBlock, withSharedDisabled } from './scaffolding/sharedBlock';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  const component = 'collapsiblesection';
  let demoExpanded = false;
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

  $: visibleStates = Object.fromEntries(
    Object.entries(states).map(([name, list]) => [name, withSharedDisabled(list, shared.varSet)]),
  ) as Record<string, Token[]>;
</script>

<ComponentEditorBase {component} title="Collapsible Section" description="Expandable section with chevron toggle. Import from <code>components/CollapsibleSection.svelte</code>" tokens={allTokens} {shared}>
  <VariantGroup
    name="collapsible"
    title="Collapsible Section"
    states={visibleStates}
    {typeGroups}
    {component}
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
