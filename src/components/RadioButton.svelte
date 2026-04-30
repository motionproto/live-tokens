<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let active: boolean = false;
  export let label: string;
  export let color: string = '';
  let className: string = '';
  export { className as class };

  const dispatch = createEventDispatcher();
</script>

<button
  class="radio-button {className}"
  class:active
  style={color ? `--radiobutton-color: ${color};` : ''}
  on:click={() => dispatch('click')}
>
  <span class="radio-dot"></span>
  <span class="radio-label">{label}</span>
</button>

<style lang="scss">
  :global(:root) {
    /* Default */
    --radiobutton-default-dot-border-color: var(--border-neutral);
    --radiobutton-default-dot-border-width: var(--border-width-default);
    --radiobutton-default-dot-fill: var(--text-secondary);
    --radiobutton-default-dot-size: var(--dot-size-0);
    --radiobutton-default-label: var(--text-primary);
    --radiobutton-default-label-font-family: var(--font-sans);
    --radiobutton-default-label-font-size: var(--font-size-md);
    --radiobutton-default-label-font-weight: var(--font-weight-semibold);
    --radiobutton-default-label-line-height: var(--line-height-tight);

    /* Hover */
    --radiobutton-hover-dot-border-color: var(--border-neutral);
    --radiobutton-hover-dot-border-width: var(--border-width-default);
    --radiobutton-hover-dot-fill: var(--text-secondary);
    --radiobutton-hover-dot-size: var(--dot-size-50);
    --radiobutton-hover-label: var(--text-primary);
    --radiobutton-hover-label-font-family: var(--font-sans);
    --radiobutton-hover-label-font-size: var(--font-size-md);
    --radiobutton-hover-label-font-weight: var(--font-weight-semibold);
    --radiobutton-hover-label-line-height: var(--line-height-tight);

    /* Active */
    --radiobutton-active-dot-border-color: var(--border-neutral);
    --radiobutton-active-dot-border-width: var(--border-width-default);
    --radiobutton-active-dot-fill: var(--text-secondary);
    --radiobutton-active-dot-size: var(--dot-size-50);
    --radiobutton-active-label: var(--text-primary);
    --radiobutton-active-label-font-family: var(--font-sans);
    --radiobutton-active-label-font-size: var(--font-size-md);
    --radiobutton-active-label-font-weight: var(--font-weight-semibold);
    --radiobutton-active-label-line-height: var(--line-height-tight);
  }

  .radio-button {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--space-8);
    height: 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all var(--transition-base);
    line-height: var(--line-height-tight);

    &:hover,
    &.force-hover {
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--radiobutton-color) 12%, var(--surface-neutral-lowest)),
        var(--surface-neutral-lowest)
      );

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
        color-mix(in srgb, var(--radiobutton-color) 15%, var(--surface-neutral-lowest)),
        color-mix(in srgb, var(--radiobutton-color) 5%, var(--surface-neutral-lowest))
      );

      .radio-label {
        color: var(--radiobutton-active-label);
        font-family: var(--radiobutton-active-label-font-family);
        font-size: var(--radiobutton-active-label-font-size);
        font-weight: var(--radiobutton-active-label-font-weight);
        line-height: var(--radiobutton-active-label-line-height);
      }

      .radio-dot {
        border: var(--radiobutton-active-dot-border-width) solid var(--radiobutton-color, var(--radiobutton-active-dot-border-color));

        &::after {
          width: var(--radiobutton-active-dot-size);
          height: var(--radiobutton-active-dot-size);
          background: var(--radiobutton-color, var(--radiobutton-active-dot-fill));
        }
      }
    }
  }

  .radio-dot {
    position: relative;
    width: var(--space-12);
    height: var(--space-12);
    border-radius: var(--radius-full);
    border: var(--radiobutton-default-dot-border-width) solid var(--radiobutton-default-dot-border-color);
    flex-shrink: 0;
    transition: all var(--transition-base);

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: var(--radiobutton-default-dot-size);
      height: var(--radiobutton-default-dot-size);
      background: var(--radiobutton-color, var(--radiobutton-default-dot-fill));
      border-radius: var(--radius-full);
      transform: translate(-50%, -50%);
      transition: all var(--transition-base);
    }

    .radio-button:hover &,
    .radio-button.force-hover & {
      border: var(--radiobutton-hover-dot-border-width) solid var(--radiobutton-color, var(--radiobutton-hover-dot-border-color));
    }

    .radio-button:hover &::after,
    .radio-button.force-hover &::after {
      width: var(--radiobutton-hover-dot-size);
      height: var(--radiobutton-hover-dot-size);
      background: var(--radiobutton-color, var(--radiobutton-hover-dot-fill));
    }
  }

  .radio-label {
    color: var(--radiobutton-default-label);
    font-family: var(--radiobutton-default-label-font-family);
    font-size: var(--radiobutton-default-label-font-size);
    font-weight: var(--radiobutton-default-label-font-weight);
    line-height: var(--radiobutton-default-label-line-height);
  }
</style>
