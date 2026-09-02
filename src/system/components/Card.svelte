<script lang="ts">
  interface Props {
    icon?: string;
    iconColor?: string;
    title?: string;
    /** `bare` drops the header. The frame and body keep every token the default
        variant uses, so padding, stroke and fill stay editable. */
    variant?: 'default' | 'bare';
    size?: 'default' | 'compact';
    /** false → the card stops pinning body typography so the consumer fully owns slotted content's styling. */
    prose?: boolean;
    /** true → the body drops its inset so slotted media runs to the card's edge.
        Pair with `prose={false}`: a flush body is a frame, not a column of text. */
    flush?: boolean;
    /** Apply hover styling on pointer-over. `undefined` inherits the editor's global "Use hover"
        default; `true`/`false` force this instance on/off. */
    hover?: boolean | undefined;
    class?: string;
    children?: import('svelte').Snippet;
  }

  let {
    icon = '',
    iconColor = 'var(--text-secondary)',
    title = '',
    variant = 'default',
    size = 'default',
    prose = true,
    flush = false,
    hover = undefined,
    class: className = '',
    children
  }: Props = $props();

  // Per-instance override of the global hover intrinsic; undefined leaves :root in charge.
  let hoverBorder = $derived(
    hover === undefined ? undefined : hover ? 'var(--card-hover-border)' : 'var(--card-default-border)',
  );
  let hoverShadow = $derived(
    hover === undefined ? undefined : hover ? 'var(--card-hover-shadow)' : 'var(--card-default-shadow)',
  );

  let showHeader = $derived(variant !== 'bare' && Boolean(icon || title));

  $effect(() => {
    if (import.meta.env.DEV && variant === 'default' && !icon && !title) {
      console.warn('[live-tokens] <Card> has no icon or title. Use variant="bare" to declare a headerless card.');
    }
  });
</script>

<div
  class="card {className}"
  class:bare={variant === 'bare'}
  class:compact={size === 'compact'}
  style:--card-color={iconColor}
  style:--card-hover-border-enabled={hoverBorder}
  style:--card-hover-shadow-enabled={hoverShadow}
>
  {#if showHeader}
    <div class="card-header">
      {#if icon}
        <i class="{icon} card-icon"></i>
      {/if}
      {#if title}
        <span class="card-title">{title}</span>
      {/if}
    </div>
  {/if}
  <div class="card-body" class:prose class:flush>
    {@render children?.()}
  </div>
</div>

<style lang="scss">
  @use '../styles/padding' as *;
  @use '../styles/slot-prose' as *;

  :global(:root) {
    --card-default-surface: color-mix(in srgb, var(--surface-neutral-lower) 70%, transparent);
    --card-default-border: var(--border-neutral);
    --card-default-border-width: var(--border-width-1);
    --card-default-radius: var(--radius-lg);
    /* Every side tracks its base. A declared side always beats the fallback
       themed-padding emits, so naming a literal step here left the base token
       inert: merging split padding back to one value cleared the side aliases
       and the card kept the old geometry. The asymmetry is a themed choice now,
       carried by per-side aliases that override these outright. */
    --card-default-header-padding: var(--space-16);
    --card-default-header-padding-top: var(--card-default-header-padding);
    --card-default-header-padding-right: var(--card-default-header-padding);
    --card-default-header-padding-bottom: var(--card-default-header-padding);
    --card-default-header-padding-left: var(--card-default-header-padding);
    --card-default-header-gap: var(--space-8);
    --card-default-body-padding: var(--space-16);
    --card-default-body-padding-top: var(--card-default-body-padding);
    --card-default-body-padding-right: var(--card-default-body-padding);
    --card-default-body-padding-bottom: var(--card-default-body-padding);
    --card-default-body-padding-left: var(--card-default-body-padding);
    --card-default-shadow: var(--shadow-sm);
    --card-default-blur: var(--blur-none);
    --card-default-header-surface: color-mix(in srgb, var(--surface-neutral-lowest) 80%, transparent);

    --card-default-title: var(--text-primary);
    --card-default-title-font-family: var(--font-sans);
    --card-default-title-font-size: var(--font-size-2xl);
    --card-default-title-font-weight: var(--font-weight-medium);
    --card-default-title-line-height: var(--line-height-normal);

    --card-default-icon-size: var(--icon-size-2xl);

    --card-default-body: var(--text-secondary);
    --card-default-body-font-family: var(--font-sans);
    --card-default-body-font-size: var(--font-size-xl);
    --card-default-body-font-weight: var(--font-weight-normal);
    --card-default-body-line-height: var(--line-height-normal);

    --card-hover-border: var(--border-neutral-strong);
    --card-hover-shadow: var(--shadow-md);

    /* Global "Use hover" intrinsic: the active hover values default to the resting
       tokens (hover off). The editor checkbox / a per-instance `hover` prop swap
       these to the `--card-hover-*` tokens to turn hover on. */
    --card-hover-border-enabled: var(--card-default-border);
    --card-hover-shadow-enabled: var(--card-default-shadow);
  }

  .card {
    background: var(--card-default-surface);
    border: var(--card-default-border-width) solid var(--card-default-border);
    border-radius: var(--card-default-radius);
    box-shadow: var(--card-default-shadow);
    backdrop-filter: blur(var(--card-default-blur));
    transition: border-color var(--duration-150), box-shadow var(--duration-150);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .card:hover {
    border-color: var(--card-hover-border-enabled);
    box-shadow: var(--card-hover-shadow-enabled);
  }

  /* Editor preview hook: paint hover tokens directly, ignoring the on/off gate. */
  .card.force-hover {
    border-color: var(--card-hover-border);
    box-shadow: var(--card-hover-shadow);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--card-default-header-gap);
    @include themed-padding(--card-default-header-padding);
    background: var(--card-default-header-surface);
  }

  .card.compact .card-header,
  .card.compact .card-body {
    padding: var(--space-8) var(--space-12);
  }

  .card-icon {
    font-size: var(--card-default-icon-size);
    color: var(--card-color, var(--card-default-title));
  }

  .card.compact .card-icon {
    font-size: var(--icon-size-md);
  }

  .card-title {
    color: var(--card-default-title);
    font-family: var(--card-default-title-font-family);
    font-size: var(--card-default-title-font-size);
    font-weight: var(--card-default-title-font-weight);
    line-height: var(--card-default-title-line-height);
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .card.compact .card-title {
    font-size: var(--font-size-md);
  }

  .card-body {
    color: var(--card-default-body);
    font-family: var(--card-default-body-font-family);
    font-size: var(--card-default-body-font-size);
    font-weight: var(--card-default-body-font-weight);
    line-height: var(--card-default-body-line-height);
    @include themed-padding(--card-default-body-padding);

    @include slot-prose;
  }

  .card.compact .card-body {
    font-size: var(--font-size-sm);
  }

  /* Last, and at the same weight as the compact override, so a flush card is
     flush at either size. Full-bleed media has to reach the border the card
     already clips it against. */
  .card-body.flush {
    padding: var(--space-0);
  }
</style>
