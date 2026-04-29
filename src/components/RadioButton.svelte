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
    /* Default */
    --radiobutton-default-dot-border: var(--border-neutral);
    --radiobutton-default-dot-border-width: var(--border-width-default);
    --radiobutton-default-label: var(--text-primary);
    --radiobutton-default-label-font-family: var(--font-sans);
    --radiobutton-default-label-font-size: var(--font-size-md);
    --radiobutton-default-label-font-weight: var(--font-weight-semibold);
    --radiobutton-default-label-line-height: var(--line-height-tight);
    --radiobutton-default-surface: var(--surface-neutral-lowest);
    --radiobutton-default-radius: var(--radius-lg);
    --radiobutton-default-padding: var(--space-4);

    /* Hover */
    --radiobutton-hover-dot-border: var(--border-neutral);
    --radiobutton-hover-dot-border-width: var(--border-width-default);
    --radiobutton-hover-label: var(--text-primary);
    --radiobutton-hover-label-font-family: var(--font-sans);
    --radiobutton-hover-label-font-size: var(--font-size-md);
    --radiobutton-hover-label-font-weight: var(--font-weight-semibold);
    --radiobutton-hover-label-line-height: var(--line-height-tight);
    --radiobutton-hover-surface: var(--surface-neutral-lowest);
    --radiobutton-hover-radius: var(--radius-lg);
    --radiobutton-hover-padding: var(--space-4);

    /* Active */
    --radiobutton-active-dot-border: var(--border-neutral);
    --radiobutton-active-dot-border-width: var(--border-width-default);
    --radiobutton-active-label: var(--text-primary);
    --radiobutton-active-label-font-family: var(--font-sans);
    --radiobutton-active-label-font-size: var(--font-size-md);
    --radiobutton-active-label-font-weight: var(--font-weight-semibold);
    --radiobutton-active-label-line-height: var(--line-height-tight);
    --radiobutton-active-surface: var(--surface-neutral-lowest);
    --radiobutton-active-radius: var(--radius-lg);
    --radiobutton-active-padding: var(--space-4);
  }

  .radio-button {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-4);
    width: 120px;
    height: 1rem;
    padding: 0 var(--radiobutton-default-padding);
    background: transparent;
    border: none;
    border-radius: var(--radiobutton-default-radius);
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
      border-radius: var(--radiobutton-hover-radius);
      padding: 0 var(--radiobutton-hover-padding);

      .radio-label {
        color: var(--radiobutton-hover-label);
        font-family: var(--radiobutton-hover-label-font-family);
        font-size: var(--radiobutton-hover-label-font-size);
        font-weight: var(--radiobutton-hover-label-font-weight);
        line-height: var(--radiobutton-hover-label-line-height);
      }
    }

    &.active {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--radiobutton-color) 15%, var(--radiobutton-active-surface)),
        color-mix(in srgb, var(--radiobutton-color) 5%, var(--radiobutton-active-surface))
      );
      border-radius: var(--radiobutton-active-radius);
      padding: 0 var(--radiobutton-active-padding);

      .radio-label {
        color: var(--radiobutton-active-label);
        font-family: var(--radiobutton-active-label-font-family);
        font-size: var(--radiobutton-active-label-font-size);
        font-weight: var(--radiobutton-active-label-font-weight);
        line-height: var(--radiobutton-active-label-line-height);
      }

      .radio-dot:not(.filled) {
        border: var(--radiobutton-active-dot-border-width) solid var(--radiobutton-active-dot-border, var(--radiobutton-color));
      }
    }
  }

  .radio-dot {
    width: var(--space-12);
    height: var(--space-12);
    border-radius: var(--radius-full);
    border: var(--radiobutton-default-dot-border-width) solid var(--radiobutton-default-dot-border);
    flex-shrink: 0;
    transition: all var(--transition-base);

    .radio-button:hover &,
    .radio-button.force-hover & {
      border: var(--radiobutton-hover-dot-border-width) solid var(--radiobutton-hover-dot-border, var(--radiobutton-color));
    }

    &.filled {
      border-color: var(--radiobutton-color);
      background: var(--radiobutton-color);
      box-shadow: inset 0 0 0 var(--radiobutton-default-dot-border-width) var(--radiobutton-default-surface);
    }
  }

  .radio-icon {
    font-size: var(--font-size-lg);
    color: var(--radiobutton-color);
    line-height: var(--line-height-tight);
  }

  .radio-label {
    color: var(--radiobutton-default-label);
    font-family: var(--radiobutton-default-label-font-family);
    font-size: var(--radiobutton-default-label-font-size);
    font-weight: var(--radiobutton-default-label-font-weight);
    line-height: var(--radiobutton-default-label-line-height);
  }
</style>
