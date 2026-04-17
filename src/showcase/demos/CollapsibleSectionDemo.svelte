<script lang="ts">
  import CollapsibleSection from '../../components/CollapsibleSection.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/CollapsibleSection.svelte';

  let demoExpanded = false;

  type Token = { label: string; variable: string };

  const states: Record<string, Token[]> = {
    default: [
      { label: 'BG', variable: '--collapsible-default-surface' },
      { label: 'Label', variable: '--collapsible-default-label' },
      { label: 'Toggle Icon', variable: '--collapsible-default-icon' },
      { label: 'Border', variable: '--collapsible-default-border' },
      { label: 'Radius', variable: '--collapsible-default-radius' },
    ],
    hover: [
      { label: 'BG', variable: '--collapsible-hover-surface' },
      { label: 'Label', variable: '--collapsible-hover-label' },
      { label: 'Toggle Icon', variable: '--collapsible-hover-icon' },
      { label: 'Border', variable: '--collapsible-hover-border' },
      { label: 'Radius', variable: '--collapsible-hover-radius' },
    ],
    active: [
      { label: 'BG', variable: '--collapsible-active-surface' },
      { label: 'Label', variable: '--collapsible-active-label' },
      { label: 'Toggle Icon', variable: '--collapsible-active-icon' },
      { label: 'Border', variable: '--collapsible-active-border' },
      { label: 'Radius', variable: '--collapsible-active-radius' },
    ],
  };
</script>

<div class="demo-block">
  <h2 class="component-title">Collapsible Section Component</h2>
  <p class="demo-description">
    Expandable section with chevron toggle. Import from <code>components/CollapsibleSection.svelte</code>
  </p>

  <VariantGroup name="collapsible" title="Collapsible Section" {states} {targetFile} let:activeState>
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
