<script context="module" lang="ts">
  export const badgeVariants = [
    'primary',
    'accent',
    'neutral',
    'alternate',
    'canvas',
    'special',
    'success',
    'warning',
    'danger',
    'info',
  ] as const;
  export type BadgeVariant = typeof badgeVariants[number];
</script>

<script lang="ts">
  export let variant: BadgeVariant = 'info';
  export let size: 'default' | 'small' = 'default';
  export let icon: string | undefined = undefined;
</script>

<span class="badge badge-{variant}" class:badge-small={size === 'small'}>
  {#if icon}
    <span class="icon"><i class={icon}></i></span>
  {:else}
    <span class="icon"><slot name="icon" /></span>
  {/if}
  <slot />
</span>

<style lang="scss">
  @use '../styles/padding' as *;
  @use 'sass:map';

  $variants: info, accent, primary, success, warning, danger, neutral, special, alternate, canvas;

  // Per-variant color fallbacks: each variant uses its family's text token.
  // `--text-primary` is the neutral primary text (with -secondary/-tertiary scale);
  // `--text-primary-color` is the primary-family text.
  $variant-text: (
    info: --text-info,
    accent: --text-accent,
    primary: --text-primary-color,
    success: --text-success,
    warning: --text-warning,
    danger: --text-danger,
    neutral: --text-primary,
    special: --text-special,
    alternate: --text-alternate,
    canvas: --text-canvas,
  );

  // Real values come from component-configs aliases.
  :global(:root) {
    @each $v in $variants {
      --badge-#{$v}-surface: var(--surface-#{$v});
      --badge-#{$v}-text: var(#{map.get($variant-text, $v)});
      --badge-#{$v}-border: var(--border-#{$v});
      --badge-#{$v}-text-font-family: var(--font-sans);
      --badge-#{$v}-text-font-size: var(--font-size-sm);
      --badge-#{$v}-text-font-weight: var(--font-weight-light);
      --badge-#{$v}-text-line-height: var(--line-height-tight);
      --badge-#{$v}-border-width: var(--border-width-1);
      --badge-#{$v}-radius: var(--radius-full);
      --badge-#{$v}-padding: var(--space-6);
      --badge-#{$v}-shadow: var(--shadow-none);
      --badge-#{$v}-icon-size: var(--icon-size-sm);
    }
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-6);
    line-height: var(--line-height-tight);
    white-space: nowrap;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    font-size: var(--badge-icon-size, 1em);
  }

  .icon:empty {
    display: none;
  }

  .badge-small {
    gap: var(--space-4);
  }

  @each $v in $variants {
    .badge-#{$v} {
      --badge-icon-size: var(--badge-#{$v}-icon-size);
      color: var(--badge-#{$v}-text);
      background: var(--badge-#{$v}-surface);
      border: var(--badge-#{$v}-border-width) solid var(--badge-#{$v}-border);
      border-radius: var(--badge-#{$v}-radius);
      @include themed-padding(--badge-#{$v}-padding, $h: 2);
      font-family: var(--badge-#{$v}-text-font-family);
      font-size: var(--badge-#{$v}-text-font-size);
      font-weight: var(--badge-#{$v}-text-font-weight);
      line-height: var(--badge-#{$v}-text-line-height);
      box-shadow: var(--badge-#{$v}-shadow);
    }
  }
</style>
