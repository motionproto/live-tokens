<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let active: boolean = false;
  export let icon: string;
  export let label: string;
  export let color: string = 'var(--text-secondary)';
  let className: string = '';
  export { className as class };

  const dispatch = createEventDispatcher();
</script>

<button
  class="radio-button {className}"
  class:active
  style="--radio-color: {color};"
  on:click={() => dispatch('click')}
>
  <span class="radio-dot" class:filled={active}></span>
  <i class={icon + ' fa-fw radio-icon'}></i>
  <span class="radio-label">{label}</span>
</button>

<style lang="scss">
  .radio-button {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-4);
    width: 120px;
    height: 1rem;
    padding: 0 var(--space-4);
    background: transparent;
    border: none;
    border-radius: var(--radio-radius);
    cursor: pointer;
    transition: all 0.2s ease;
    line-height: 1;

    &:hover,
    &.force-hover {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--radio-color) 12%, var(--radio-surface)),
        var(--radio-surface)
      );
    }

    &.active {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--radio-color) 15%, var(--radio-surface)),
        color-mix(in srgb, var(--radio-color) 5%, var(--radio-surface))
      );
    }
  }

  .radio-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    border: 2px solid var(--radio-dot-border);
    flex-shrink: 0;
    transition: all 0.2s ease;

    .radio-button:hover &,
    .radio-button.force-hover & {
      border-color: var(--radio-color);
    }

    &.filled {
      border-color: var(--radio-color);
      background: var(--radio-color);
      box-shadow: inset 0 0 0 2px var(--radio-surface);
    }
  }

  .radio-icon {
    font-size: var(--font-lg);
    color: var(--radio-color);
    line-height: 1;
  }

  .radio-label {
    font-size: var(--font-md);
    font-weight: var(--font-weight-bold);
    color: var(--radio-label);
    line-height: 1;
  }
</style>
