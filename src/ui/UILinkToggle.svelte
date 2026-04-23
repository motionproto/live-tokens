<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let linked: boolean = false;

  const dispatch = createEventDispatcher();

  function handleClick(e: Event) {
    e.stopPropagation();
    dispatch('toggle');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  }
</script>

<span
  class="ui-link-toggle"
  class:linked
  role="button"
  tabindex="0"
  title={linked ? 'Locked across variants — click to unlock' : 'Click to lock across all variants'}
  on:click={handleClick}
  on:keydown={handleKeydown}
>
  <i class="fas" class:fa-lock={linked} class:fa-lock-open={!linked}></i>
</span>

<style>
  .ui-link-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    color: var(--ui-text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    border-radius: var(--ui-radius-sm);
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .ui-link-toggle:hover {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .ui-link-toggle.linked {
    color: var(--ui-text-accent);
  }
</style>
