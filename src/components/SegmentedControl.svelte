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
  {#each segments as seg (seg.value)}
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
    --segmentedcontrol-bar-border: var(--border-neutral-default);
    --segmentedcontrol-bar-border-width: var(--border-width-thin);
    --segmentedcontrol-bar-radius: var(--radius-lg);

    /* Divider (line between non-selected options) */
    --segmentedcontrol-divider-color: var(--border-neutral-default);
    --segmentedcontrol-divider-thickness: var(--border-width-thin);
    --segmentedcontrol-divider-height: var(--space-12);

    /* Option — default */
    --segmentedcontrol-option-text: var(--text-primary);
    --segmentedcontrol-option-text-font-family: var(--font-sans);
    --segmentedcontrol-option-text-font-weight: var(--font-weight-normal);
    --segmentedcontrol-option-icon: var(--text-secondary);

    /* Option — hover */
    --segmentedcontrol-option-hover-surface: var(--surface-neutral-higher);
    --segmentedcontrol-option-hover-text: var(--text-primary);
    --segmentedcontrol-option-hover-icon: var(--text-secondary);

    /* Selected (inner pill) — default */
    --segmentedcontrol-selected-surface: var(--surface-success-high);
    --segmentedcontrol-selected-text: var(--text-primary);
    --segmentedcontrol-selected-text-font-weight: var(--font-weight-semibold);
    --segmentedcontrol-selected-icon: var(--text-secondary);
    --segmentedcontrol-selected-border: var(--border-success);
    --segmentedcontrol-selected-border-width: var(--border-width-thin);
    --segmentedcontrol-selected-radius: var(--radius-md);

    /* Selected — hover */
    --segmentedcontrol-selected-hover-surface: var(--surface-success-higher);
    --segmentedcontrol-selected-hover-text: var(--text-primary);
    --segmentedcontrol-selected-hover-icon: var(--text-secondary);

    /* Disabled (whole component state — overrides both option and selected styling) */
    --segmentedcontrol-disabled-surface: var(--surface-neutral-high);
    --segmentedcontrol-disabled-text: var(--text-tertiary);
    --segmentedcontrol-disabled-text-font-weight: var(--font-weight-light);
    --segmentedcontrol-disabled-icon: var(--text-tertiary);
  }

  .segmented-control {
    display: inline-flex;
    align-items: stretch;
    padding: var(--space-4);
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
    font-size: var(--font-size-md);
    font-weight: var(--segmentedcontrol-option-text-font-weight);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    position: relative;
  }

  .segment i {
    font-size: var(--font-size-lg);
    color: var(--segmentedcontrol-option-icon);
    transition: color 0.15s;
  }

  /* Short centered divider line between adjacent segments */
  .segment + .segment::before {
    content: '';
    position: absolute;
    left: calc(var(--space-4) * -0.5 - var(--segmentedcontrol-divider-thickness) * 0.5);
    top: 50%;
    transform: translateY(-50%);
    width: var(--segmentedcontrol-divider-thickness);
    height: var(--segmentedcontrol-divider-height);
    background: var(--segmentedcontrol-divider-color);
  }

  /* Hide divider adjacent to a selected or hovered segment */
  .segment.selected + .segment::before,
  .segment.selected::before,
  .segment:hover:not(:disabled) + .segment::before,
  .segment:hover:not(:disabled)::before,
  .segment.force-hover + .segment::before,
  .segment.force-hover::before {
    content: none;
  }

  .segment:hover:not(:disabled):not(.selected),
  .segment.force-hover:not(:disabled):not(.selected) {
    background: var(--segmentedcontrol-option-hover-surface);
    color: var(--segmentedcontrol-option-hover-text);
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
    font-weight: var(--segmentedcontrol-selected-text-font-weight);
    /* Account for border so the pill doesn't shift adjacent segments */
    padding: calc(var(--space-6) - var(--segmentedcontrol-selected-border-width))
      calc(var(--space-16) - var(--segmentedcontrol-selected-border-width));
  }

  .segment.selected i {
    color: var(--segmentedcontrol-selected-icon);
  }

  .segment.selected:hover:not(:disabled),
  .segment.selected.force-hover:not(:disabled) {
    background: var(--segmentedcontrol-selected-hover-surface);
    color: var(--segmentedcontrol-selected-hover-text);
  }

  .segment.selected:hover:not(:disabled) i,
  .segment.selected.force-hover:not(:disabled) i {
    color: var(--segmentedcontrol-selected-hover-icon);
  }

  .segment:disabled {
    background: var(--segmentedcontrol-disabled-surface);
    color: var(--segmentedcontrol-disabled-text);
    font-weight: var(--segmentedcontrol-disabled-text-font-weight);
    opacity: 0.4;
    cursor: not-allowed;
  }

  .segment:disabled i {
    color: var(--segmentedcontrol-disabled-icon);
  }
</style>
