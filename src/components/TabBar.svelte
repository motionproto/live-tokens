<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Tab {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
  }

  interface Props {
    tabs?: Tab[];
    selectedTab?: string;
    iconOnly?: boolean;
    class?: string;
    /** Tab-change callback. Preferred over `on:tabChange` from 0.5.0 onward. */
    ontabChange?: (id: string) => void;
  }

  let {
    tabs = [],
    selectedTab = '',
    iconOnly = false,
    class: className = '',
    ontabChange
  }: Props = $props();

  // Dual-fire bridge — see Button.svelte for the deprecation timeline.
  const dispatch = createEventDispatcher<{
    tabChange: string;
  }>();

  function selectTab(tab: Tab) {
    if (!tab.disabled) {
      ontabChange?.(tab.id);
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
      onclick={() => selectTab(tab)}
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

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    /* Bar */
    --tabbar-bar-divider: var(--border-neutral-subtle);
    --tabbar-bar-divider-thickness: var(--border-width-1);
    --tabbar-bar-indicator-thickness: var(--border-width-2);
    --tabbar-bar-top-margin: var(--space-0);
    --tabbar-bar-bottom-padding: var(--space-0);
    --tabbar-bar-bottom-margin: var(--space-0);
    --tabbar-tab-gap: var(--space-2);

    /* Default tab */
    --tabbar-default-text: var(--text-tertiary);
    --tabbar-default-text-font-family: var(--font-sans);
    --tabbar-default-text-font-size: var(--font-size-md);
    --tabbar-default-text-font-weight: var(--font-weight-light);
    --tabbar-default-text-line-height: var(--line-height-md);
    --tabbar-default-icon-size: var(--icon-size-md);
    --tabbar-default-padding: var(--space-8);
    --tabbar-default-border: var(--color-transparent);
    --tabbar-default-surface: var(--color-transparent);
    --tabbar-default-tab-border-color: var(--color-transparent);
    --tabbar-default-tab-border-width: var(--border-width-0);
    --tabbar-default-tab-top-radius: var(--radius-none);
    --tabbar-default-tab-bottom-radius: var(--radius-none);

    /* Hover tab */
    --tabbar-hover-text: var(--text-secondary);
    --tabbar-hover-surface: var(--surface-neutral-lower);
    --tabbar-hover-text-font-family: var(--font-sans);
    --tabbar-hover-text-font-size: var(--font-size-md);
    --tabbar-hover-text-font-weight: var(--font-weight-light);
    --tabbar-hover-text-line-height: var(--line-height-md);
    --tabbar-hover-icon-size: var(--icon-size-md);
    --tabbar-hover-padding: var(--space-8);
    --tabbar-hover-border: var(--color-transparent);
    --tabbar-hover-tab-border-color: var(--color-transparent);
    --tabbar-hover-tab-border-width: var(--border-width-0);
    --tabbar-hover-tab-top-radius: var(--radius-none);
    --tabbar-hover-tab-bottom-radius: var(--radius-none);

    /* Active tab */
    --tabbar-active-text: var(--text-primary);
    --tabbar-active-border: var(--color-brand-500);
    --tabbar-active-surface: var(--overlay-lowest);
    --tabbar-active-text-font-family: var(--font-sans);
    --tabbar-active-text-font-size: var(--font-size-md);
    --tabbar-active-text-font-weight: var(--font-weight-light);
    --tabbar-active-text-line-height: var(--line-height-md);
    --tabbar-active-icon-size: var(--icon-size-md);
    --tabbar-active-padding: var(--space-8);
    --tabbar-active-tab-border-color: var(--color-transparent);
    --tabbar-active-tab-border-width: var(--border-width-0);
    --tabbar-active-tab-top-radius: var(--radius-none);
    --tabbar-active-tab-bottom-radius: var(--radius-none);

    /* Disabled tab */
    --tabbar-disabled-text: var(--text-disabled);
    --tabbar-disabled-text-font-family: var(--font-sans);
    --tabbar-disabled-text-font-size: var(--font-size-md);
    --tabbar-disabled-text-font-weight: var(--font-weight-light);
    --tabbar-disabled-text-line-height: var(--line-height-md);
    --tabbar-disabled-icon-size: var(--icon-size-md);
    --tabbar-disabled-padding: var(--space-8);
    --tabbar-disabled-border: var(--color-transparent);
    --tabbar-disabled-surface: var(--color-transparent);
    --tabbar-disabled-tab-border-color: var(--color-transparent);
    --tabbar-disabled-tab-border-width: var(--border-width-0);
    --tabbar-disabled-tab-top-radius: var(--radius-none);
    --tabbar-disabled-tab-bottom-radius: var(--radius-none);
  }

  .tab-bar {
    display: flex;
    gap: var(--tabbar-tab-gap);
    border-bottom: var(--tabbar-bar-divider-thickness) solid var(--tabbar-bar-divider);
    margin-top: var(--tabbar-bar-top-margin);
    padding-bottom: var(--tabbar-bar-bottom-padding);
    margin-bottom: var(--tabbar-bar-bottom-margin);
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    @include themed-padding(--tabbar-default-padding, $h: 2);
    background: var(--tabbar-default-surface);
    border: var(--tabbar-default-tab-border-width) solid var(--tabbar-default-tab-border-color);
    /* indicator accent — owns the bottom edge */
    border-bottom: var(--tabbar-bar-indicator-thickness) solid var(--tabbar-default-border);
    border-radius: var(--tabbar-default-tab-top-radius) var(--tabbar-default-tab-top-radius) var(--tabbar-default-tab-bottom-radius) var(--tabbar-default-tab-bottom-radius);
    color: var(--tabbar-default-text);
    font-family: var(--tabbar-default-text-font-family);
    font-size: var(--tabbar-default-text-font-size);
    font-weight: var(--tabbar-default-text-font-weight);
    line-height: var(--tabbar-default-text-line-height);
    cursor: pointer;
    transition: all var(--duration-150);
    position: relative;
  }

  .tab:hover:not(:disabled):not(.active),
  .tab-bar.force-hover .tab:not(:disabled):not(.active) {
    color: var(--tabbar-hover-text);
    background: var(--tabbar-hover-surface);
    border-color: var(--tabbar-hover-tab-border-color);
    border-width: var(--tabbar-hover-tab-border-width);
    /* indicator accent owns the bottom edge */
    border-bottom: var(--tabbar-bar-indicator-thickness) solid var(--tabbar-hover-border);
    border-radius: var(--tabbar-hover-tab-top-radius) var(--tabbar-hover-tab-top-radius) var(--tabbar-hover-tab-bottom-radius) var(--tabbar-hover-tab-bottom-radius);
    font-family: var(--tabbar-hover-text-font-family);
    font-size: var(--tabbar-hover-text-font-size);
    font-weight: var(--tabbar-hover-text-font-weight);
    line-height: var(--tabbar-hover-text-line-height);
    @include themed-padding(--tabbar-hover-padding, $h: 2);
  }

  .tab.active {
    color: var(--tabbar-active-text);
    background: var(--tabbar-active-surface);
    border-color: var(--tabbar-active-tab-border-color);
    border-width: var(--tabbar-active-tab-border-width);
    /* indicator accent owns the bottom edge */
    border-bottom: var(--tabbar-bar-indicator-thickness) solid var(--tabbar-active-border);
    border-radius: var(--tabbar-active-tab-top-radius) var(--tabbar-active-tab-top-radius) var(--tabbar-active-tab-bottom-radius) var(--tabbar-active-tab-bottom-radius);
    font-family: var(--tabbar-active-text-font-family);
    font-size: var(--tabbar-active-text-font-size);
    font-weight: var(--tabbar-active-text-font-weight);
    line-height: var(--tabbar-active-text-line-height);
    @include themed-padding(--tabbar-active-padding, $h: 2);
  }

  .tab:disabled {
    color: var(--tabbar-disabled-text);
    background: var(--tabbar-disabled-surface);
    border-color: var(--tabbar-disabled-tab-border-color);
    border-width: var(--tabbar-disabled-tab-border-width);
    /* indicator accent owns the bottom edge */
    border-bottom: var(--tabbar-bar-indicator-thickness) solid var(--tabbar-disabled-border);
    border-radius: var(--tabbar-disabled-tab-top-radius) var(--tabbar-disabled-tab-top-radius) var(--tabbar-disabled-tab-bottom-radius) var(--tabbar-disabled-tab-bottom-radius);
    font-family: var(--tabbar-disabled-text-font-family);
    font-size: var(--tabbar-disabled-text-font-size);
    font-weight: var(--tabbar-disabled-text-font-weight);
    line-height: var(--tabbar-disabled-text-line-height);
    @include themed-padding(--tabbar-disabled-padding, $h: 2);
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

  .tab:disabled i {
    font-size: var(--tabbar-disabled-icon-size);
  }

  .tab i {
    font-size: var(--tabbar-default-icon-size);
  }
</style>
