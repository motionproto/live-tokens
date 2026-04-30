<script lang="ts">
  /** Section that gathers render-time toggles a component accepts as props but
      that aren't theme-driven (e.g. dismissible, hover shimmer, show icons). */
</script>

<section class="config-block">
  <header class="config-header">
    <span class="config-eyebrow">non-stylable configuration</span>
  </header>
  <div class="config-controls">
    <slot />
  </div>
</section>

<style>
  .config-block {
    margin-top: var(--ui-space-12);
    padding: var(--ui-space-12);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-low);
  }

  .config-header {
    margin-bottom: var(--ui-space-8);
  }

  .config-eyebrow {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    text-transform: lowercase;
    letter-spacing: 0.04em;
  }

  .config-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: center;
  }

  .config-controls :global(label) {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
</style>
