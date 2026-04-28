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
    --progressbar-primary-track-surface: var(--surface-neutral-low);
    --progressbar-primary-track-border: var(--border-neutral-faint);
    --progressbar-primary-label: var(--text-secondary);
    --progressbar-primary-value: var(--text-tertiary);
    --progressbar-primary-radius: var(--radius-full);
    --progressbar-primary-fill: var(--gradient-1);

    /* Success */
    --progressbar-success-track-surface: var(--surface-neutral-low);
    --progressbar-success-track-border: var(--border-neutral-faint);
    --progressbar-success-label: var(--text-secondary);
    --progressbar-success-value: var(--text-tertiary);
    --progressbar-success-radius: var(--radius-full);
    --progressbar-success-fill: var(--border-success);

    /* Warning */
    --progressbar-warning-track-surface: var(--surface-neutral-low);
    --progressbar-warning-track-border: var(--border-neutral-faint);
    --progressbar-warning-label: var(--text-secondary);
    --progressbar-warning-value: var(--text-tertiary);
    --progressbar-warning-radius: var(--radius-full);
    --progressbar-warning-fill: var(--border-warning);

    /* Danger */
    --progressbar-danger-track-surface: var(--surface-neutral-low);
    --progressbar-danger-track-border: var(--border-neutral-faint);
    --progressbar-danger-label: var(--text-secondary);
    --progressbar-danger-value: var(--text-tertiary);
    --progressbar-danger-radius: var(--radius-full);
    --progressbar-danger-fill: var(--border-danger);

    /* Info */
    --progressbar-info-track-surface: var(--surface-neutral-low);
    --progressbar-info-track-border: var(--border-neutral-faint);
    --progressbar-info-label: var(--text-secondary);
    --progressbar-info-value: var(--text-tertiary);
    --progressbar-info-radius: var(--radius-full);
    --progressbar-info-fill: var(--border-info);
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
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-light);
  }

  .progress-value {
    font-size: var(--font-size-xs);
    font-family: var(--font-mono);
  }

  .progress-track {
    width: 100%;
    height: var(--space-8);
    overflow: hidden;
    border-style: solid;
    border-width: var(--border-width-thin);
  }

  .compact .progress-track {
    height: var(--space-4);
  }

  .progress-fill {
    height: 100%;
    transition: width 0.4s ease;
  }

  /* Primary */
  .progress.primary .progress-label { color: var(--progressbar-primary-label); }
  .progress.primary .progress-value { color: var(--progressbar-primary-value); }
  .progress.primary .progress-track {
    background: var(--progressbar-primary-track-surface);
    border-color: var(--progressbar-primary-track-border);
    border-radius: var(--progressbar-primary-radius);
  }
  .progress-fill.primary {
    background: var(--progressbar-primary-fill);
    border-radius: var(--progressbar-primary-radius);
  }

  /* Success */
  .progress.success .progress-label { color: var(--progressbar-success-label); }
  .progress.success .progress-value { color: var(--progressbar-success-value); }
  .progress.success .progress-track {
    background: var(--progressbar-success-track-surface);
    border-color: var(--progressbar-success-track-border);
    border-radius: var(--progressbar-success-radius);
  }
  .progress-fill.success {
    background: var(--progressbar-success-fill);
    border-radius: var(--progressbar-success-radius);
  }

  /* Warning */
  .progress.warning .progress-label { color: var(--progressbar-warning-label); }
  .progress.warning .progress-value { color: var(--progressbar-warning-value); }
  .progress.warning .progress-track {
    background: var(--progressbar-warning-track-surface);
    border-color: var(--progressbar-warning-track-border);
    border-radius: var(--progressbar-warning-radius);
  }
  .progress-fill.warning {
    background: var(--progressbar-warning-fill);
    border-radius: var(--progressbar-warning-radius);
  }

  /* Danger */
  .progress.danger .progress-label { color: var(--progressbar-danger-label); }
  .progress.danger .progress-value { color: var(--progressbar-danger-value); }
  .progress.danger .progress-track {
    background: var(--progressbar-danger-track-surface);
    border-color: var(--progressbar-danger-track-border);
    border-radius: var(--progressbar-danger-radius);
  }
  .progress-fill.danger {
    background: var(--progressbar-danger-fill);
    border-radius: var(--progressbar-danger-radius);
  }

  /* Info */
  .progress.info .progress-label { color: var(--progressbar-info-label); }
  .progress.info .progress-value { color: var(--progressbar-info-value); }
  .progress.info .progress-track {
    background: var(--progressbar-info-track-surface);
    border-color: var(--progressbar-info-track-border);
    border-radius: var(--progressbar-info-radius);
  }
  .progress-fill.info {
    background: var(--progressbar-info-fill);
    border-radius: var(--progressbar-info-radius);
  }

  .progress-icon {
    color: var(--text-success);
    font-size: var(--font-size-md);
    text-align: right;
  }
</style>
