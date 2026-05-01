<script lang="ts">
  export let icon: string = '';
  export let iconColor: string = 'var(--text-secondary)';
  export let title: string = '';
  export let size: 'default' | 'compact' = 'default';
  let className: string = '';
  export { className as class };
</script>

<div
  class="card {className}"
  class:compact={size === 'compact'}
  style="--card-color: {iconColor};"
>
  {#if icon || title}
    <div class="card-header">
      {#if icon}
        <i class="{icon} card-icon"></i>
      {/if}
      {#if title}
        <span class="card-title">{title}</span>
      {/if}
    </div>
  {/if}
  <div class="card-body">
    <slot />
  </div>
</div>

<style>
  :global(:root) {
    /* Default */
    --card-default-surface: var(--surface-neutral-high);
    --card-default-border: var(--border-neutral);
    --card-default-border-width: var(--border-width-thin);
    --card-default-radius: var(--radius-lg);
    --card-default-header-padding: var(--space-16);
    --card-default-body-padding: var(--space-16);
    --card-default-shadow: var(--shadow-sm);
    --card-default-blur: var(--blur-none);
    --card-default-header-surface: transparent;

    --card-default-title: var(--text-primary);
    --card-default-title-font-family: var(--font-sans);
    --card-default-title-font-size: var(--font-size-lg);
    --card-default-title-font-weight: var(--font-weight-normal);
    --card-default-title-line-height: var(--line-height-snug);

    --card-default-body: var(--text-secondary);
    --card-default-body-font-family: var(--font-sans);
    --card-default-body-font-size: var(--font-size-md);
    --card-default-body-font-weight: var(--font-weight-normal);
    --card-default-body-line-height: var(--line-height-normal);

    /* Hover */
    --card-hover-surface: var(--surface-neutral-high);
    --card-hover-border: var(--border-neutral-strong);
    --card-hover-border-width: var(--border-width-thin);
    --card-hover-radius: var(--radius-lg);
    --card-hover-header-padding: var(--space-16);
    --card-hover-body-padding: var(--space-16);
    --card-hover-shadow: var(--shadow-md);
    --card-hover-blur: var(--blur-none);
    --card-hover-header-surface: transparent;

    --card-hover-title: var(--text-primary);
    --card-hover-title-font-family: var(--font-sans);
    --card-hover-title-font-size: var(--font-size-lg);
    --card-hover-title-font-weight: var(--font-weight-normal);
    --card-hover-title-line-height: var(--line-height-snug);

    --card-hover-body: var(--text-secondary);
    --card-hover-body-font-family: var(--font-sans);
    --card-hover-body-font-size: var(--font-size-md);
    --card-hover-body-font-weight: var(--font-weight-normal);
    --card-hover-body-line-height: var(--line-height-normal);
  }

  .card {
    background: var(--card-default-surface);
    border: var(--card-default-border-width) solid var(--card-default-border);
    border-radius: var(--card-default-radius);
    box-shadow: var(--card-default-shadow);
    backdrop-filter: blur(var(--card-default-blur));
    transition: all var(--transition-fast);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .card:not(.no-hover):hover,
  .card.force-hover {
    background: var(--card-hover-surface);
    border: var(--card-hover-border-width) solid var(--card-color, var(--card-hover-border));
    border-radius: var(--card-hover-radius);
    box-shadow: var(--card-hover-shadow);
    backdrop-filter: blur(var(--card-hover-blur));
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--card-default-header-padding);
    background: var(--card-default-header-surface);
  }

  .card:not(.no-hover):hover .card-header,
  .card.force-hover .card-header {
    padding: var(--card-hover-header-padding);
    background: var(--card-hover-header-surface);
  }

  .card.compact .card-header,
  .card.compact .card-body {
    padding: var(--space-8) var(--space-12);
  }

  .card-icon {
    font-size: var(--font-size-lg);
    color: var(--card-color, var(--card-default-title));
  }

  .card:not(.no-hover):hover .card-icon,
  .card.force-hover .card-icon {
    color: var(--card-color, var(--card-hover-title));
  }

  .card.compact .card-icon {
    font-size: var(--font-size-md);
  }

  .card-title {
    color: var(--card-default-title);
    font-family: var(--card-default-title-font-family);
    font-size: var(--card-default-title-font-size);
    font-weight: var(--card-default-title-font-weight);
    line-height: var(--card-default-title-line-height);
  }

  .card:not(.no-hover):hover .card-title,
  .card.force-hover .card-title {
    color: var(--card-hover-title);
    font-family: var(--card-hover-title-font-family);
    font-size: var(--card-hover-title-font-size);
    font-weight: var(--card-hover-title-font-weight);
    line-height: var(--card-hover-title-line-height);
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
    padding: var(--card-default-body-padding);
  }

  .card:not(.no-hover):hover .card-body,
  .card.force-hover .card-body {
    color: var(--card-hover-body);
    font-family: var(--card-hover-body-font-family);
    font-size: var(--card-hover-body-font-size);
    font-weight: var(--card-hover-body-font-weight);
    line-height: var(--card-hover-body-line-height);
    padding: var(--card-hover-body-padding);
  }

  .card.compact .card-body {
    font-size: var(--font-size-sm);
  }
</style>
