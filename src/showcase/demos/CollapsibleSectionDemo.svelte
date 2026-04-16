<script lang="ts">
  import CollapsibleSection from '../../components/CollapsibleSection.svelte';
  import TokenMap from '../TokenMap.svelte';

  let demoExpanded = false;
</script>

<div class="demo-block">
  <h2 class="component-title">Collapsible Section Component</h2>
  <p class="demo-description">
    Expandable section with chevron toggle. Import from <code>components/CollapsibleSection.svelte</code>
  </p>

  <div class="demo-section">
    <div class="collapsible-demo-wrapper">
      <CollapsibleSection
        label="Click to expand"
        expanded={demoExpanded}
        on:toggle={() => demoExpanded = !demoExpanded}
      />
      {#if demoExpanded}
        <div class="collapsible-demo-content">
          <p style="margin: 0; color: var(--text-secondary);">
            This content is revealed when the section is expanded. Any content can go here.
          </p>
        </div>
      {/if}
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Tokens</h3>
    <TokenMap tokens={[
      { label: 'Active BG', variable: '--surface-primary-lowest' },
      { label: 'Active Border', variable: '--color-primary-400' },
      { label: 'Label', variable: '--text-primary' },
      { label: 'Toggle Icon', variable: '--text-muted' },
    ]} />
  </div>
</div>

<style>
  @import '../../styles/variables.css';

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
