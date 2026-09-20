<script module lang="ts">
  import type { CatalogueEntry } from '../../editor/component-editor/scaffolding/types';

  export const catalogue = {
    description: 'A badge that sits on a corner of its parent.',
    whenToUse: 'a count or status marker that sits on the thing it describes.',
    whenNotToUse: [
      { when: 'the label sits in the text flow.', use: 'badge' },
      { when: 'the message is feedback about something that just happened.', use: 'notification' },
    ],
    props: {
      variant: '`brand`, `accent`, `special`, `alternate`, `canvas`, and `neutral` paint a color family; `success`, `warning`, `danger`, and `info` carry a status.',
      anchor: 'the corner the badge sits on; `bottom-right` unless named.',
    },
  } satisfies CatalogueEntry;

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

<span class="cornerbadge cornerbadge-{anchor} cornerbadge-{variant}">
  <Badge {variant} {size} {icon} {iconSlot}>
    {@render children?.()}
  </Badge>
</span>

<style lang="scss">
  @use '../styles/padding' as *;

  $variants: brand, accent, neutral, alternate, canvas, special, success, warning, danger, info;

  // Shape, offset, and type are uniform across variants — one flat token set
  // owns them. Colors are per-variant so authors can tune CornerBadge to read
  // distinct from the inner Badge (e.g. lower contrast inside the corner).
  // Defaults mirror Badge's per-variant base values; the editor's `colors` tab
  // re-targets the previewed variant so authors only see 3 color rows at a
  // time, scoped to whatever variant they're previewing.
  :global(:root) {
    --cornerbadge-margin: var(--space-0);
    --cornerbadge-outer-radius: var(--radius-none);
    --cornerbadge-inner-radius: var(--radius-none);
    --cornerbadge-h-axis-radius: var(--radius-none);
    --cornerbadge-v-axis-radius: var(--radius-none);
    --cornerbadge-padding: var(--space-6);
    --cornerbadge-text-font-family: var(--font-sans);
    --cornerbadge-text-font-size: var(--font-size-sm);
    --cornerbadge-text-font-weight: var(--font-weight-medium);
    --cornerbadge-text-line-height: var(--line-height-none);

    /* Per-variant color overrides. Default = inherit the same family/level the
       inner Badge uses; author can swap to a different level (e.g. -low) to
       reduce contrast against the host surface. */
    --cornerbadge-brand-surface: var(--surface-brand);
    --cornerbadge-brand-border: var(--border-brand);
    --cornerbadge-brand-text: var(--text-brand);
    --cornerbadge-accent-surface: var(--surface-accent);
    --cornerbadge-accent-border: var(--border-accent);
    --cornerbadge-accent-text: var(--text-accent);
    --cornerbadge-neutral-surface: var(--surface-neutral);
    --cornerbadge-neutral-border: var(--border-neutral);
    --cornerbadge-neutral-text: var(--text-primary);
    --cornerbadge-alternate-surface: var(--surface-alternate);
    --cornerbadge-alternate-border: var(--border-alternate);
    --cornerbadge-alternate-text: var(--text-alternate);
    --cornerbadge-canvas-surface: var(--surface-canvas);
    --cornerbadge-canvas-border: var(--border-canvas);
    --cornerbadge-canvas-text: var(--text-canvas);
    --cornerbadge-special-surface: var(--surface-special);
    --cornerbadge-special-border: var(--border-special);
    --cornerbadge-special-text: var(--text-special);
    --cornerbadge-success-surface: var(--surface-success);
    --cornerbadge-success-border: var(--border-success);
    --cornerbadge-success-text: var(--text-success);
    --cornerbadge-warning-surface: var(--surface-warning);
    --cornerbadge-warning-border: var(--border-warning);
    --cornerbadge-warning-text: var(--text-warning);
    --cornerbadge-danger-surface: var(--surface-danger);
    --cornerbadge-danger-border: var(--border-danger);
    --cornerbadge-danger-text: var(--text-danger);
    --cornerbadge-info-surface: var(--surface-info);
    --cornerbadge-info-border: var(--border-info);
    --cornerbadge-info-text: var(--text-info);
  }

  .cornerbadge {
    position: absolute;
    z-index: 1;
    pointer-events: none;
    // Pull public tokens into private vars so anchor mappings below stay generic.
    --_margin: var(--cornerbadge-margin);
    --_outer-radius: var(--cornerbadge-outer-radius);
    --_inner-radius: var(--cornerbadge-inner-radius);
    --_h-axis-radius: var(--cornerbadge-h-axis-radius);
    --_v-axis-radius: var(--cornerbadge-v-axis-radius);

    // Forward padding + font onto the inner Badge to override Badge's own
    // `.badge-#{$v}` rule. Specificity (0,2,0) beats Badge's (0,1,0).
    :global(.badge) {
      @include themed-padding(--cornerbadge-padding, $h: 2);
      font-family: var(--cornerbadge-text-font-family);
      font-size: var(--cornerbadge-text-font-size);
      font-weight: var(--cornerbadge-text-font-weight);
      line-height: var(--cornerbadge-text-line-height);
    }
  }

  // Per-variant color overrides: rebind Badge's per-variant CSS vars inside
  // the cornerbadge scope so the inner Badge picks up CornerBadge's color
  // tokens without CornerBadge having to re-implement the painting rules.
  @each $v in $variants {
    .cornerbadge-#{$v} {
      --badge-#{$v}-surface: var(--cornerbadge-#{$v}-surface);
      --badge-#{$v}-border: var(--cornerbadge-#{$v}-border);
      --badge-#{$v}-text: var(--cornerbadge-#{$v}-text);
    }
  }

  .cornerbadge-bottom-right { bottom: var(--_margin); right: var(--_margin); }
  .cornerbadge-bottom-left  { bottom: var(--_margin); left:  var(--_margin); }
  .cornerbadge-top-right    { top:    var(--_margin); right: var(--_margin); }
  .cornerbadge-top-left     { top:    var(--_margin); left:  var(--_margin); }

  /* Logical roles to physical corners, per anchor. */
  .cornerbadge-bottom-right :global(.badge) {
    border-top-left-radius:     var(--_inner-radius);
    border-top-right-radius:    var(--_v-axis-radius);
    border-bottom-right-radius: var(--_outer-radius);
    border-bottom-left-radius:  var(--_h-axis-radius);
  }
  .cornerbadge-bottom-left :global(.badge) {
    border-top-left-radius:     var(--_v-axis-radius);
    border-top-right-radius:    var(--_inner-radius);
    border-bottom-right-radius: var(--_h-axis-radius);
    border-bottom-left-radius:  var(--_outer-radius);
  }
  .cornerbadge-top-right :global(.badge) {
    border-top-left-radius:     var(--_h-axis-radius);
    border-top-right-radius:    var(--_outer-radius);
    border-bottom-right-radius: var(--_v-axis-radius);
    border-bottom-left-radius:  var(--_inner-radius);
  }
  .cornerbadge-top-left :global(.badge) {
    border-top-left-radius:     var(--_outer-radius);
    border-top-right-radius:    var(--_h-axis-radius);
    border-bottom-right-radius: var(--_inner-radius);
    border-bottom-left-radius:  var(--_v-axis-radius);
  }
</style>
