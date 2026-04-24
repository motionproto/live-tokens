<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Tab {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
  }

  export let tabs: Tab[] = [];
  export let selectedTab: string = '';
  export let iconOnly: boolean = false;
  let className: string = '';
  export { className as class };

  const dispatch = createEventDispatcher<{
    tabChange: string;
  }>();

  function selectTab(tab: Tab) {
    if (!tab.disabled) {
      dispatch('tabChange', tab.id);
    }
  }
</script>

<div class="tab-bar {className}">
  {#each tabs as tab}
    <button
      class="tab"
      class:active={selectedTab === tab.id}
      class:icon-only={iconOnly}
      disabled={tab.disabled}
      on:click={() => selectTab(tab)}
    >
      {#if tab.icon}
        <i class={tab.icon}></i>
      {/if}
      {#if !iconOnly}
        <span>{tab.label}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  :global(:root) {
    /* Shared */
    --tabbar-divider: var(--border-neutral-subtle);
    --tabbar-radius: var(--radius-md);

    /* Default state */
    --tabbar-default-text: var(--text-tertiary);

    /* Hover state */
    --tabbar-hover-text: var(--text-secondary);
    --tabbar-hover-bg: var(--hover-low);

    /* Active state */
    --tabbar-active-text: var(--text-primary);
    --tabbar-active-border: var(--color-primary-500);
    --tabbar-active-bg-gradient: var(--overlay-lowest);
  }

  .tab-bar {
    display: flex;
    gap: var(--space-2);
    border-bottom: 1px solid var(--tabbar-divider);
    padding: 0 var(--space-8);
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-8) var(--space-16);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--tabbar-default-text);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-light);
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
  }

  .tab:hover:not(:disabled):not(.active),
  .tab-bar.force-hover .tab:not(:disabled):not(.active) {
    color: var(--tabbar-hover-text);
    background: var(--tabbar-hover-bg);
  }

  .tab.active {
    color: var(--tabbar-active-text);
    border-bottom-color: var(--tabbar-active-border);
    background: linear-gradient(to bottom, transparent, var(--tabbar-active-bg-gradient));
  }

  .tab:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
  }

  .tab.icon-only {
    padding: var(--space-8) var(--space-12);
  }

  .tab i {
    font-size: var(--font-size-md);
  }
</style>
