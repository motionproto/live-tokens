<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let linked: boolean = false;

  const dispatch = createEventDispatcher();

  function handleClick(e: Event) {
    e.stopPropagation();
    dispatch('toggle');
  }
</script>

<button
  type="button"
  class="ui-link-toggle"
  class:linked
  title={linked ? 'Locked across variants — click to unlink' : 'Click to link across all variants'}
  on:click={handleClick}
>
  <i class="fas" class:fa-lock={linked} class:fa-lock-open={!linked} aria-hidden="true"></i>
  <span>{linked ? 'Unlink' : 'Link'}</span>
</button>

<style>
  .ui-link-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-2) var(--ui-space-8);
    height: 1.5rem;
    background: none;
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-family: inherit;
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .ui-link-toggle i {
    font-size: 0.75rem;
  }

  .ui-link-toggle:hover {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
    border-color: var(--ui-border-strong);
  }

  .ui-link-toggle.linked {
    color: var(--ui-text-accent);
    border-color: var(--ui-text-accent);
  }

  .ui-link-toggle.linked:hover {
    color: var(--ui-text-primary);
  }
</style>
