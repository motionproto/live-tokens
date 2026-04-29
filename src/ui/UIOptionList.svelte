<script lang="ts">
  /** When set, the list becomes a CSS grid using these columns; rows are
   *  expected to use `display: grid; grid-template-columns: subgrid` so cells
   *  align across rows. */
  export let gridColumns: string = '';
</script>

<div
  class="ui-option-list"
  class:grid={!!gridColumns}
  style:grid-template-columns={gridColumns || null}
>
  <slot />
</div>

<style>
  .ui-option-list {
    display: flex;
    flex-direction: column;
    padding: var(--ui-space-4);
  }

  .ui-option-list.grid {
    display: grid;
    column-gap: var(--ui-space-12);
  }
</style>
