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
    /** Custom icon content; falls back to `icon` prop's font-icon class. */
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

  // Shape, offset, and type are uniform across variants — one flat token set
  // owns them. Colors are per-variant so authors can tune CornerBadge to read
  // distinct from the inner Badge (e.g. lower contrast inside the corner).
  // Defaults mirror Badge's per-variant base values; the editor's `colors` tab
  // re-targets the previewed variant so authors only see 3 color rows at a
  // time, scoped to whatever variant they're previewing.
  :global(:root) {
    --corner-badge-margin: var(--space-0);
    --corner-badge-outer-radius: var(--radius-none);
    --corner-badge-inner-radius: var(--radius-none);
    --corner-badge-h-axis-radius: var(--radius-none);
    --corner-badge-v-axis-radius: var(--radius-none);
    --corner-badge-padding: var(--space-6);
    --corner-badge-text-font-family: var(--font-sans);
    --corner-badge-text-font-size: var(--font-size-sm);
    --corner-badge-text-font-weight: var(--font-weight-light);
    --corner-badge-text-line-height: var(--line-height-xs);

    /* Per-variant color overrides. Default = inherit the same family/level the
       inner Badge uses; author can swap to a different level (e.g. -low) to
       reduce contrast against the host surface. */
    --corner-badge-primary-surface: var(--surface-brand);
    --corner-badge-primary-border: var(--border-brand);
    --corner-badge-primary-text: var(--text-brand);
    --corner-badge-accent-surface: var(--surface-accent);
    --corner-badge-accent-border: var(--border-accent);
    --corner-badge-accent-text: var(--text-accent);
    --corner-badge-neutral-surface: var(--surface-neutral);
    --corner-badge-neutral-border: var(--border-neutral);
    --corner-badge-neutral-text: var(--text-primary);
    --corner-badge-alternate-surface: var(--surface-alternate);
    --corner-badge-alternate-border: var(--border-alternate);
    --corner-badge-alternate-text: var(--text-alternate);
    --corner-badge-canvas-surface: var(--surface-canvas);
    --corner-badge-canvas-border: var(--border-canvas);
    --corner-badge-canvas-text: var(--text-canvas);
    --corner-badge-special-surface: var(--surface-special);
    --corner-badge-special-border: var(--border-special);
    --corner-badge-special-text: var(--text-special);
    --corner-badge-success-surface: var(--surface-success);
    --corner-badge-success-border: var(--border-success);
    --corner-badge-success-text: var(--text-success);
    --corner-badge-warning-surface: var(--surface-warning);
    --corner-badge-warning-border: var(--border-warning);
    --corner-badge-warning-text: var(--text-warning);
    --corner-badge-danger-surface: var(--surface-danger);
    --corner-badge-danger-border: var(--border-danger);
    --corner-badge-danger-text: var(--text-danger);
    --corner-badge-info-surface: var(--surface-info);
    --corner-badge-info-border: var(--border-info);
    --corner-badge-info-text: var(--text-info);
  }

  .corner-badge {
    position: absolute;
    z-index: 1;
    pointer-events: none;
    // Pull public tokens into private vars so anchor mappings below stay generic.
    --_margin: var(--corner-badge-margin);
    --_outer-radius: var(--corner-badge-outer-radius);
    --_inner-radius: var(--corner-badge-inner-radius);
    --_h-axis-radius: var(--corner-badge-h-axis-radius);
    --_v-axis-radius: var(--corner-badge-v-axis-radius);

    // Forward padding + font onto the inner Badge to override Badge's own
    // `.badge-#{$v}` rule. Specificity (0,2,0) beats Badge's (0,1,0).
    :global(.badge) {
      @include themed-padding(--corner-badge-padding, $h: 2);
      font-family: var(--corner-badge-text-font-family);
      font-size: var(--corner-badge-text-font-size);
      font-weight: var(--corner-badge-text-font-weight);
      line-height: var(--corner-badge-text-line-height);
    }
  }

  // Per-variant color overrides: rebind Badge's per-variant CSS vars inside
  // the corner-badge scope so the inner Badge picks up CornerBadge's color
  // tokens without CornerBadge having to re-implement the painting rules.
  @each $v in $variants {
    .corner-badge-#{$v} {
      --badge-#{$v}-surface: var(--corner-badge-#{$v}-surface);
      --badge-#{$v}-border: var(--corner-badge-#{$v}-border);
      --badge-#{$v}-text: var(--corner-badge-#{$v}-text);
    }
  }

  .corner-badge-bottom-right { bottom: var(--_margin); right: var(--_margin); }
  .corner-badge-bottom-left  { bottom: var(--_margin); left:  var(--_margin); }
  .corner-badge-top-right    { top:    var(--_margin); right: var(--_margin); }
  .corner-badge-top-left     { top:    var(--_margin); left:  var(--_margin); }

  /* Logical roles to physical corners, per anchor. */
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
