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
    --card-default-border: var(--border-neutral-default);
    --card-default-title: var(--text-primary);
    --card-default-body: var(--text-secondary);
    --card-default-radius: var(--radius-lg);

    /* Hover */
    --card-hover-surface: var(--surface-neutral-high);
    --card-hover-border: var(--border-neutral-strong);
    --card-hover-title: var(--text-primary);
    --card-hover-body: var(--text-secondary);
    --card-hover-radius: var(--radius-lg);
  }

  .card {
    background: var(--card-default-surface);
    border: 1px solid var(--card-default-border);
    border-radius: var(--card-default-radius);
    padding: var(--space-16);
    transition: all var(--transition-fast);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }

  .card:hover,
  .card.force-hover {
    background: var(--card-hover-surface);
    border-color: var(--card-color, var(--card-hover-border));
    border-radius: var(--card-hover-radius);
    box-shadow: var(--shadow-md);
  }

  .card.compact {
    padding: var(--space-8) var(--space-12);
    gap: var(--space-8);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-8);
  }

  .card-icon {
    font-size: var(--font-lg);
    color: var(--card-color, var(--text-secondary));
  }

  .card.compact .card-icon {
    font-size: var(--font-md);
  }

  .card-title {
    font-size: var(--font-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--card-default-title);
  }

  .card:hover .card-title,
  .card.force-hover .card-title {
    color: var(--card-hover-title);
  }

  .card.compact .card-title {
    font-size: var(--font-md);
  }

  .card-body {
    color: var(--card-default-body);
    font-size: var(--font-md);
  }

  .card:hover .card-body,
  .card.force-hover .card-body {
    color: var(--card-hover-body);
  }

  .card.compact .card-body {
    font-size: var(--font-sm);
  }
</style>
