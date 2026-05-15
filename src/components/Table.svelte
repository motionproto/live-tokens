<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="table-wrapper">
  {@render children?.()}
</div>

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    /* Wrapper */
    --table-default-radius: var(--radius-md);
    --table-default-border: var(--border-canvas-subtle);
    --table-default-border-width: var(--border-width-1);
    --table-default-shadow: var(--shadow-md);

    /* Header */
    --table-default-header-surface: var(--surface-canvas-low);
    --table-default-header-text: var(--text-primary);
    --table-default-header-font-family: var(--font-sans);
    --table-default-header-font-size: var(--font-size-sm);
    --table-default-header-font-weight: var(--font-weight-normal);
    --table-default-header-line-height: var(--line-height-xs);
    --table-default-header-padding: var(--space-12);
    --table-default-header-border: var(--border-canvas-subtle);
    --table-default-header-border-width: var(--border-width-1);

    /* Cell */
    --table-default-cell-text: var(--text-secondary);
    --table-default-cell-font-family: var(--font-sans);
    --table-default-cell-font-size: var(--font-size-sm);
    --table-default-cell-font-weight: var(--font-weight-normal);
    --table-default-cell-line-height: var(--line-height-md);
    --table-default-cell-padding: var(--space-8);

    /* Row */
    --table-default-row-divider: var(--border-canvas-faint);
    --table-default-row-divider-width: var(--border-width-1);
    --table-default-row-stripe-surface: var(--surface-canvas-lower);

    /* Column */
    --table-default-column-divider: var(--border-canvas-faint);
    --table-default-column-divider-width: var(--border-width-0);
  }

  .table-wrapper {
    overflow-x: auto;
    margin: var(--space-12) 0;
    -webkit-overflow-scrolling: touch;
    border: var(--table-default-border-width) solid var(--table-default-border);
    border-radius: var(--table-default-radius);
    box-shadow: var(--table-default-shadow);
  }

  .table-wrapper :global(table) {
    width: 100%;
    border-collapse: collapse;
    min-width: 400px;
    margin: 0;
  }

  .table-wrapper :global(th) {
    background: var(--table-default-header-surface);
    color: var(--table-default-header-text);
    font-family: var(--table-default-header-font-family);
    font-size: var(--table-default-header-font-size);
    font-weight: var(--table-default-header-font-weight);
    line-height: var(--table-default-header-line-height);
    @include themed-padding(--table-default-header-padding);
    text-align: left;
    border-bottom: var(--table-default-header-border-width) solid var(--table-default-header-border);
    border-right: var(--table-default-column-divider-width) solid var(--table-default-column-divider);
    white-space: nowrap;
  }

  .table-wrapper :global(td) {
    color: var(--table-default-cell-text);
    font-family: var(--table-default-cell-font-family);
    font-size: var(--table-default-cell-font-size);
    font-weight: var(--table-default-cell-font-weight);
    line-height: var(--table-default-cell-line-height);
    padding:
      var(--table-default-cell-padding-top, var(--table-default-cell-padding))
      var(--table-default-cell-padding-right, calc(var(--table-default-cell-padding) * 1.5))
      var(--table-default-cell-padding-bottom, var(--table-default-cell-padding))
      var(--table-default-cell-padding-left, calc(var(--table-default-cell-padding) * 1.5));
    border-bottom: var(--table-default-row-divider-width) solid var(--table-default-row-divider);
    border-right: var(--table-default-column-divider-width) solid var(--table-default-column-divider);
  }

  .table-wrapper :global(th:last-child),
  .table-wrapper :global(td:last-child) {
    border-right: none;
  }

  .table-wrapper :global(tr:nth-child(even) td) {
    background: var(--table-default-row-stripe-surface);
  }

  .table-wrapper :global(tr:last-child td) {
    border-bottom: none;
  }
</style>
