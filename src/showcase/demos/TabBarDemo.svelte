<script lang="ts">
  import TabBar from '../../components/TabBar.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/TabBar.svelte';

  let selectedDemoTab = 'overview';
  const demoTabs = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-home' },
    { id: 'details', label: 'Details', icon: 'fas fa-info-circle' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' },
    { id: 'disabled', label: 'Disabled', icon: 'fas fa-ban', disabled: true },
  ];

  type Token = { label: string; variable: string };

  const tabStates: Record<string, Token[]> = {
    default: [
      { label: 'Text', variable: '--tabbar-default-text' },
      { label: 'Divider', variable: '--tabbar-divider' },
      { label: 'Active Border', variable: '--tabbar-active-border' },
      { label: 'Radius', variable: '--tabbar-radius' },
    ],
    hover: [
      { label: 'Text', variable: '--tabbar-hover-text' },
      { label: 'BG', variable: '--tabbar-hover-bg' },
      { label: 'Divider', variable: '--tabbar-divider' },
      { label: 'Active Border', variable: '--tabbar-active-border' },
      { label: 'Radius', variable: '--tabbar-radius' },
    ],
    active: [
      { label: 'Text', variable: '--tabbar-active-text' },
      { label: 'Active Border', variable: '--tabbar-active-border' },
      { label: 'Divider', variable: '--tabbar-divider' },
      { label: 'Radius', variable: '--tabbar-radius' },
    ],
  };
</script>

<div class="demo-block">
  <h2 class="component-title">Tab Bar Component</h2>
  <p class="demo-description">
    Tab navigation with icon support and disabled state. Import from <code>components/TabBar.svelte</code>
  </p>

  <VariantGroup name="tabbar" title="Tab Bar" states={tabStates} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    <TabBar
      tabs={demoTabs}
      selectedTab={selectedDemoTab}
      class={forceClass}
      on:tabChange={(e) => (selectedDemoTab = e.detail)}
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
  </VariantGroup>
</div>

<style>
  .tab-content-demo {
    padding: var(--space-16);
    color: var(--ui-text-secondary);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
  }
</style>
