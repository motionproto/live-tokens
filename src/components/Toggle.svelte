<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let checked: boolean = false;
  export let disabled: boolean = false;
  export let label: string = '';

  const dispatch = createEventDispatcher<{ change: boolean }>();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    dispatch('change', checked);
  }
</script>

<label class="toggle" class:disabled>
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    {disabled}
    class="toggle-track"
    class:on={checked}
    on:click={toggle}
  >
    <span class="toggle-thumb" />
  </button>
  {#if label}
    <span class="toggle-label">{label}</span>
  {/if}
</label>

<style lang="scss">
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
    cursor: pointer;
    user-select: none;

    &.disabled {
      opacity: var(--opacity-disabled);
      cursor: not-allowed;
    }
  }

  .toggle-track {
    position: relative;
    width: 2.25rem;
    height: 1.25rem;
    border-radius: 0.625rem;
    border: 1px solid var(--border-neutral-default);
    background: var(--surface-neutral-low);
    padding: 0;
    cursor: inherit;
    transition: background var(--transition-fast), border-color var(--transition-fast);
    flex-shrink: 0;

    &.on {
      background: var(--surface-primary-high);
      border-color: var(--border-neutral-medium);
    }

    &:hover:not(:disabled) {
      border-color: var(--border-neutral-medium);
    }

    &:focus-visible {
      outline: 2px solid var(--border-primary);
      outline-offset: 2px;
    }
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 50%;
    background: var(--text-secondary);
    transition: transform var(--transition-fast), background var(--transition-fast);

    .on & {
      transform: translateX(1rem);
      background: var(--text-primary);
    }
  }

  .toggle-label {
    font-size: var(--font-size-md);
    color: var(--text-secondary);
    line-height: 1;
  }
</style>
