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

  const dispatch = createEventDispatcher<{
    tabChange: string;
  }>();

  function selectTab(tab: Tab) {
    if (!tab.disabled) {
      dispatch('tabChange', tab.id);
    }
  }
</script>

<div class="tab-bar">
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
  .tab-bar {
    display: flex;
    gap: var(--space-2);
    border-bottom: 1px solid var(--border-neutral-subtle);
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
    color: var(--text-tertiary);
    font-size: var(--font-md);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
  }

  .tab:hover:not(:disabled):not(.active) {
    color: var(--text-secondary);
    background: var(--hover-low);
  }

  .tab.active {
    color: var(--text-primary);
    border-bottom-color: var(--color-primary-500);
    background: linear-gradient(to bottom, transparent, var(--overlay-lowest));
  }

  .tab:disabled {
    opacity: var(--opacity-disabled);
    cursor: not-allowed;
  }

  .tab.icon-only {
    padding: var(--space-8) var(--space-12);
  }

  .tab i {
    font-size: var(--font-md);
  }
</style>
