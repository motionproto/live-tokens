<script module lang="ts">
  /** Shared so a caller that must wait for the pane to settle — scrolling to a
      section it just opened, say — does not hard-code the number. */
  export const REVEAL_MS = 260;
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  /**
   * Disclosure wrapper for in-flow expandable sections: the pane opens like a
   * window while its content comes forward through it. Both moves share one
   * clock and one easing so they read as a single gesture; the content is
   * clipped by the opening pane for the first frames, which is the point.
   *
   * For sections only. Popovers, menus and dialogs are floating layers with
   * their own motion, and subgrid detail rows (UIPaddingSelector,
   * UIPaletteSelector) cannot take a wrapper element without losing their
   * placement in the parent grid.
   */
  interface Props {
    open: boolean;
    /** Placement for the outer element when the section is itself a grid item. */
    style?: string;
    duration?: number;
    children: Snippet;
  }

  let { open, style = undefined, duration = REVEAL_MS, children }: Props = $props();

  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  let ms = $derived(reduceMotion ? 0 : duration);

  function approach(_node: Element, { duration }: { duration: number }) {
    return {
      duration,
      easing: cubicOut,
      css: (u: number) => `opacity: ${u}; transform: scale(${0.95 + u * 0.05})`
    };
  }
</script>

{#if open}
  <div {style} transition:slide|local={{ duration: ms, easing: cubicOut }}>
    <div transition:approach|local={{ duration: ms }}>
      {@render children()}
    </div>
  </div>
{/if}
