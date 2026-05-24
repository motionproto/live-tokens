<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type Segment = {
    value: string;
    label: string;
    icon?: string;
    disabled?: boolean;
  };

  interface Props {
    segments?: Segment[];
    value?: string;
    disabled?: boolean;
    forceHoverValue?: string | null;
    /** Visual size. `small` cascades `--segmentedcontrol-*-small-*` tokens
        through the default token names so per-state rules pick them up. */
    size?: 'default' | 'small';
    /** Selection callback. Preferred over `on:change` from 0.5.0 onward. */
    onchange?: (value: string) => void;
  }

  let {
    segments = [],
    value = $bindable(''),
    disabled = false,
    forceHoverValue = null,
    size = 'default',
    onchange
  }: Props = $props();

  // Dual-fire bridge — see Button.svelte for the deprecation timeline.
  const dispatch = createEventDispatcher<{ change: string }>();

  function select(v: string) {
    value = v;
    onchange?.(v);
    dispatch('change', v);
  }
</script>

<div class="segmented-control" class:is-disabled={disabled} class:small={size === 'small'} role="radiogroup">
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
      onclick={() => select(seg.value)}
    >
      {#if seg.icon}<i class={seg.icon}></i>{/if}
      <span>{seg.label}</span>
    </button>
  {/each}
</div>

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    /* Bar (outer wrapper) */
    --segmentedcontrol-bar-surface: var(--surface-neutral-high);
    --segmentedcontrol-bar-border: var(--border-neutral);
    --segmentedcontrol-bar-border-width: var(--border-width-1);
    --segmentedcontrol-bar-radius: var(--radius-lg);
    --segmentedcontrol-bar-padding: var(--space-4);
    --segmentedcontrol-bar-gap: var(--space-8);

    /* Divider (line between non-selected options). Inset is the top + bottom
       margin trimmed from the divider; 0 = bar-height divider. */
    --segmentedcontrol-divider-color: var(--border-neutral);
    --segmentedcontrol-divider-thickness: var(--border-width-1);
    --segmentedcontrol-divider-inset: var(--space-6);

    /* Option (inner button) — shape applies to every state */
    --segmentedcontrol-option-padding: var(--space-8);
    --segmentedcontrol-option-gap: var(--space-8);

    /* Option — default */
    --segmentedcontrol-option-text: var(--text-primary);
    --segmentedcontrol-option-text-font-family: var(--font-sans);
    --segmentedcontrol-option-text-font-size: var(--font-size-md);
    --segmentedcontrol-option-text-font-weight: var(--font-weight-normal);
    --segmentedcontrol-option-text-line-height: var(--line-height-md);
    --segmentedcontrol-option-icon: var(--text-secondary);
    --segmentedcontrol-option-icon-size: var(--icon-size-md);

    /* Option — hover */
    --segmentedcontrol-option-hover-surface: var(--surface-neutral-higher);
    --segmentedcontrol-option-hover-text: var(--text-primary);
    --segmentedcontrol-option-hover-text-font-family: var(--font-sans);
    --segmentedcontrol-option-hover-text-font-size: var(--font-size-md);
    --segmentedcontrol-option-hover-text-font-weight: var(--font-weight-normal);
    --segmentedcontrol-option-hover-text-line-height: var(--line-height-md);
    --segmentedcontrol-option-hover-icon: var(--text-secondary);

    /* Selected (inner pill) — looks the same hovered or not */
    --segmentedcontrol-selected-surface: var(--surface-success-high);
    --segmentedcontrol-selected-text: var(--text-primary);
    --segmentedcontrol-selected-text-font-family: var(--font-sans);
    --segmentedcontrol-selected-text-font-size: var(--font-size-md);
    --segmentedcontrol-selected-text-font-weight: var(--font-weight-semibold);
    --segmentedcontrol-selected-text-line-height: var(--line-height-md);
    --segmentedcontrol-selected-icon: var(--text-secondary);
    --segmentedcontrol-selected-border: var(--border-success);
    --segmentedcontrol-selected-border-width: var(--border-width-1);
    --segmentedcontrol-selected-radius: var(--radius-md);

    /* Disabled (whole component state — overrides both option and selected styling) */
    --segmentedcontrol-disabled-surface: var(--surface-neutral-high);
    --segmentedcontrol-disabled-text: var(--text-tertiary);
    --segmentedcontrol-disabled-text-font-family: var(--font-sans);
    --segmentedcontrol-disabled-text-font-size: var(--font-size-md);
    --segmentedcontrol-disabled-text-font-weight: var(--font-weight-light);
    --segmentedcontrol-disabled-text-line-height: var(--line-height-md);
    --segmentedcontrol-disabled-icon: var(--text-tertiary);

    /* Small size — overrides for geometry + typography. Per-state colors and
       font-weight stay shared with default; only the size-driven properties
       differ. The `.small` rule below rebinds the default tokens to these
       values so existing state-specific cascades flow through unchanged. */
    --segmentedcontrol-bar-small-padding: var(--space-2);
    --segmentedcontrol-bar-small-radius: var(--radius-md);
    --segmentedcontrol-divider-small-inset: var(--space-4);
    --segmentedcontrol-divider-small-thickness: var(--border-width-1);
    --segmentedcontrol-option-small-padding: var(--space-6);
    --segmentedcontrol-option-small-gap: var(--space-6);
    --segmentedcontrol-option-small-icon-size: var(--icon-size-sm);
    --segmentedcontrol-option-small-text-font-size: var(--font-size-sm);
    --segmentedcontrol-option-small-text-line-height: var(--line-height-sm);
    --segmentedcontrol-selected-small-radius: var(--radius-sm);
  }

  .segmented-control {
    display: inline-flex;
    align-items: stretch;
    gap: var(--segmentedcontrol-bar-gap);
    @include themed-padding(--segmentedcontrol-bar-padding);
    background: var(--segmentedcontrol-bar-surface);
    border: var(--segmentedcontrol-bar-border-width) solid var(--segmentedcontrol-bar-border);
    border-radius: var(--segmentedcontrol-bar-radius);
  }

  /* Small size modifier — rebinds the default tokens to their `-small-*`
     counterparts. Per-state cascades (selected/hover/disabled typography,
     icon size) all read through these default names, so rebinding them
     here is enough — no per-state small token explosion. Per-side padding
     overrides are rebound too so split-padding edits at small don't leak
     through to default size. Font-weight and color are intentionally NOT
     rebound: weight differences are state-driven (selected = semibold),
     colors are state-driven too. */
  .segmented-control.small {
    --segmentedcontrol-bar-padding: var(--segmentedcontrol-bar-small-padding);
    --segmentedcontrol-bar-padding-top: var(--segmentedcontrol-bar-small-padding-top);
    --segmentedcontrol-bar-padding-right: var(--segmentedcontrol-bar-small-padding-right);
    --segmentedcontrol-bar-padding-bottom: var(--segmentedcontrol-bar-small-padding-bottom);
    --segmentedcontrol-bar-padding-left: var(--segmentedcontrol-bar-small-padding-left);
    --segmentedcontrol-bar-radius: var(--segmentedcontrol-bar-small-radius);

    --segmentedcontrol-divider-inset: var(--segmentedcontrol-divider-small-inset);
    --segmentedcontrol-divider-thickness: var(--segmentedcontrol-divider-small-thickness);

    --segmentedcontrol-option-padding: var(--segmentedcontrol-option-small-padding);
    --segmentedcontrol-option-padding-top: var(--segmentedcontrol-option-small-padding-top);
    --segmentedcontrol-option-padding-right: var(--segmentedcontrol-option-small-padding-right);
    --segmentedcontrol-option-padding-bottom: var(--segmentedcontrol-option-small-padding-bottom);
    --segmentedcontrol-option-padding-left: var(--segmentedcontrol-option-small-padding-left);
    --segmentedcontrol-option-gap: var(--segmentedcontrol-option-small-gap);

    /* Icon size has a single source-of-truth token now; text size/line-height
       still need per-state rebinds because typography genuinely varies per
       state (selected = semibold, default = normal). */
    --segmentedcontrol-option-icon-size: var(--segmentedcontrol-option-small-icon-size);

    --segmentedcontrol-option-text-font-size: var(--segmentedcontrol-option-small-text-font-size);
    --segmentedcontrol-selected-text-font-size: var(--segmentedcontrol-option-small-text-font-size);
    --segmentedcontrol-option-hover-text-font-size: var(--segmentedcontrol-option-small-text-font-size);
    --segmentedcontrol-disabled-text-font-size: var(--segmentedcontrol-option-small-text-font-size);

    --segmentedcontrol-option-text-line-height: var(--segmentedcontrol-option-small-text-line-height);
    --segmentedcontrol-selected-text-line-height: var(--segmentedcontrol-option-small-text-line-height);
    --segmentedcontrol-option-hover-text-line-height: var(--segmentedcontrol-option-small-text-line-height);
    --segmentedcontrol-disabled-text-line-height: var(--segmentedcontrol-option-small-text-line-height);

    --segmentedcontrol-selected-radius: var(--segmentedcontrol-selected-small-radius);
  }

  /* Font + color properties are declared once on `.segment` and rebound per
     state via the `--_*` custom properties below. State classes only change
     the bindings; the actual `font-*` declarations never move. When two
     states resolve to the same final value the computed font is identical
     and the browser has no reason to re-shape — which is what kept the
     selected segment shifting by a whole pixel even after the border was
     swapped for an outline. */
  .segment {
    --_text-color: var(--segmentedcontrol-option-text);
    --_text-family: var(--segmentedcontrol-option-text-font-family);
    --_text-size: var(--segmentedcontrol-option-text-font-size);
    --_text-weight: var(--segmentedcontrol-option-text-font-weight);
    --_text-line-height: var(--segmentedcontrol-option-text-line-height);
    --_icon-color: var(--segmentedcontrol-option-icon);
    --_icon-size: var(--segmentedcontrol-option-icon-size);

    display: inline-flex;
    align-items: center;
    gap: var(--segmentedcontrol-option-gap);
    @include themed-padding(--segmentedcontrol-option-padding, $h: 2);
    background: transparent;
    border: 0;
    border-radius: var(--segmentedcontrol-selected-radius);
    color: var(--_text-color);
    font-family: var(--_text-family);
    font-size: var(--_text-size);
    font-weight: var(--_text-weight);
    line-height: var(--_text-line-height);
    cursor: pointer;
    transition: background var(--duration-150), color var(--duration-150);
    position: relative;
  }

  .segment i {
    font-size: var(--_icon-size);
    color: var(--_icon-color);
    transition: color var(--duration-150);
  }

  /* Divider between adjacent segments. Stretches to the bar's cross-axis size
     by inheriting the parent's `align-items: stretch`; an explicit margin-block
     trims top + bottom so "Full" (0 inset) gives a bar-height line and larger
     insets give shorter ones. Avoids the percentage-height collapse that bit us
     when the divider was `align-self: center; height: 100%`.
     Negative inline margins absorb the surrounding flex gap so seg-to-seg
     distance stays var(--bar-gap). */
  .segment-divider {
    flex-shrink: 0;
    width: var(--segmentedcontrol-divider-thickness);
    margin-block: var(--segmentedcontrol-divider-inset);
    margin-inline: calc(
      var(--segmentedcontrol-bar-gap) * -0.5 - var(--segmentedcontrol-divider-thickness) * 0.5
    );
    background: var(--segmentedcontrol-divider-color);
    pointer-events: none;
  }

  .segment:hover:not(:disabled):not(.selected),
  .segment.force-hover:not(:disabled):not(.selected) {
    --_text-color: var(--segmentedcontrol-option-hover-text);
    --_text-family: var(--segmentedcontrol-option-hover-text-font-family);
    --_text-size: var(--segmentedcontrol-option-hover-text-font-size);
    --_text-weight: var(--segmentedcontrol-option-hover-text-font-weight);
    --_text-line-height: var(--segmentedcontrol-option-hover-text-line-height);
    --_icon-color: var(--segmentedcontrol-option-hover-icon);
    background: var(--segmentedcontrol-option-hover-surface);
  }

  /* Outline (not border) so the selection ring sits outside the box model.
     A real border would force a padding compensation calc, and the resulting
     sub-pixel flex layout would shift the selected segment by a whole pixel
     against its neighbors. Outline is paint-only and leaves geometry alone. */
  .segment.selected {
    --_text-color: var(--segmentedcontrol-selected-text);
    --_text-family: var(--segmentedcontrol-selected-text-font-family);
    --_text-size: var(--segmentedcontrol-selected-text-font-size);
    --_text-weight: var(--segmentedcontrol-selected-text-font-weight);
    --_text-line-height: var(--segmentedcontrol-selected-text-line-height);
    --_icon-color: var(--segmentedcontrol-selected-icon);
    background: var(--segmentedcontrol-selected-surface);
    outline: var(--segmentedcontrol-selected-border-width) solid var(--segmentedcontrol-selected-border);
    outline-offset: calc(var(--segmentedcontrol-selected-border-width) * -1);
  }

  .segment:disabled {
    --_text-color: var(--segmentedcontrol-disabled-text);
    --_text-family: var(--segmentedcontrol-disabled-text-font-family);
    --_text-size: var(--segmentedcontrol-disabled-text-font-size);
    --_text-weight: var(--segmentedcontrol-disabled-text-font-weight);
    --_text-line-height: var(--segmentedcontrol-disabled-text-line-height);
    --_icon-color: var(--segmentedcontrol-disabled-icon);
    background: var(--segmentedcontrol-disabled-surface);
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
