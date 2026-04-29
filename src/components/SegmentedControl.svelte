<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Segment = {
    value: string;
    label: string;
    icon?: string;
    disabled?: boolean;
  };

  export let segments: Segment[] = [];
  export let value: string = '';
  export let disabled: boolean = false;
  export let forceHoverValue: string | null = null;

  const dispatch = createEventDispatcher<{ change: string }>();

  function select(v: string) {
    value = v;
    dispatch('change', v);
  }
</script>

<div class="segmented-control" class:is-disabled={disabled} role="radiogroup">
  {#each segments as seg, i (seg.value)}
    {#if i > 0}
      <span class="segment-divider" aria-hidden="true"></span>
    {/if}
    <button
      type="button"
      class="segment"
      class:selected={value === seg.value}
      class:force-hover={forceHoverValue === seg.value}
      disabled={disabled || seg.disabled}
      role="radio"
      aria-checked={value === seg.value}
      on:click={() => select(seg.value)}
    >
      {#if seg.icon}<i class={seg.icon}></i>{/if}
      <span>{seg.label}</span>
    </button>
  {/each}
</div>

<style>
  :global(:root) {
    /* Bar (outer wrapper) */
    --segmentedcontrol-bar-surface: var(--surface-neutral-high);
    --segmentedcontrol-bar-border: var(--border-neutral);
    --segmentedcontrol-bar-border-width: var(--border-width-thin);
    --segmentedcontrol-bar-radius: var(--radius-lg);
    --segmentedcontrol-bar-padding: var(--space-4);
    --segmentedcontrol-bar-gap: var(--space-8);

    /* Divider (line between non-selected options) */
    --segmentedcontrol-divider-color: var(--border-neutral);
    --segmentedcontrol-divider-thickness: var(--border-width-thin);
    --segmentedcontrol-divider-height: var(--space-12);

    /* Option — default */
    --segmentedcontrol-option-text: var(--text-primary);
    --segmentedcontrol-option-text-font-family: var(--font-sans);
    --segmentedcontrol-option-text-font-size: var(--font-size-md);
    --segmentedcontrol-option-text-font-weight: var(--font-weight-normal);
    --segmentedcontrol-option-text-line-height: var(--line-height-normal);
    --segmentedcontrol-option-icon: var(--text-secondary);

    /* Option — hover */
    --segmentedcontrol-option-hover-surface: var(--surface-neutral-higher);
    --segmentedcontrol-option-hover-text: var(--text-primary);
    --segmentedcontrol-option-hover-text-font-family: var(--font-sans);
    --segmentedcontrol-option-hover-text-font-size: var(--font-size-md);
    --segmentedcontrol-option-hover-text-font-weight: var(--font-weight-normal);
    --segmentedcontrol-option-hover-text-line-height: var(--line-height-normal);
    --segmentedcontrol-option-hover-icon: var(--text-secondary);

    /* Selected (inner pill) — looks the same hovered or not */
    --segmentedcontrol-selected-surface: var(--surface-success-high);
    --segmentedcontrol-selected-text: var(--text-primary);
    --segmentedcontrol-selected-text-font-family: var(--font-sans);
    --segmentedcontrol-selected-text-font-size: var(--font-size-md);
    --segmentedcontrol-selected-text-font-weight: var(--font-weight-semibold);
    --segmentedcontrol-selected-text-line-height: var(--line-height-normal);
    --segmentedcontrol-selected-icon: var(--text-secondary);
    --segmentedcontrol-selected-border: var(--border-success);
    --segmentedcontrol-selected-border-width: var(--border-width-thin);
    --segmentedcontrol-selected-radius: var(--radius-md);

    /* Disabled (whole component state — overrides both option and selected styling) */
    --segmentedcontrol-disabled-surface: var(--surface-neutral-high);
    --segmentedcontrol-disabled-text: var(--text-tertiary);
    --segmentedcontrol-disabled-text-font-family: var(--font-sans);
    --segmentedcontrol-disabled-text-font-size: var(--font-size-md);
    --segmentedcontrol-disabled-text-font-weight: var(--font-weight-light);
    --segmentedcontrol-disabled-text-line-height: var(--line-height-normal);
    --segmentedcontrol-disabled-icon: var(--text-tertiary);
  }

  .segmented-control {
    display: inline-flex;
    align-items: stretch;
    gap: var(--segmentedcontrol-bar-gap);
    padding:
      var(--segmentedcontrol-bar-padding-top, var(--segmentedcontrol-bar-padding))
      var(--segmentedcontrol-bar-padding-right, var(--segmentedcontrol-bar-padding))
      var(--segmentedcontrol-bar-padding-bottom, var(--segmentedcontrol-bar-padding))
      var(--segmentedcontrol-bar-padding-left, var(--segmentedcontrol-bar-padding));
    background: var(--segmentedcontrol-bar-surface);
    border: var(--segmentedcontrol-bar-border-width) solid var(--segmentedcontrol-bar-border);
    border-radius: var(--segmentedcontrol-bar-radius);
  }

  .segment {
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-6) var(--space-16);
    background: transparent;
    border: 0;
    border-radius: var(--segmentedcontrol-selected-radius);
    color: var(--segmentedcontrol-option-text);
    font-family: var(--segmentedcontrol-option-text-font-family);
    font-size: var(--segmentedcontrol-option-text-font-size);
    font-weight: var(--segmentedcontrol-option-text-font-weight);
    line-height: var(--segmentedcontrol-option-text-line-height);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
    position: relative;
  }

  .segment i {
    font-size: var(--font-size-lg);
    color: var(--segmentedcontrol-option-icon);
    transition: color var(--transition-fast);
  }

  /* Short centered divider between adjacent segments. Negative margins absorb
     the surrounding flex gap so seg-to-seg distance stays var(--bar-gap). */
  .segment-divider {
    align-self: center;
    flex-shrink: 0;
    width: var(--segmentedcontrol-divider-thickness);
    height: var(--segmentedcontrol-divider-height);
    margin-inline: calc(
      var(--segmentedcontrol-bar-gap) * -0.5 - var(--segmentedcontrol-divider-thickness) * 0.5
    );
    background: var(--segmentedcontrol-divider-color);
    pointer-events: none;
  }

  .segment:hover:not(:disabled):not(.selected),
  .segment.force-hover:not(:disabled):not(.selected) {
    background: var(--segmentedcontrol-option-hover-surface);
    color: var(--segmentedcontrol-option-hover-text);
    font-family: var(--segmentedcontrol-option-hover-text-font-family);
    font-size: var(--segmentedcontrol-option-hover-text-font-size);
    font-weight: var(--segmentedcontrol-option-hover-text-font-weight);
    line-height: var(--segmentedcontrol-option-hover-text-line-height);
  }

  .segment:hover:not(:disabled):not(.selected) i,
  .segment.force-hover:not(:disabled):not(.selected) i {
    color: var(--segmentedcontrol-option-hover-icon);
  }

  .segment.selected {
    background: var(--segmentedcontrol-selected-surface);
    border: var(--segmentedcontrol-selected-border-width) solid var(--segmentedcontrol-selected-border);
    border-radius: var(--segmentedcontrol-selected-radius);
    color: var(--segmentedcontrol-selected-text);
    font-family: var(--segmentedcontrol-selected-text-font-family);
    font-size: var(--segmentedcontrol-selected-text-font-size);
    font-weight: var(--segmentedcontrol-selected-text-font-weight);
    line-height: var(--segmentedcontrol-selected-text-line-height);
    /* Account for border so the pill doesn't shift adjacent segments */
    padding: calc(var(--space-6) - var(--segmentedcontrol-selected-border-width))
      calc(var(--space-16) - var(--segmentedcontrol-selected-border-width));
  }

  .segment.selected i {
    color: var(--segmentedcontrol-selected-icon);
  }

  .segment:disabled {
    background: var(--segmentedcontrol-disabled-surface);
    color: var(--segmentedcontrol-disabled-text);
    font-family: var(--segmentedcontrol-disabled-text-font-family);
    font-size: var(--segmentedcontrol-disabled-text-font-size);
    font-weight: var(--segmentedcontrol-disabled-text-font-weight);
    line-height: var(--segmentedcontrol-disabled-text-line-height);
    opacity: 0.4;
    cursor: not-allowed;
  }

  .segment:disabled i {
    color: var(--segmentedcontrol-disabled-icon);
  }
</style>
