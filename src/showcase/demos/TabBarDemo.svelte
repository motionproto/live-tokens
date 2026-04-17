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
      { label: 'text color', variable: '--tabbar-default-text' },
      { label: 'divider color', variable: '--tabbar-divider' },
      { label: 'active border color', variable: '--tabbar-active-border' },
      { label: 'radius', variable: '--tabbar-radius' },
    ],
    hover: [
      { label: 'text color', variable: '--tabbar-hover-text' },
      { label: 'surface color', variable: '--tabbar-hover-bg' },
      { label: 'divider color', variable: '--tabbar-divider' },
      { label: 'active border color', variable: '--tabbar-active-border' },
      { label: 'radius', variable: '--tabbar-radius' },
    ],
    active: [
      { label: 'text color', variable: '--tabbar-active-text' },
      { label: 'active border color', variable: '--tabbar-active-border' },
      { label: 'gradient surface color', variable: '--tabbar-active-bg-gradient' },
      { label: 'divider color', variable: '--tabbar-divider' },
      { label: 'radius', variable: '--tabbar-radius' },
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
