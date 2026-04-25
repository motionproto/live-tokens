<script lang="ts">
  export let label: string;
  export let value: string;
  export let dirty: boolean = false;
  export let applied: boolean = false;
  export let title: string = '';

  $: stateLabel = dirty ? 'unsaved' : applied ? 'applied' : '';
</script>

<div class="config-field">
  <span class="config-label">{label}</span>
  <span class="config-box" class:dirty class:applied {title}>
    <span class="config-name">{value}</span>
  </span>
  <span class="config-state" class:dirty class:applied>{stateLabel || ' '}</span>
</div>

<style>
  .config-field {
    display: inline-grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto;
    column-gap: var(--ui-space-8);
    row-gap: var(--ui-space-4);
    align-items: center;
  }

  .config-label {
    grid-column: 1;
    grid-row: 1;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    letter-spacing: 0.02em;
    line-height: 1.15;
    text-align: right;
  }

  .config-box {
    grid-column: 2;
    grid-row: 1;
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    padding: var(--ui-space-6) var(--ui-space-10);
    width: 11rem;
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
  }

  .config-name {
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .config-state {
    grid-column: 2;
    grid-row: 2;
    font-size: var(--ui-font-size-xs);
    letter-spacing: 0.02em;
    color: var(--ui-text-muted);
    line-height: 1;
    text-align: right;
    padding-right: var(--ui-space-2);
  }

  .config-state.dirty {
    color: var(--ui-text-warning, #e6a030);
  }

  .config-state.applied {
    color: var(--ui-text-applied, #5aa85e);
  }
</style>
