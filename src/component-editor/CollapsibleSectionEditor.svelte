<script lang="ts">
  import CollapsibleSection from '../components/CollapsibleSection.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import DemoHeader from './scaffolding/DemoHeader.svelte';

  const targetFile = 'src/components/CollapsibleSection.svelte';
  const component = 'collapsiblesection';

  let demoExpanded = false;

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface color', variable: '--collapsible-default-surface' },
      { label: 'label color', variable: '--collapsible-default-label' },
      { label: 'toggle icon color', variable: '--collapsible-default-icon' },
      { label: 'border color', variable: '--collapsible-default-border' },
      { label: 'radius', canBeShared: true, variable: '--collapsible-default-radius' },
    ],
    hover: [
      { label: 'surface color', variable: '--collapsible-hover-surface' },
      { label: 'label color', variable: '--collapsible-hover-label' },
      { label: 'toggle icon color', variable: '--collapsible-hover-icon' },
      { label: 'border color', variable: '--collapsible-hover-border' },
      { label: 'radius', canBeShared: true, variable: '--collapsible-hover-radius' },
    ],
    active: [
      { label: 'surface color', variable: '--collapsible-active-surface' },
      { label: 'label color', variable: '--collapsible-active-label' },
      { label: 'toggle icon color', variable: '--collapsible-active-icon' },
      { label: 'border color', variable: '--collapsible-active-border' },
      { label: 'radius', canBeShared: true, variable: '--collapsible-active-radius' },
    ],
  };
</script>

<div class="demo-block">
  <DemoHeader
    {component}
    title="Collapsible Section Component"
    description="Expandable section with chevron toggle. Import from <code>components/CollapsibleSection.svelte</code>"
  />

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
</div>

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
