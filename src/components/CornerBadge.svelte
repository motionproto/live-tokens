<script module lang="ts">
  export type CornerAnchor = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Badge, { type BadgeVariant } from './Badge.svelte';

  interface Props {
    variant?: BadgeVariant;
    anchor?: CornerAnchor;
    size?: 'default' | 'small';
    icon?: string | undefined;
    /** Custom icon content. Falls back to `icon` prop's font-icon class. Renamed from `slot="icon"` in 0.5.0. */
    iconSlot?: Snippet;
    children?: Snippet;
  }

  let {
    variant = 'accent',
    anchor = 'bottom-right',
    size = 'default',
    icon = undefined,
    iconSlot,
    children,
  }: Props = $props();
</script>

<span class="corner-badge corner-badge-{anchor} corner-badge-{variant}">
  <Badge {variant} {size} {icon} {iconSlot}>
    {@render children?.()}
  </Badge>
</span>

<style lang="scss">
  @use '../styles/padding' as *;

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
  //
  // Padding + font props are corner-badge-specific (not inherited from the
  // sibling Badge variant), so corner-badge instances can carry their own
  // typography and sizing without dragging the inline Badge along. They default
  // to the same underlying global tokens Badge uses, so an unconfigured corner
  // badge still matches its inline badge counterpart visually.
  :global(:root) {
    /* Primary */
    --corner-badge-primary-margin: var(--space-0);
    --corner-badge-primary-outer-radius: var(--radius-none);
    --corner-badge-primary-inner-radius: var(--radius-none);
    --corner-badge-primary-h-axis-radius: var(--radius-none);
    --corner-badge-primary-v-axis-radius: var(--radius-none);
    --corner-badge-primary-padding: var(--space-6);
    --corner-badge-primary-text-font-family: var(--font-sans);
    --corner-badge-primary-text-font-size: var(--font-size-sm);
    --corner-badge-primary-text-font-weight: var(--font-weight-light);
    --corner-badge-primary-text-line-height: var(--line-height-xs);

    /* Accent */
    --corner-badge-accent-margin: var(--space-0);
    --corner-badge-accent-outer-radius: var(--radius-none);
    --corner-badge-accent-inner-radius: var(--radius-none);
    --corner-badge-accent-h-axis-radius: var(--radius-none);
    --corner-badge-accent-v-axis-radius: var(--radius-none);
    --corner-badge-accent-padding: var(--space-6);
    --corner-badge-accent-text-font-family: var(--font-sans);
    --corner-badge-accent-text-font-size: var(--font-size-sm);
    --corner-badge-accent-text-font-weight: var(--font-weight-light);
    --corner-badge-accent-text-line-height: var(--line-height-xs);

    /* Neutral */
    --corner-badge-neutral-margin: var(--space-0);
    --corner-badge-neutral-outer-radius: var(--radius-none);
    --corner-badge-neutral-inner-radius: var(--radius-none);
    --corner-badge-neutral-h-axis-radius: var(--radius-none);
    --corner-badge-neutral-v-axis-radius: var(--radius-none);
    --corner-badge-neutral-padding: var(--space-6);
    --corner-badge-neutral-text-font-family: var(--font-sans);
    --corner-badge-neutral-text-font-size: var(--font-size-sm);
    --corner-badge-neutral-text-font-weight: var(--font-weight-light);
    --corner-badge-neutral-text-line-height: var(--line-height-xs);

    /* Alternate */
    --corner-badge-alternate-margin: var(--space-0);
    --corner-badge-alternate-outer-radius: var(--radius-none);
    --corner-badge-alternate-inner-radius: var(--radius-none);
    --corner-badge-alternate-h-axis-radius: var(--radius-none);
    --corner-badge-alternate-v-axis-radius: var(--radius-none);
    --corner-badge-alternate-padding: var(--space-6);
    --corner-badge-alternate-text-font-family: var(--font-sans);
    --corner-badge-alternate-text-font-size: var(--font-size-sm);
    --corner-badge-alternate-text-font-weight: var(--font-weight-light);
    --corner-badge-alternate-text-line-height: var(--line-height-xs);

    /* Canvas */
    --corner-badge-canvas-margin: var(--space-0);
    --corner-badge-canvas-outer-radius: var(--radius-none);
    --corner-badge-canvas-inner-radius: var(--radius-none);
    --corner-badge-canvas-h-axis-radius: var(--radius-none);
    --corner-badge-canvas-v-axis-radius: var(--radius-none);
    --corner-badge-canvas-padding: var(--space-6);
    --corner-badge-canvas-text-font-family: var(--font-sans);
    --corner-badge-canvas-text-font-size: var(--font-size-sm);
    --corner-badge-canvas-text-font-weight: var(--font-weight-light);
    --corner-badge-canvas-text-line-height: var(--line-height-xs);

    /* Special */
    --corner-badge-special-margin: var(--space-0);
    --corner-badge-special-outer-radius: var(--radius-none);
    --corner-badge-special-inner-radius: var(--radius-none);
    --corner-badge-special-h-axis-radius: var(--radius-none);
    --corner-badge-special-v-axis-radius: var(--radius-none);
    --corner-badge-special-padding: var(--space-6);
    --corner-badge-special-text-font-family: var(--font-sans);
    --corner-badge-special-text-font-size: var(--font-size-sm);
    --corner-badge-special-text-font-weight: var(--font-weight-light);
    --corner-badge-special-text-line-height: var(--line-height-xs);

    /* Success */
    --corner-badge-success-margin: var(--space-0);
    --corner-badge-success-outer-radius: var(--radius-none);
    --corner-badge-success-inner-radius: var(--radius-none);
    --corner-badge-success-h-axis-radius: var(--radius-none);
    --corner-badge-success-v-axis-radius: var(--radius-none);
    --corner-badge-success-padding: var(--space-6);
    --corner-badge-success-text-font-family: var(--font-sans);
    --corner-badge-success-text-font-size: var(--font-size-sm);
    --corner-badge-success-text-font-weight: var(--font-weight-light);
    --corner-badge-success-text-line-height: var(--line-height-xs);

    /* Warning */
    --corner-badge-warning-margin: var(--space-0);
    --corner-badge-warning-outer-radius: var(--radius-none);
    --corner-badge-warning-inner-radius: var(--radius-none);
    --corner-badge-warning-h-axis-radius: var(--radius-none);
    --corner-badge-warning-v-axis-radius: var(--radius-none);
    --corner-badge-warning-padding: var(--space-6);
    --corner-badge-warning-text-font-family: var(--font-sans);
    --corner-badge-warning-text-font-size: var(--font-size-sm);
    --corner-badge-warning-text-font-weight: var(--font-weight-light);
    --corner-badge-warning-text-line-height: var(--line-height-xs);

    /* Danger */
    --corner-badge-danger-margin: var(--space-0);
    --corner-badge-danger-outer-radius: var(--radius-none);
    --corner-badge-danger-inner-radius: var(--radius-none);
    --corner-badge-danger-h-axis-radius: var(--radius-none);
    --corner-badge-danger-v-axis-radius: var(--radius-none);
    --corner-badge-danger-padding: var(--space-6);
    --corner-badge-danger-text-font-family: var(--font-sans);
    --corner-badge-danger-text-font-size: var(--font-size-sm);
    --corner-badge-danger-text-font-weight: var(--font-weight-light);
    --corner-badge-danger-text-line-height: var(--line-height-xs);

    /* Info */
    --corner-badge-info-margin: var(--space-0);
    --corner-badge-info-outer-radius: var(--radius-none);
    --corner-badge-info-inner-radius: var(--radius-none);
    --corner-badge-info-h-axis-radius: var(--radius-none);
    --corner-badge-info-v-axis-radius: var(--radius-none);
    --corner-badge-info-padding: var(--space-6);
    --corner-badge-info-text-font-family: var(--font-sans);
    --corner-badge-info-text-font-size: var(--font-size-sm);
    --corner-badge-info-text-font-weight: var(--font-weight-light);
    --corner-badge-info-text-line-height: var(--line-height-xs);
  }

  .corner-badge {
    position: absolute;
    z-index: 1;
    pointer-events: none;
  }

  // Per-variant: pull the variant's public tokens into private vars so the
  // anchor-based mappings below can read them without 4 × 10 explicit rules.
  // Padding + font props are forwarded directly onto the inner Badge so the
  // corner-badge tokens fully replace Badge's per-variant declarations
  // (otherwise Badge's own `.badge-#{$v}` rule wins by source order).
  @each $v in $variants {
    .corner-badge-#{$v} {
      --_margin: var(--corner-badge-#{$v}-margin);
      --_outer-radius: var(--corner-badge-#{$v}-outer-radius);
      --_inner-radius: var(--corner-badge-#{$v}-inner-radius);
      --_h-axis-radius: var(--corner-badge-#{$v}-h-axis-radius);
      --_v-axis-radius: var(--corner-badge-#{$v}-v-axis-radius);

      :global(.badge-#{$v}) {
        @include themed-padding(--corner-badge-#{$v}-padding, $h: 2);
        font-family: var(--corner-badge-#{$v}-text-font-family);
        font-size: var(--corner-badge-#{$v}-text-font-size);
        font-weight: var(--corner-badge-#{$v}-text-font-weight);
        line-height: var(--corner-badge-#{$v}-text-line-height);
      }
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
