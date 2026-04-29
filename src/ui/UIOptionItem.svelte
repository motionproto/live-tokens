<script lang="ts">
  export let active: boolean = false;
</script>

<button class="ui-option-item" class:active on:click>
  {#if $$slots.preview}
    <span class="ui-option-preview">
      <slot name="preview" />
    </span>
  {/if}
  <span class="ui-option-label">
    <slot name="label" />
  </span>
  {#if $$slots.meta}
    <code class="ui-option-meta">
      <slot name="meta" />
    </code>
  {/if}
</button>

<style>
  .ui-option-item {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-8);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .ui-option-item:hover {
    background: var(--ui-hover);
  }

  .ui-option-item.active {
    background: var(--ui-hover-high);
    border-color: var(--ui-text-accent);
    box-shadow: inset 3px 0 0 var(--ui-text-accent);
  }

  .ui-option-item.active .ui-option-label {
    color: var(--ui-text-accent);
    font-weight: var(--ui-font-weight-semibold);
  }

  .ui-option-item.active .ui-option-meta {
    color: var(--ui-text-primary);
  }

  .ui-option-preview {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .ui-option-label {
    flex: 1;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
    text-align: left;
  }

  .ui-option-meta {
    flex-shrink: 0;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    white-space: nowrap;
  }
</style>
