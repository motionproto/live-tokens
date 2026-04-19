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
  title={linked ? 'Linked across variants — click to unlink' : 'Click to share across all variants'}
  on:click={handleClick}
  on:keydown={handleKeydown}
>
  <i class="fas" class:fa-link={linked} class:fa-unlink={!linked}></i>
</span>

<style>
  .ui-link-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    color: var(--ui-text-muted);
    font-size: 0.625rem;
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
