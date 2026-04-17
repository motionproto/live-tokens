<script lang="ts">
  export let value: number = 0;
  export let label: string = '';
  export let variant: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'primary';
  export let size: 'default' | 'compact' = 'default';
  export let showIcon: boolean = true;

  $: clampedValue = Math.min(100, Math.max(0, value));
  $: isComplete = clampedValue >= 100;
</script>

<div class="progress {variant}" class:compact={size === 'compact'}>
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
  :global(:root) {
    /* Primary */
    --progress-primary-track-bg: var(--surface-neutral-low);
    --progress-primary-track-border: var(--border-neutral-faint);
    --progress-primary-label: var(--text-secondary);
    --progress-primary-value: var(--text-tertiary);
    --progress-primary-radius: var(--radius-full);
    --progress-primary-fill: var(--gradient-progress);

    /* Success */
    --progress-success-track-bg: var(--surface-neutral-low);
    --progress-success-track-border: var(--border-neutral-faint);
    --progress-success-label: var(--text-secondary);
    --progress-success-value: var(--text-tertiary);
    --progress-success-radius: var(--radius-full);
    --progress-success-fill: var(--border-success);

    /* Warning */
    --progress-warning-track-bg: var(--surface-neutral-low);
    --progress-warning-track-border: var(--border-neutral-faint);
    --progress-warning-label: var(--text-secondary);
    --progress-warning-value: var(--text-tertiary);
    --progress-warning-radius: var(--radius-full);
    --progress-warning-fill: var(--border-warning);

    /* Danger */
    --progress-danger-track-bg: var(--surface-neutral-low);
    --progress-danger-track-border: var(--border-neutral-faint);
    --progress-danger-label: var(--text-secondary);
    --progress-danger-value: var(--text-tertiary);
    --progress-danger-radius: var(--radius-full);
    --progress-danger-fill: var(--border-danger);

    /* Info */
    --progress-info-track-bg: var(--surface-neutral-low);
    --progress-info-track-border: var(--border-neutral-faint);
    --progress-info-label: var(--text-secondary);
    --progress-info-value: var(--text-tertiary);
    --progress-info-radius: var(--radius-full);
    --progress-info-fill: var(--border-info);
  }

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
    font-weight: var(--font-weight-medium);
  }

  .progress-value {
    font-size: var(--font-xs);
    font-family: 'Courier New', monospace;
  }

  .progress-track {
    width: 100%;
    height: 8px;
    overflow: hidden;
    border-style: solid;
    border-width: 1px;
  }

  .compact .progress-track {
    height: 4px;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.4s ease;
  }

  /* Primary */
  .progress.primary .progress-label { color: var(--progress-primary-label); }
  .progress.primary .progress-value { color: var(--progress-primary-value); }
  .progress.primary .progress-track {
    background: var(--progress-primary-track-bg);
    border-color: var(--progress-primary-track-border);
    border-radius: var(--progress-primary-radius);
  }
  .progress-fill.primary {
    background: var(--progress-primary-fill);
    border-radius: var(--progress-primary-radius);
  }

  /* Success */
  .progress.success .progress-label { color: var(--progress-success-label); }
  .progress.success .progress-value { color: var(--progress-success-value); }
  .progress.success .progress-track {
    background: var(--progress-success-track-bg);
    border-color: var(--progress-success-track-border);
    border-radius: var(--progress-success-radius);
  }
  .progress-fill.success {
    background: var(--progress-success-fill);
    border-radius: var(--progress-success-radius);
  }

  /* Warning */
  .progress.warning .progress-label { color: var(--progress-warning-label); }
  .progress.warning .progress-value { color: var(--progress-warning-value); }
  .progress.warning .progress-track {
    background: var(--progress-warning-track-bg);
    border-color: var(--progress-warning-track-border);
    border-radius: var(--progress-warning-radius);
  }
  .progress-fill.warning {
    background: var(--progress-warning-fill);
    border-radius: var(--progress-warning-radius);
  }

  /* Danger */
  .progress.danger .progress-label { color: var(--progress-danger-label); }
  .progress.danger .progress-value { color: var(--progress-danger-value); }
  .progress.danger .progress-track {
    background: var(--progress-danger-track-bg);
    border-color: var(--progress-danger-track-border);
    border-radius: var(--progress-danger-radius);
  }
  .progress-fill.danger {
    background: var(--progress-danger-fill);
    border-radius: var(--progress-danger-radius);
  }

  /* Info */
  .progress.info .progress-label { color: var(--progress-info-label); }
  .progress.info .progress-value { color: var(--progress-info-value); }
  .progress.info .progress-track {
    background: var(--progress-info-track-bg);
    border-color: var(--progress-info-track-border);
    border-radius: var(--progress-info-radius);
  }
  .progress-fill.info {
    background: var(--progress-info-fill);
    border-radius: var(--progress-info-radius);
  }

  .progress-icon {
    color: var(--text-success);
    font-size: var(--font-md);
    text-align: right;
  }
</style>
