<script lang="ts">
  import UIMenuButton from '../editor/ui/UIMenuButton.svelte';
  import UIOptionList from '../editor/ui/UIOptionList.svelte';
  import UIOptionItem from '../editor/ui/UIOptionItem.svelte';

  interface Props {
    label: string;
    items: { value: string; label: string }[];
    value: string;
    /** Trigger text when `value` matches no item. Defaults to the label. */
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    onchange: (value: string) => void;
  }

  let {
    label: heading,
    items,
    value,
    placeholder = heading,
    disabled = false,
    error = '',
    onchange,
  }: Props = $props();

  const selectedLabel = $derived(items.find((item) => item.value === value)?.label ?? placeholder);

  function select(next: string, close: () => void): void {
    close();
    if (next === value) return;
    onchange(next);
  }
</script>

<!-- LabeledSelect's twin in the editor's --ui-* chrome. It needs an
     .editor-page ancestor, which scopes those tokens and hosts the menu. -->
<div class="chrome-select" inert={disabled || items.length === 0}>
  <span class="chrome-select-label">{heading}</span>

  <UIMenuButton header={heading} triggerClass="chrome-select-trigger" menuMinWidth="12rem">
    {#snippet trigger()}
      <span>{selectedLabel}</span>
      <i class="fas fa-chevron-down" aria-hidden="true"></i>
    {/snippet}
    {#snippet children({ close })}
      <UIOptionList>
        {#each items as item (item.value)}
          <UIOptionItem active={item.value === value} onclick={() => select(item.value, close)}>
            {#snippet label()}{item.label}{/snippet}
          </UIOptionItem>
        {/each}
      </UIOptionList>
    {/snippet}
  </UIMenuButton>

  {#if error}
    <span class="error" aria-live="polite">{error}</span>
  {/if}
</div>

<style>
  .chrome-select {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .chrome-select[inert] {
    opacity: var(--ui-opacity-disabled);
  }

  .chrome-select-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  .chrome-select :global(.chrome-select-trigger) {
    min-width: 9rem;
    justify-content: space-between;
    gap: var(--ui-space-12);
    padding: var(--ui-space-6) var(--ui-space-10);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-primary);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    transition:
      background var(--ui-transition-fast),
      border-color var(--ui-transition-fast);
  }

  .chrome-select :global(.chrome-select-trigger:hover),
  .chrome-select :global(.chrome-select-trigger[aria-expanded='true']) {
    background: var(--ui-surface-highest);
    border-color: var(--ui-border-higher);
  }

  .chrome-select :global(.chrome-select-trigger .fa-chevron-down) {
    font-size: 0.625rem;
    color: var(--ui-text-secondary);
  }

  .error {
    max-width: 20rem;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-link-broken);
  }
</style>
