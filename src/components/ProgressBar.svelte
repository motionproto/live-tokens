<script lang="ts">
  export let value: number = 0;
  export let label: string = '';
  export let variant: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'primary';
  export let size: 'default' | 'compact' = 'default';
  export let showIcon: boolean = true;

  $: clampedValue = Math.min(100, Math.max(0, value));
  $: isComplete = clampedValue >= 100;
</script>

<div class="progress" class:compact={size === 'compact'}>
  {#if label}
    <div class="progress-label">
      <span>{label}</span>
      <span class="progress-value">{clampedValue}%</span>
    </div>
  {/if}
  <div class="progress-track">
    <div
      class="progress-fill {variant}"
      style="width: {clampedValue}%;"
    ></div>
  </div>
  {#if showIcon && isComplete}
    <div class="progress-icon">
      <i class="fas fa-check-circle"></i>
    </div>
  {/if}
</div>

<style>
  .progress {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    width: 100%;
  }

  .progress-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-sm);
    color: var(--text-secondary);
    font-weight: var(--font-weight-medium);
  }

  .progress-value {
    font-size: var(--font-xs);
    color: var(--text-tertiary);
    font-family: 'Courier New', monospace;
  }

  .progress-track {
    width: 100%;
    height: 8px;
    background: var(--surface-neutral-low);
    border-radius: var(--radius-full);
    overflow: hidden;
    border: 1px solid var(--border-neutral-faint);
  }

  .compact .progress-track {
    height: 4px;
  }

  .progress-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width 0.4s ease;
  }

  .progress-fill.primary {
    background: var(--gradient-progress);
  }

  .progress-fill.success {
    background: var(--border-success);
  }

  .progress-fill.warning {
    background: var(--border-warning);
  }

  .progress-fill.danger {
    background: var(--border-danger);
  }

  .progress-fill.info {
    background: var(--border-info);
  }

  .progress-icon {
    color: var(--text-success);
    font-size: var(--font-md);
    text-align: right;
  }
</style>
