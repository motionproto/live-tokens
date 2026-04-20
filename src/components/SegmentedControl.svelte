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
    --segment-bar-surface: var(--surface-neutral-high);
    --segment-bar-border: var(--border-neutral-default);
    --segment-bar-border-width: var(--border-width-thin);
    --segment-bar-radius: var(--radius-lg);

    /* Divider (line between non-selected options) */
    --segment-divider-color: var(--border-neutral-default);
    --segment-divider-width: var(--border-width-thin);
    --segment-divider-height: var(--space-12);

    /* Option — default */
    --segment-option-text: var(--text-primary);
    --segment-option-text-font-family: var(--font-sans);
    --segment-option-text-font-weight: var(--font-weight-semibold);
    --segment-option-icon: var(--text-secondary);

    /* Option — hover */
    --segment-option-hover-surface: var(--surface-neutral-higher);
    --segment-option-hover-text: var(--text-primary);
    --segment-option-hover-icon: var(--text-secondary);

    /* Option — disabled */
    --segment-option-disabled-surface: var(--surface-neutral-high);
    --segment-option-disabled-text: var(--text-tertiary);
    --segment-option-disabled-text-font-weight: var(--font-weight-medium);
    --segment-option-disabled-icon: var(--text-tertiary);

    /* Selected (inner pill) */
    --segment-selected-surface: var(--surface-success-high);
    --segment-selected-text: var(--text-primary);
    --segment-selected-text-font-weight: var(--font-weight-bold);
    --segment-selected-icon: var(--text-secondary);
    --segment-selected-border: var(--border-success);
    --segment-selected-border-width: var(--border-width-thin);
    --segment-selected-radius: var(--radius-md);
  }

  .segmented-control {
    display: inline-flex;
    align-items: stretch;
    padding: var(--space-4);
    background: var(--segment-bar-surface);
    border: var(--segment-bar-border-width) solid var(--segment-bar-border);
    border-radius: var(--segment-bar-radius);
  }

  .segment {
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-6) var(--space-16);
    background: transparent;
    border: 0;
    border-radius: var(--segment-selected-radius);
    color: var(--segment-option-text);
    font-family: var(--segment-option-text-font-family);
    font-size: var(--font-md);
    font-weight: var(--segment-option-text-font-weight);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    position: relative;
  }

  .segment i {
    font-size: var(--font-lg);
    color: var(--segment-option-icon);
    transition: color 0.15s;
  }

  /* Short centered divider line between adjacent segments */
  .segment + .segment::before {
    content: '';
    position: absolute;
    left: calc(var(--space-4) * -0.5 - var(--segment-divider-width) * 0.5);
    top: 50%;
    transform: translateY(-50%);
    width: var(--segment-divider-width);
    height: var(--segment-divider-height);
    background: var(--segment-divider-color);
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
    background: var(--segment-option-hover-surface);
    color: var(--segment-option-hover-text);
  }

  .segment:hover:not(:disabled):not(.selected) i,
  .segment.force-hover:not(:disabled):not(.selected) i {
    color: var(--segment-option-hover-icon);
  }

  .segment.selected {
    background: var(--segment-selected-surface);
    border: var(--segment-selected-border-width) solid var(--segment-selected-border);
    border-radius: var(--segment-selected-radius);
    color: var(--segment-selected-text);
    font-weight: var(--segment-selected-text-font-weight);
    /* Account for border so the pill doesn't shift adjacent segments */
    padding: calc(var(--space-6) - var(--segment-selected-border-width))
      calc(var(--space-16) - var(--segment-selected-border-width));
  }

  .segment.selected i {
    color: var(--segment-selected-icon);
  }

  .segment:disabled {
    background: var(--segment-option-disabled-surface);
    color: var(--segment-option-disabled-text);
    font-weight: var(--segment-option-disabled-text-font-weight);
    opacity: 0.4;
    cursor: not-allowed;
  }

  .segment:disabled i {
    color: var(--segment-option-disabled-icon);
  }
</style>
