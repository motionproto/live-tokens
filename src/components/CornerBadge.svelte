<script context="module" lang="ts">
  export type CornerAnchor = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
</script>

<script lang="ts">
  import Badge, { type BadgeVariant } from './Badge.svelte';

  export let variant: BadgeVariant = 'accent';
  export let anchor: CornerAnchor = 'bottom-right';
  export let size: 'default' | 'small' = 'default';
  export let icon: string | undefined = undefined;
</script>

<span class="corner-badge corner-badge-{anchor} corner-badge-{variant}">
  <Badge {variant} {size} {icon}>
    <slot name="icon" slot="icon" />
    <slot />
  </Badge>
</span>

<style lang="scss">
  $variants: primary, accent, neutral, alternate, canvas, special, success, warning, danger, info;

  // Per-variant token block kept flat (not collapsed via SCSS @each) so the
  // Layer-2 token-discovery parser (`extractGlobalRootBody` in
  // src/lib/parsers/globalRootBlock.ts) can read the .svelte source verbatim;
  // @each interpolation would make the parser see zero tokens here, even though
  // the rendered DOM would be identical. Same pattern as Badge.svelte / Notification.svelte.
  //
  // Role-based radii: each variable follows the badge's geometry regardless of anchor.
  //  - outer:  the corner flush with the parent's anchored corner
  //  - inner:  the diagonally opposite corner (deepest into the parent)
  //  - h-axis: the on-axis corner along the horizontal edge shared with `outer`
  //  - v-axis: the on-axis corner along the vertical edge shared with `outer`
  :global(:root) {
    /* Primary */
    --corner-badge-primary-margin: var(--space-8);
    --corner-badge-primary-outer-radius: var(--radius-none);
    --corner-badge-primary-inner-radius: var(--radius-none);
    --corner-badge-primary-h-axis-radius: var(--radius-none);
    --corner-badge-primary-v-axis-radius: var(--radius-none);

    /* Accent */
    --corner-badge-accent-margin: var(--space-8);
    --corner-badge-accent-outer-radius: var(--radius-none);
    --corner-badge-accent-inner-radius: var(--radius-none);
    --corner-badge-accent-h-axis-radius: var(--radius-none);
    --corner-badge-accent-v-axis-radius: var(--radius-none);

    /* Neutral */
    --corner-badge-neutral-margin: var(--space-8);
    --corner-badge-neutral-outer-radius: var(--radius-none);
    --corner-badge-neutral-inner-radius: var(--radius-none);
    --corner-badge-neutral-h-axis-radius: var(--radius-none);
    --corner-badge-neutral-v-axis-radius: var(--radius-none);

    /* Alternate */
    --corner-badge-alternate-margin: var(--space-8);
    --corner-badge-alternate-outer-radius: var(--radius-none);
    --corner-badge-alternate-inner-radius: var(--radius-none);
    --corner-badge-alternate-h-axis-radius: var(--radius-none);
    --corner-badge-alternate-v-axis-radius: var(--radius-none);

    /* Canvas */
    --corner-badge-canvas-margin: var(--space-8);
    --corner-badge-canvas-outer-radius: var(--radius-none);
    --corner-badge-canvas-inner-radius: var(--radius-none);
    --corner-badge-canvas-h-axis-radius: var(--radius-none);
    --corner-badge-canvas-v-axis-radius: var(--radius-none);

    /* Special */
    --corner-badge-special-margin: var(--space-8);
    --corner-badge-special-outer-radius: var(--radius-none);
    --corner-badge-special-inner-radius: var(--radius-none);
    --corner-badge-special-h-axis-radius: var(--radius-none);
    --corner-badge-special-v-axis-radius: var(--radius-none);

    /* Success */
    --corner-badge-success-margin: var(--space-8);
    --corner-badge-success-outer-radius: var(--radius-none);
    --corner-badge-success-inner-radius: var(--radius-none);
    --corner-badge-success-h-axis-radius: var(--radius-none);
    --corner-badge-success-v-axis-radius: var(--radius-none);

    /* Warning */
    --corner-badge-warning-margin: var(--space-8);
    --corner-badge-warning-outer-radius: var(--radius-none);
    --corner-badge-warning-inner-radius: var(--radius-none);
    --corner-badge-warning-h-axis-radius: var(--radius-none);
    --corner-badge-warning-v-axis-radius: var(--radius-none);

    /* Danger */
    --corner-badge-danger-margin: var(--space-8);
    --corner-badge-danger-outer-radius: var(--radius-none);
    --corner-badge-danger-inner-radius: var(--radius-none);
    --corner-badge-danger-h-axis-radius: var(--radius-none);
    --corner-badge-danger-v-axis-radius: var(--radius-none);

    /* Info */
    --corner-badge-info-margin: var(--space-8);
    --corner-badge-info-outer-radius: var(--radius-none);
    --corner-badge-info-inner-radius: var(--radius-none);
    --corner-badge-info-h-axis-radius: var(--radius-none);
    --corner-badge-info-v-axis-radius: var(--radius-none);
  }

  .corner-badge {
    position: absolute;
    z-index: 1;
    pointer-events: none;
  }

  // Per-variant: pull the variant's public tokens into private vars so the
  // anchor-based mappings below can read them without 4 × 10 explicit rules.
  @each $v in $variants {
    .corner-badge-#{$v} {
      --_margin: var(--corner-badge-#{$v}-margin);
      --_outer-radius: var(--corner-badge-#{$v}-outer-radius);
      --_inner-radius: var(--corner-badge-#{$v}-inner-radius);
      --_h-axis-radius: var(--corner-badge-#{$v}-h-axis-radius);
      --_v-axis-radius: var(--corner-badge-#{$v}-v-axis-radius);
    }
  }

  .corner-badge-bottom-right { bottom: var(--_margin); right: var(--_margin); }
  .corner-badge-bottom-left  { bottom: var(--_margin); left:  var(--_margin); }
  .corner-badge-top-right    { top:    var(--_margin); right: var(--_margin); }
  .corner-badge-top-left     { top:    var(--_margin); left:  var(--_margin); }

  /* Map logical corner roles → physical corners per anchor. */
  .corner-badge-bottom-right :global(.badge) {
    border-top-left-radius:     var(--_inner-radius);
    border-top-right-radius:    var(--_v-axis-radius);
    border-bottom-right-radius: var(--_outer-radius);
    border-bottom-left-radius:  var(--_h-axis-radius);
  }
  .corner-badge-bottom-left :global(.badge) {
    border-top-left-radius:     var(--_v-axis-radius);
    border-top-right-radius:    var(--_inner-radius);
    border-bottom-right-radius: var(--_h-axis-radius);
    border-bottom-left-radius:  var(--_outer-radius);
  }
  .corner-badge-top-right :global(.badge) {
    border-top-left-radius:     var(--_h-axis-radius);
    border-top-right-radius:    var(--_outer-radius);
    border-bottom-right-radius: var(--_v-axis-radius);
    border-bottom-left-radius:  var(--_inner-radius);
  }
  .corner-badge-top-left :global(.badge) {
    border-top-left-radius:     var(--_outer-radius);
    border-top-right-radius:    var(--_h-axis-radius);
    border-bottom-right-radius: var(--_inner-radius);
    border-bottom-left-radius:  var(--_v-axis-radius);
  }
</style>
