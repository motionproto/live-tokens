<script lang="ts">
  import TabBar from '../../components/TabBar.svelte';
  import TokenMap from '../TokenMap.svelte';

  let selectedDemoTab = 'overview';
  const demoTabs = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-home' },
    { id: 'details', label: 'Details', icon: 'fas fa-info-circle' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' },
    { id: 'disabled', label: 'Disabled', icon: 'fas fa-ban', disabled: true }
  ];
</script>

<div class="demo-block">
  <h2 class="component-title">Tab Bar Component</h2>
  <p class="demo-description">
    Tab navigation with icon support and disabled state. Import from <code>components/TabBar.svelte</code>
  </p>

  <div class="demo-section">
    <TabBar
      tabs={demoTabs}
      selectedTab={selectedDemoTab}
      on:tabChange={(e) => selectedDemoTab = e.detail}
    />
    <div class="tab-content-demo">
      {#if selectedDemoTab === 'overview'}
        <p style="margin: 0;">Overview tab content</p>
      {:else if selectedDemoTab === 'details'}
        <p style="margin: 0;">Details tab content</p>
      {:else if selectedDemoTab === 'settings'}
        <p style="margin: 0;">Settings tab content</p>
      {/if}
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Tokens</h3>
    <TokenMap tokens={[
      { label: 'Default Text', variable: '--text-tertiary' },
      { label: 'Hover Text', variable: '--text-secondary' },
      { label: 'Active Text', variable: '--text-primary' },
      { label: 'Active Border', variable: '--color-primary-500' },
      { label: 'Divider', variable: '--border-neutral-subtle' },
    ]} />
  </div>
</div>

<style>
  @import '../../styles/variables.css';

  .tab-content-demo {
    padding: var(--space-16);
    color: var(--ui-text-secondary);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
  }
</style>
