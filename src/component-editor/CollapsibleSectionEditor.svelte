<script lang="ts">
  import CollapsibleSection from '../components/CollapsibleSection.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';

  const component = 'collapsiblesection';

  let demoExpanded = false;

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', variable: '--collapsiblesection-default-surface' },
      { label: 'label color', variable: '--collapsiblesection-default-label' },
      { label: 'toggle icon color', variable: '--collapsiblesection-default-icon' },
      { label: 'border color', variable: '--collapsiblesection-default-border' },
      { label: 'radius', canBeShared: true, variable: '--collapsiblesection-default-radius' },
    ],
    hover: [
      { label: 'surface color', variable: '--collapsiblesection-hover-surface' },
      { label: 'label color', variable: '--collapsiblesection-hover-label' },
      { label: 'toggle icon color', variable: '--collapsiblesection-hover-icon' },
      { label: 'border color', variable: '--collapsiblesection-hover-border' },
      { label: 'radius', canBeShared: true, variable: '--collapsiblesection-hover-radius' },
    ],
    active: [
      { label: 'surface color', variable: '--collapsiblesection-active-surface' },
      { label: 'label color', variable: '--collapsiblesection-active-label' },
      { label: 'toggle icon color', variable: '--collapsiblesection-active-icon' },
      { label: 'border color', variable: '--collapsiblesection-active-border' },
      { label: 'radius', canBeShared: true, variable: '--collapsiblesection-active-radius' },
    ],
  };
</script>

<ComponentEditorBase {component} title="Collapsible Section" description="Expandable section with chevron toggle. Import from <code>components/CollapsibleSection.svelte</code>" let:targetFile>
  <VariantGroup name="collapsible" title="Collapsible Section" {states} {targetFile} {component} let:activeState>
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
