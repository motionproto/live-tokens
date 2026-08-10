<script lang="ts">
  import type { AxisStatus } from '../../core/palettes/colorHarmony';

  interface Props {
    index: number;
    status: AxisStatus;
    /** The axis carries the family selected across the Colors surfaces. */
    selected?: boolean;
    /** Rendered over the swatch badge's scrim rather than an editor surface. */
    scrim?: boolean;
  }

  let { index, status, selected = false, scrim = false }: Props = $props();
</script>

<!-- Carries no positioning: the wheel places it absolutely, the rows inline. -->
<span class="numeral" class:filled={status === 'on-wheel'} class:selected class:scrim>{index + 1}</span>

<style>
  /* Hollow is the resting shape; filled means the axis has a rail on the wheel
     right now. An unused axis is hollow too, but it never holds a family, so a
     hollow numeral beside a color always reads "bound, off the wheel". */
  .numeral {
    box-sizing: border-box;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* Callers that need a bigger numeral set these two; the row default is the
       size the wheel and the axes list share. */
    width: var(--numeral-size, 1rem);
    height: var(--numeral-size, 1rem);
    border: 1px dashed var(--ui-text-muted);
    border-radius: var(--ui-radius-full);
    color: var(--ui-text-muted);
    font-size: var(--numeral-font-size, var(--ui-font-size-xs));
    font-weight: var(--ui-font-weight-semibold);
    /* No tabular figures: the box is a fixed circle, so nothing needs aligning,
       and a padded tabular "1" sits off-center inside its own advance. */
    line-height: 1;
    user-select: none;
  }

  /* The scrim composites with the swatch fill beneath it, which lands close
     enough to the muted token to erase the ring and the digit. */
  .numeral.scrim:not(.filled) {
    border-color: var(--ui-text-secondary);
    color: var(--ui-text-secondary);
  }

  .numeral.filled {
    border-style: solid;
    border-color: var(--ui-border-higher);
    background: var(--ui-surface-high);
    color: var(--ui-text-secondary);
  }

  .numeral.filled.selected {
    background: var(--ui-text-primary);
    border-color: var(--ui-text-primary);
    color: var(--ui-surface-lowest);
  }

  /* Selection raises contrast but never fills: filled is reserved for "has a
     rail", so inverting here would make the list contradict the wheel. */
  .numeral.selected:not(.filled) {
    border-color: var(--ui-text-primary);
    color: var(--ui-text-primary);
  }
</style>
