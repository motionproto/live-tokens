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
    --progressbar-primary-track-border-width: var(--border-width-thin);
    --progressbar-primary-track-height: var(--space-8);
    --progressbar-primary-radius: var(--radius-full);
    --progressbar-primary-fill: var(--gradient-1);
    --progressbar-primary-label: var(--text-secondary);
    --progressbar-primary-label-font-family: var(--font-sans);
    --progressbar-primary-label-font-size: var(--font-size-sm);
    --progressbar-primary-label-font-weight: var(--font-weight-light);
    --progressbar-primary-label-line-height: var(--line-height-normal);
    --progressbar-primary-value: var(--text-tertiary);
    --progressbar-primary-value-font-family: var(--font-mono);
    --progressbar-primary-value-font-size: var(--font-size-xs);
    --progressbar-primary-value-font-weight: var(--font-weight-light);
    --progressbar-primary-value-line-height: var(--line-height-normal);

    /* Success */
    --progressbar-success-track-surface: var(--surface-neutral-low);
    --progressbar-success-track-border: var(--border-neutral-faint);
    --progressbar-success-track-border-width: var(--border-width-thin);
    --progressbar-success-track-height: var(--space-8);
    --progressbar-success-radius: var(--radius-full);
    --progressbar-success-fill: var(--border-success);
    --progressbar-success-label: var(--text-secondary);
    --progressbar-success-label-font-family: var(--font-sans);
    --progressbar-success-label-font-size: var(--font-size-sm);
    --progressbar-success-label-font-weight: var(--font-weight-light);
    --progressbar-success-label-line-height: var(--line-height-normal);
    --progressbar-success-value: var(--text-tertiary);
    --progressbar-success-value-font-family: var(--font-mono);
    --progressbar-success-value-font-size: var(--font-size-xs);
    --progressbar-success-value-font-weight: var(--font-weight-light);
    --progressbar-success-value-line-height: var(--line-height-normal);

    /* Warning */
    --progressbar-warning-track-surface: var(--surface-neutral-low);
    --progressbar-warning-track-border: var(--border-neutral-faint);
    --progressbar-warning-track-border-width: var(--border-width-thin);
    --progressbar-warning-track-height: var(--space-8);
    --progressbar-warning-radius: var(--radius-full);
    --progressbar-warning-fill: var(--border-warning);
    --progressbar-warning-label: var(--text-secondary);
    --progressbar-warning-label-font-family: var(--font-sans);
    --progressbar-warning-label-font-size: var(--font-size-sm);
    --progressbar-warning-label-font-weight: var(--font-weight-light);
    --progressbar-warning-label-line-height: var(--line-height-normal);
    --progressbar-warning-value: var(--text-tertiary);
    --progressbar-warning-value-font-family: var(--font-mono);
    --progressbar-warning-value-font-size: var(--font-size-xs);
    --progressbar-warning-value-font-weight: var(--font-weight-light);
    --progressbar-warning-value-line-height: var(--line-height-normal);

    /* Danger */
    --progressbar-danger-track-surface: var(--surface-neutral-low);
    --progressbar-danger-track-border: var(--border-neutral-faint);
    --progressbar-danger-track-border-width: var(--border-width-thin);
    --progressbar-danger-track-height: var(--space-8);
    --progressbar-danger-radius: var(--radius-full);
    --progressbar-danger-fill: var(--border-danger);
    --progressbar-danger-label: var(--text-secondary);
    --progressbar-danger-label-font-family: var(--font-sans);
    --progressbar-danger-label-font-size: var(--font-size-sm);
    --progressbar-danger-label-font-weight: var(--font-weight-light);
    --progressbar-danger-label-line-height: var(--line-height-normal);
    --progressbar-danger-value: var(--text-tertiary);
    --progressbar-danger-value-font-family: var(--font-mono);
    --progressbar-danger-value-font-size: var(--font-size-xs);
    --progressbar-danger-value-font-weight: var(--font-weight-light);
    --progressbar-danger-value-line-height: var(--line-height-normal);

    /* Info */
    --progressbar-info-track-surface: var(--surface-neutral-low);
    --progressbar-info-track-border: var(--border-neutral-faint);
    --progressbar-info-track-border-width: var(--border-width-thin);
    --progressbar-info-track-height: var(--space-8);
    --progressbar-info-radius: var(--radius-full);
    --progressbar-info-fill: var(--border-info);
    --progressbar-info-label: var(--text-secondary);
    --progressbar-info-label-font-family: var(--font-sans);
    --progressbar-info-label-font-size: var(--font-size-sm);
    --progressbar-info-label-font-weight: var(--font-weight-light);
    --progressbar-info-label-line-height: var(--line-height-normal);
    --progressbar-info-value: var(--text-tertiary);
    --progressbar-info-value-font-family: var(--font-mono);
    --progressbar-info-value-font-size: var(--font-size-xs);
    --progressbar-info-value-font-weight: var(--font-weight-light);
    --progressbar-info-value-line-height: var(--line-height-normal);
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
  }

  .progress-track {
    width: 100%;
    overflow: hidden;
    border-style: solid;
  }

  .compact .progress-track {
    height: calc(var(--progress-track-height, var(--space-4)) * 0.5);
  }

  .progress-fill {
    height: 100%;
    transition: width 0.4s ease;
  }

  /* Primary */
  .progress.primary .progress-label > span {
    color: var(--progressbar-primary-label);
    font-family: var(--progressbar-primary-label-font-family);
    font-size: var(--progressbar-primary-label-font-size);
    font-weight: var(--progressbar-primary-label-font-weight);
    line-height: var(--progressbar-primary-label-line-height);
  }
  .progress.primary .progress-value {
    color: var(--progressbar-primary-value);
    font-family: var(--progressbar-primary-value-font-family);
    font-size: var(--progressbar-primary-value-font-size);
    font-weight: var(--progressbar-primary-value-font-weight);
    line-height: var(--progressbar-primary-value-line-height);
  }
  .progress.primary .progress-track {
    background: var(--progressbar-primary-track-surface);
    border-color: var(--progressbar-primary-track-border);
    border-width: var(--progressbar-primary-track-border-width);
    border-radius: var(--progressbar-primary-radius);
    height: var(--progressbar-primary-track-height);
  }
  .progress-fill.primary {
    background: var(--progressbar-primary-fill);
    border-radius: var(--progressbar-primary-radius);
  }

  /* Success */
  .progress.success .progress-label > span {
    color: var(--progressbar-success-label);
    font-family: var(--progressbar-success-label-font-family);
    font-size: var(--progressbar-success-label-font-size);
    font-weight: var(--progressbar-success-label-font-weight);
    line-height: var(--progressbar-success-label-line-height);
  }
  .progress.success .progress-value {
    color: var(--progressbar-success-value);
    font-family: var(--progressbar-success-value-font-family);
    font-size: var(--progressbar-success-value-font-size);
    font-weight: var(--progressbar-success-value-font-weight);
    line-height: var(--progressbar-success-value-line-height);
  }
  .progress.success .progress-track {
    background: var(--progressbar-success-track-surface);
    border-color: var(--progressbar-success-track-border);
    border-width: var(--progressbar-success-track-border-width);
    border-radius: var(--progressbar-success-radius);
    height: var(--progressbar-success-track-height);
  }
  .progress-fill.success {
    background: var(--progressbar-success-fill);
    border-radius: var(--progressbar-success-radius);
  }

  /* Warning */
  .progress.warning .progress-label > span {
    color: var(--progressbar-warning-label);
    font-family: var(--progressbar-warning-label-font-family);
    font-size: var(--progressbar-warning-label-font-size);
    font-weight: var(--progressbar-warning-label-font-weight);
    line-height: var(--progressbar-warning-label-line-height);
  }
  .progress.warning .progress-value {
    color: var(--progressbar-warning-value);
    font-family: var(--progressbar-warning-value-font-family);
    font-size: var(--progressbar-warning-value-font-size);
    font-weight: var(--progressbar-warning-value-font-weight);
    line-height: var(--progressbar-warning-value-line-height);
  }
  .progress.warning .progress-track {
    background: var(--progressbar-warning-track-surface);
    border-color: var(--progressbar-warning-track-border);
    border-width: var(--progressbar-warning-track-border-width);
    border-radius: var(--progressbar-warning-radius);
    height: var(--progressbar-warning-track-height);
  }
  .progress-fill.warning {
    background: var(--progressbar-warning-fill);
    border-radius: var(--progressbar-warning-radius);
  }

  /* Danger */
  .progress.danger .progress-label > span {
    color: var(--progressbar-danger-label);
    font-family: var(--progressbar-danger-label-font-family);
    font-size: var(--progressbar-danger-label-font-size);
    font-weight: var(--progressbar-danger-label-font-weight);
    line-height: var(--progressbar-danger-label-line-height);
  }
  .progress.danger .progress-value {
    color: var(--progressbar-danger-value);
    font-family: var(--progressbar-danger-value-font-family);
    font-size: var(--progressbar-danger-value-font-size);
    font-weight: var(--progressbar-danger-value-font-weight);
    line-height: var(--progressbar-danger-value-line-height);
  }
  .progress.danger .progress-track {
    background: var(--progressbar-danger-track-surface);
    border-color: var(--progressbar-danger-track-border);
    border-width: var(--progressbar-danger-track-border-width);
    border-radius: var(--progressbar-danger-radius);
    height: var(--progressbar-danger-track-height);
  }
  .progress-fill.danger {
    background: var(--progressbar-danger-fill);
    border-radius: var(--progressbar-danger-radius);
  }

  /* Info */
  .progress.info .progress-label > span {
    color: var(--progressbar-info-label);
    font-family: var(--progressbar-info-label-font-family);
    font-size: var(--progressbar-info-label-font-size);
    font-weight: var(--progressbar-info-label-font-weight);
    line-height: var(--progressbar-info-label-line-height);
  }
  .progress.info .progress-value {
    color: var(--progressbar-info-value);
    font-family: var(--progressbar-info-value-font-family);
    font-size: var(--progressbar-info-value-font-size);
    font-weight: var(--progressbar-info-value-font-weight);
    line-height: var(--progressbar-info-value-line-height);
  }
  .progress.info .progress-track {
    background: var(--progressbar-info-track-surface);
    border-color: var(--progressbar-info-track-border);
    border-width: var(--progressbar-info-track-border-width);
    border-radius: var(--progressbar-info-radius);
    height: var(--progressbar-info-track-height);
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
