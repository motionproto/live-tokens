<!--
  Smoke-test component for registerComponent(). Verifies that a consumer-
  authored component using only public imports (@motion-proto/live-tokens
  and @motion-proto/live-tokens/component-editor) integrates cleanly with
  the editor: nav rail (CUSTOM group), token rows, linked-block, persistence.
  Excluded from the published tarball via package.json `files`.
-->
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'subtle';
    value: string;
    label: string;
  }
  let { variant = 'primary', value, label }: Props = $props();
</script>

<div class="stat stat-{variant}">
  <span class="value">{value}</span>
  <span class="label">{label}</span>
</div>

<style>
  :global(:root) {
    /* primary */
    --stat-primary-surface: var(--surface-primary);
    --stat-primary-border: var(--border-primary);
    --stat-primary-radius: var(--radius-md);
    --stat-primary-padding: var(--space-16);
    --stat-primary-value-text: var(--text-primary);
    --stat-primary-value-font-family: var(--font-display);
    --stat-primary-value-font-size: var(--font-size-2xl);
    --stat-primary-value-font-weight: var(--font-weight-bold);
    --stat-primary-label-text: var(--text-secondary);
    --stat-primary-label-font-family: var(--font-sans);
    --stat-primary-label-font-size: var(--font-size-sm);
    --stat-primary-hover-surface: var(--surface-primary-high);

    /* subtle */
    --stat-subtle-surface: var(--surface-neutral);
    --stat-subtle-border: var(--border-neutral);
    --stat-subtle-radius: var(--radius-md);
    --stat-subtle-padding: var(--space-16);
    --stat-subtle-value-text: var(--text-primary);
    --stat-subtle-value-font-family: var(--font-display);
    --stat-subtle-value-font-size: var(--font-size-2xl);
    --stat-subtle-value-font-weight: var(--font-weight-bold);
    --stat-subtle-label-text: var(--text-tertiary);
    --stat-subtle-label-font-family: var(--font-sans);
    --stat-subtle-label-font-size: var(--font-size-sm);
    --stat-subtle-hover-surface: var(--surface-neutral-high);
  }

  .stat {
    display: inline-flex;
    flex-direction: column;
    gap: var(--space-4);
    border: 1px solid;
    transition: background 120ms ease;
  }

  .stat-primary {
    background: var(--stat-primary-surface);
    border-color: var(--stat-primary-border);
    border-radius: var(--stat-primary-radius);
    padding: var(--stat-primary-padding);
  }
  .stat-primary:hover { background: var(--stat-primary-hover-surface); }
  .stat-primary .value {
    color: var(--stat-primary-value-text);
    font-family: var(--stat-primary-value-font-family);
    font-size: var(--stat-primary-value-font-size);
    font-weight: var(--stat-primary-value-font-weight);
  }
  .stat-primary .label {
    color: var(--stat-primary-label-text);
    font-family: var(--stat-primary-label-font-family);
    font-size: var(--stat-primary-label-font-size);
  }

  .stat-subtle {
    background: var(--stat-subtle-surface);
    border-color: var(--stat-subtle-border);
    border-radius: var(--stat-subtle-radius);
    padding: var(--stat-subtle-padding);
  }
  .stat-subtle:hover { background: var(--stat-subtle-hover-surface); }
  .stat-subtle .value {
    color: var(--stat-subtle-value-text);
    font-family: var(--stat-subtle-value-font-family);
    font-size: var(--stat-subtle-value-font-size);
    font-weight: var(--stat-subtle-value-font-weight);
  }
  .stat-subtle .label {
    color: var(--stat-subtle-label-text);
    font-family: var(--stat-subtle-label-font-family);
    font-size: var(--stat-subtle-label-font-size);
  }
</style>
