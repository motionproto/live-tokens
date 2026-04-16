<script lang="ts">
  export let icon: string = '';
  export let iconColor: string = 'var(--text-secondary)';
  export let title: string = '';
  export let size: 'default' | 'compact' = 'default';
</script>

<div
  class="card"
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
  .card {
    background: var(--surface-neutral-high);
    border: 1px solid var(--border-neutral-default);
    border-radius: var(--radius-lg);
    padding: var(--space-16);
    transition: all var(--transition-fast);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }

  .card:hover {
    border-color: var(--card-color, var(--border-neutral-strong));
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
    color: var(--text-primary);
  }

  .card.compact .card-title {
    font-size: var(--font-md);
  }

  .card-body {
    color: var(--text-secondary);
    font-size: var(--font-md);
  }

  .card.compact .card-body {
    font-size: var(--font-sm);
  }
</style>
