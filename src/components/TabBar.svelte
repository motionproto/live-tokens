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
    /* Bar */
    --tabbar-bar-divider: var(--border-neutral-subtle);
    --tabbar-bar-divider-thickness: var(--border-width-thin);
    --tabbar-bar-radius: var(--radius-md);
    --tabbar-bar-padding: var(--space-8);

    /* Default tab */
    --tabbar-default-text: var(--text-tertiary);
    --tabbar-default-text-font-family: var(--font-sans);
    --tabbar-default-text-font-size: var(--font-size-md);
    --tabbar-default-text-font-weight: var(--font-weight-light);
    --tabbar-default-text-line-height: var(--line-height-normal);
    --tabbar-default-icon-size: var(--font-size-md);
    --tabbar-default-padding: var(--space-8);
    --tabbar-default-border-width: var(--border-width-default);

    /* Hover tab */
    --tabbar-hover-text: var(--text-secondary);
    --tabbar-hover-surface: var(--surface-neutral-lower);
    --tabbar-hover-text-font-family: var(--font-sans);
    --tabbar-hover-text-font-size: var(--font-size-md);
    --tabbar-hover-text-font-weight: var(--font-weight-light);
    --tabbar-hover-text-line-height: var(--line-height-normal);
    --tabbar-hover-icon-size: var(--font-size-md);
    --tabbar-hover-padding: var(--space-8);
    --tabbar-hover-border-width: var(--border-width-default);

    /* Active tab */
    --tabbar-active-text: var(--text-primary);
    --tabbar-active-border: var(--color-primary-500);
    --tabbar-active-surface: var(--overlay-lowest);
    --tabbar-active-text-font-family: var(--font-sans);
    --tabbar-active-text-font-size: var(--font-size-md);
    --tabbar-active-text-font-weight: var(--font-weight-light);
    --tabbar-active-text-line-height: var(--line-height-normal);
    --tabbar-active-icon-size: var(--font-size-md);
    --tabbar-active-padding: var(--space-8);
    --tabbar-active-border-width: var(--border-width-default);
  }

  .tab-bar {
    display: flex;
    gap: var(--space-2);
    border-bottom: var(--tabbar-bar-divider-thickness) solid var(--tabbar-bar-divider);
    border-radius: var(--tabbar-bar-radius);
    padding: 0 var(--tabbar-bar-padding);
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    padding: var(--tabbar-default-padding) calc(var(--tabbar-default-padding) * 2);
    background: transparent;
    border: none;
    border-bottom: var(--tabbar-default-border-width) solid transparent;
    color: var(--tabbar-default-text);
    font-family: var(--tabbar-default-text-font-family);
    font-size: var(--tabbar-default-text-font-size);
    font-weight: var(--tabbar-default-text-font-weight);
    line-height: var(--tabbar-default-text-line-height);
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
  }

  .tab:hover:not(:disabled):not(.active),
  .tab-bar.force-hover .tab:not(:disabled):not(.active) {
    color: var(--tabbar-hover-text);
    background: var(--tabbar-hover-surface);
    font-family: var(--tabbar-hover-text-font-family);
    font-size: var(--tabbar-hover-text-font-size);
    font-weight: var(--tabbar-hover-text-font-weight);
    line-height: var(--tabbar-hover-text-line-height);
    padding: var(--tabbar-hover-padding) calc(var(--tabbar-hover-padding) * 2);
    border-bottom-width: var(--tabbar-hover-border-width);
  }

  .tab.active {
    color: var(--tabbar-active-text);
    border-bottom: var(--tabbar-active-border-width) solid var(--tabbar-active-border);
    background: linear-gradient(to bottom, transparent, var(--tabbar-active-surface));
    font-family: var(--tabbar-active-text-font-family);
    font-size: var(--tabbar-active-text-font-size);
    font-weight: var(--tabbar-active-text-font-weight);
    line-height: var(--tabbar-active-text-line-height);
    padding: var(--tabbar-active-padding) calc(var(--tabbar-active-padding) * 2);
  }

  .tab:disabled {
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  .tab.icon-only {
    padding: var(--space-8) var(--space-12);
  }

  .tab:hover:not(:disabled):not(.active) i,
  .tab-bar.force-hover .tab:not(:disabled):not(.active) i {
    font-size: var(--tabbar-hover-icon-size);
  }

  .tab.active i {
    font-size: var(--tabbar-active-icon-size);
  }

  .tab i {
    font-size: var(--tabbar-default-icon-size);
  }
</style>
