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
  style="--radiobutton-color: {color};"
  on:click={() => dispatch('click')}
>
  <span class="radio-dot" class:filled={active}></span>
  <i class={icon + ' fa-fw radio-icon'}></i>
  <span class="radio-label">{label}</span>
</button>

<style lang="scss">
  :global(:root) {
    --radiobutton-dot-border: var(--border-neutral-default);
    --radiobutton-label: var(--text-primary);
    --radiobutton-surface: var(--surface-neutral-lowest);
    --radiobutton-radius: var(--radius-lg);

    --radiobutton-hover-dot-border: var(--radiobutton-dot-border);
    --radiobutton-hover-label: var(--radiobutton-label);
    --radiobutton-hover-surface: var(--radiobutton-surface);

    --radiobutton-active-dot-border: var(--radiobutton-dot-border);
    --radiobutton-active-label: var(--radiobutton-label);
    --radiobutton-active-surface: var(--radiobutton-surface);
  }

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
    border-radius: var(--radiobutton-radius);
    cursor: pointer;
    transition: all var(--transition-base);
    line-height: var(--line-height-tight);

    &:hover,
    &.force-hover {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--radiobutton-color) 12%, var(--radiobutton-hover-surface)),
        var(--radiobutton-hover-surface)
      );

      .radio-label {
        color: var(--radiobutton-hover-label);
      }
    }

    &.active {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--radiobutton-color) 15%, var(--radiobutton-active-surface)),
        color-mix(in srgb, var(--radiobutton-color) 5%, var(--radiobutton-active-surface))
      );

      .radio-label {
        color: var(--radiobutton-active-label);
      }

      .radio-dot:not(.filled) {
        border-color: var(--radiobutton-active-dot-border, var(--radiobutton-color));
      }
    }
  }

  .radio-dot {
    width: var(--space-12);
    height: var(--space-12);
    border-radius: var(--radius-full);
    border: var(--border-width-default) solid var(--radiobutton-dot-border);
    flex-shrink: 0;
    transition: all var(--transition-base);

    .radio-button:hover &,
    .radio-button.force-hover & {
      border-color: var(--radiobutton-hover-dot-border, var(--radiobutton-color));
    }

    &.filled {
      border-color: var(--radiobutton-color);
      background: var(--radiobutton-color);
      box-shadow: inset 0 0 0 var(--border-width-default) var(--radiobutton-surface);
    }
  }

  .radio-icon {
    font-size: var(--font-size-lg);
    color: var(--radiobutton-color);
    line-height: var(--line-height-tight);
  }

  .radio-label {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    color: var(--radiobutton-label);
    line-height: var(--line-height-tight);
  }
</style>
